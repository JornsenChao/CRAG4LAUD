// server/proRAG.js
import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { PromptTemplate } from 'langchain/prompts';
import { RetrievalQAChain } from 'langchain/chains';
import { Document } from 'langchain/document';

// 用于获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 这里存放 “fileKey -> vectorStore” 映射，以及 “fileKey -> 列映射配置”
export const proRAGStores = {
  columnMap: {}, // { [fileKey]: { dependencyCol, strategyCol, referenceCol } }
  vectorStoreMap: {}, // { [fileKey]: MemoryVectorStore实例 }
};

/**
 * 将上传的 CSV/XLSX 解析成JS对象数组
 */
function parseTable(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  let records = [];

  if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    records = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  } else {
    throw new Error(`Unsupported file type: ${ext}`);
  }

  return records;
}

/**
 * 供外部调用：把表格解析->构建 MemoryVectorStore
 * @param {string} filePath  后端已保存的临时文件路径
 * @param {string} fileKey   作为索引的唯一标识
 * @param {object} columnMap { dependencyCol, strategyCol, referenceCol }
 */
export async function buildProRAGStore(filePath, fileKey, columnMap) {
  const records = parseTable(filePath);

  // 将每行记录变成 Document
  //  - pageContent = strategy列内容
  //  - metadata 里存 dependency / reference
  const docs = records.map((row) => {
    const strategyText = row[columnMap.strategyCol] || '';
    const dependencyVal = row[columnMap.dependencyCol] || '';
    const referenceVal = row[columnMap.referenceCol] || '';

    return new Document({
      pageContent: strategyText,
      metadata: {
        dependency: dependencyVal,
        reference: referenceVal,
      },
    });
  });

  // 构建向量索引
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
  const memoryStore = await MemoryVectorStore.fromDocuments(docs, embeddings);

  // 存到内存对象
  proRAGStores.vectorStoreMap[fileKey] = memoryStore;
  proRAGStores.columnMap[fileKey] = columnMap;
  console.log(
    `[ProRAG] store built for fileKey=${fileKey}, docCount=${docs.length}`
  );
}

/**
 * 供外部调用：在构建好 store 后，用 dependency 做查询 + LLM回答
 * @param {string} queryDependency
 * @param {string} fileKey
 * @param {string} language  'en' | 'zh' etc.
 * @returns {string} answer
 */
export async function proRAGQuery(
  dependencyData,
  userQuery,
  fileKey,
  language = 'en'
) {
  const store = proRAGStores.vectorStoreMap[fileKey];

  // 将 dependencyData 转换为文本
  const dependencyText = `
User Dependencies:
${Object.entries(dependencyData)
  .map(
    ([key, value]) =>
      `  - ${key}: ${Array.isArray(value) ? value.join(', ') : value}`
  )
  .join('\n')}
`;

  const combinedQuery = `
${dependencyText}

User Query:
${userQuery}
`;

  const docs = await store.similaritySearch(combinedQuery, 5);

  const context = docs
    .map(
      (d, idx) => `
      Strategy #${idx + 1}:
      ${d.pageContent}
      Reference: ${d.metadata.reference}
      DependencyTag: ${d.metadata.dependency}
      `
    )
    .join('\n');

  let langPrompt = '';
  if (language === 'en') {
    langPrompt = 'You are a multilingual assistant. Please answer in English.';
  } else if (language === 'zh') {
    langPrompt = 'You are a multilingual assistant. Please answer in Chinese.';
  } else {
    langPrompt = `You are a multilingual assistant. Please answer in ${language}.`;
  }

  const template = `
  You are a consultant with specialized knowledge in landscape architecture, architecture, urban planning, engineering and design.
    ${langPrompt}
    The user has described these dependencies, which is related to the project context:
    "${dependencyText}"

    They also asked this question that they want you to solve:
    "${userQuery}"

    We found these relevant strategies:
    ${context}


    Please provide a concise and also comprehensive answer referencing the strategies above if needed. 
    Please pay attention to specific numbers the users mentioned in their question. For example: " Provide me 10 strategies", then you should provide 10 strategies; if there are less then the number mentioned in the question, then you should provide all the strategies; if there's no number mentioned in the question, then you should provide all the strategies.
    If there's not enough info, say "No more info available."
`;

  // 构造 RetrievalQAChain
  const model = new ChatOpenAI({
    modelName: 'gpt-3.5-turbo',
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
  const chain = RetrievalQAChain.fromLLM(model, store.asRetriever(), {
    prompt: PromptTemplate.fromTemplate(template),
  });

  // 调用 chain
  const response = await chain.call({ query: combinedQuery });
  const answer = response.text;

  // 关键：把最终注入到 Prompt 的完整字符串拼起来
  const usedPrompt = template
    .replace('{dependencyText}', dependencyText)
    .replace('{userQuery}', userQuery)
    .replace('{context}', context);

  // 把 answer 和 usedPrompt 一起返回
  return { answer, usedPrompt };
}
