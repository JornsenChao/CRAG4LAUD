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
export async function proRAGQuery(queryDependency, fileKey, language = 'en') {
  const store = proRAGStores.vectorStoreMap[fileKey];
  if (!store) {
    throw new Error(`No vector store found for fileKey=${fileKey}.`);
  }

  // 1) 先做相似度检索
  const docs = await store.similaritySearch(queryDependency, 5);

  // 2) 拼接上下文
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

  // 3) 构造 Prompt
  let langPrompt = '';
  if (language === 'zh') {
    langPrompt = 'You are a multilingual assistant. Please answer in Chinese.';
  } else if (language === 'en') {
    langPrompt = 'You are a multilingual assistant. Please answer in English.';
  } else {
    // 其他语言
    langPrompt = `You are a multilingual assistant. Please answer in ${language}.`;
  }

  const template = `
    ${langPrompt}
    The user has described these dependencies:
    "${queryDependency}"

    We found these relevant strategies:
    ${context}

    Please provide a concise answer referencing the strategies above if needed.
    If there's not enough info, say "No more info available."
  `;

  const model = new ChatOpenAI({
    modelName: 'gpt-3.5-turbo',
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  //   const chain = new RetrievalQAChain({
  //     combineDocumentsChain: null, // 我们不让chain自己combine
  //     retriever: null,
  //     llm: model,
  //     prompt: PromptTemplate.fromTemplate(template),
  //   });
  const chain = RetrievalQAChain.fromLLM(
    model,
    store.asRetriever(), // 如果想利用内置检索
    {
      prompt: PromptTemplate.fromTemplate(template),
      // 也可自定义 inputKey, outputKey，但一般默认 "query"
    }
  );

  // 调用时必须传 { query: xxx }
  const result = await chain.call({ query: queryDependency });
  //   const result = await chain.call({});
  return result.text;
}
