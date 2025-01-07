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

/**
 * proRAGStores 包含两部分：columnMap 和 vectorStoreMap
 * - columnMap[fileKey]：记录用户在前端映射了哪些列为 dependencyCol、strategyCol、referenceCol
 * - vectorStoreMap[fileKey]：记录已构建好的 MemoryVectorStore 实例
 */
export const proRAGStores = {
  columnMap: {},
  vectorStoreMap: {},
};

/**
 * parseTable(filePath):
 *  - 根据文件扩展名 (xlsx, csv, 等) 解析成 JS 对象数组
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
 * buildProRAGStore(filePath, fileKey, columnMap):
 *  - 读取表格并解析成 records
 *  - 根据 columnMap 把 strategyCol 的文本合并到 pageContent，把 dependencyCol / referenceCol 的文本合并到 metadata
 *  - 用 OpenAIEmbeddings 嵌入后存储到 MemoryVectorStore
 *  - 存到 proRAGStores.vectorStoreMap[fileKey]
 */
export async function buildProRAGStore(filePath, fileKey, columnMap) {
  const records = parseTable(filePath);

  // 将表格中的每一行转成一个 Document
  // 这里简化处理：将 strategyCol 对应的列文本合并到 pageContent；dependencyCol, referenceCol 合并到 metadata。
  const docs = [];
  for (const row of records) {
    // 多列合并
    const strategyText = columnMap.strategyCol
      .map((col) => (row[col] || '').toString())
      .join('\n')
      .trim();

    const dependencyVal = columnMap.dependencyCol
      .map((col) => (row[col] || '').toString())
      .join(', ')
      .trim();

    const referenceVal = columnMap.referenceCol
      .map((col) => (row[col] || '').toString())
      .join(', ')
      .trim();

    // 构造 Document
    const doc = new Document({
      pageContent: strategyText,
      metadata: {
        dependency: dependencyVal,
        reference: referenceVal,
      },
    });

    docs.push(doc);
  }

  // 构建向量索引 (MemoryVectorStore)
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const memoryStore = await MemoryVectorStore.fromDocuments(docs, embeddings);

  // 保存到全局
  proRAGStores.vectorStoreMap[fileKey] = memoryStore;
  proRAGStores.columnMap[fileKey] = columnMap;

  console.log(
    `[ProRAG] store built for fileKey=${fileKey}, docCount=${docs.length}`
  );
}

/**
 * proRAGQuery():
 *  - 从前端接收 dependencyData + customFields + userQuery
 *  - dependencyData 中每个字段都是 { values:string[], type:'dependency'|'reference'|'strategy' }, 以及 additional
 *  - customFields 是 [{fieldName, fieldValue, fieldType}, ...]
 *  - 把这些输入拼接到 combinedQuery，做 similaritySearch
 *  - 用 RetrievalQAChain 生成回答
 */
export async function proRAGQuery(
  dependencyData,
  userQuery,
  fileKey,
  language = 'en',
  customFields = []
) {
  // 获取对应的向量索引
  const store = proRAGStores.vectorStoreMap[fileKey];
  if (!store) {
    throw new Error(
      `No store found for fileKey="${fileKey}". Did you build store?`
    );
  }

  // =============== 1. 整理 dependencyData =============== //
  // dependencyData 可能包含 5~6 个字段: climateRisks, regulations, projectTypes, environment, scale, additional
  // 每个字段结构: { values:string[], type:'dependency'|'reference'|'strategy' }
  // 例如:
  //   dependencyData.climateRisks = { values:['Flooding','Drought'], type:'dependency' }
  //   dependencyData.regulations   = { values:['wetland'],          type:'reference' }
  //   ...
  //   dependencyData.additional = 'any extra text'
  //
  // 我们可以按 type 整理:
  let depTexts = [];
  let refTexts = [];
  let strTexts = [];

  function distribute(obj) {
    // obj = { values, type }
    if (!obj || !obj.values) return;
    const { values, type } = obj;
    switch (type) {
      case 'dependency':
        depTexts.push(...values);
        break;
      case 'reference':
        refTexts.push(...values);
        break;
      case 'strategy':
        strTexts.push(...values);
        break;
      default:
        break;
    }
  }

  // 把 5~6 个字段都分配一下
  distribute(dependencyData.climateRisks);
  distribute(dependencyData.regulations);
  distribute(dependencyData.projectTypes);
  distribute(dependencyData.environment);
  distribute(dependencyData.scale);

  // 其他补充
  const additionalText = dependencyData.additional || '';

  // =============== 2. 整理 customFields =============== //
  // customFields 是 [{ fieldName, fieldValue, fieldType }, ...]
  // 也要分到 depTexts, refTexts, strTexts
  customFields.forEach((cf) => {
    switch (cf.fieldType) {
      case 'dependency':
        depTexts.push(`${cf.fieldName}: ${cf.fieldValue}`);
        break;
      case 'reference':
        refTexts.push(`${cf.fieldName}: ${cf.fieldValue}`);
        break;
      case 'strategy':
        strTexts.push(`${cf.fieldName}: ${cf.fieldValue}`);
        break;
      default:
        break;
    }
  });

  // =============== 3. 拼接成一个 combinedQuery =============== //
  const combinedQuery = `
User Dependencies: ${depTexts.join(', ')}
User References: ${refTexts.join(', ')}
User Strategies: ${strTexts.join(', ')}
Additional Info: ${additionalText}

User's question: ${userQuery}
`.trim();

  // =============== 4. 相似度检索 =============== //
  const docs = await store.similaritySearch(combinedQuery, 10);

  // 整理 chunk 作为上下文
  const context = docs
    .map(
      (d, idx) => `
---- Document #${idx + 1} ----
Strategy (pageContent):
${d.pageContent}
***REFERENCE***: ${d.metadata.dependency}
***DEPENDENCY***: ${d.metadata.reference}
`
    )
    .join('\n');

  // =============== 5. 构建 Prompt =============== //
  let langPrompt = '';
  if (language === 'zh') langPrompt = 'Answer in Chinese.';
  else if (language === 'en') langPrompt = 'Answer in English.';
  else {
    langPrompt = `Answer in ${language}.`;
  }

  const template = `
You are a knowledgeable consultant in architecture, engineering, and design.
${langPrompt}

The user has provided the following typed context:
- Dependencies: ${depTexts.join(', ')}
- References: ${refTexts.join(', ')}
- Strategies: ${strTexts.join(', ')}
Additional info: ${additionalText}

We found these relevant table chunks:
${context}

// Now, please answer the user's question below in a concise manner, referencing the found chunks if needed. 
// Please respond in Markdown format, with an ordered list (1., 2., 3., ...).
Please note:
1) **If the user explicitly asks for a reference, you must include the 'ReferenceInDoc'** if it exists. 
   If multiple references appear, include them all (e.g., "References: ...").
2) Output your final answer in an ordered list, in Markdown format.
If there's insufficient info, say "No more info available."

User's question:
${userQuery}
  `;

  // =============== 6. 调用 langchain 的 RetrievalQAChain =============== //
  const model = new ChatOpenAI({
    modelName: 'gpt-3.5-turbo',
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const chain = RetrievalQAChain.fromLLM(model, store.asRetriever(), {
    prompt: PromptTemplate.fromTemplate(template),
  });

  const response = await chain.call({ query: combinedQuery });
  const answer = response.text;

  // 用以在前端查看最终 prompt
  const usedPrompt = template;

  // 返回给前端
  return {
    answer,
    usedPrompt,
  };
}

/**
 * 2) 新增: proRAGQueryCoT (带Chain of Thought倾向的 RAG)
 *   - 相比 proRAGQuery，多加“让模型先显示推理过程”之类的提示。
 *   - 注意：模型可能并不真的显式打印全部思维链，也可能写在答案里。你可再做structured output处理
 */
export async function proRAGQueryCoT(
  dependencyData,
  userQuery,
  fileKey,
  language = 'en',
  customFields = []
) {
  const store = proRAGStores.vectorStoreMap[fileKey];
  if (!store) {
    throw new Error(`No store found for fileKey="${fileKey}"`);
  }

  // 跟 proRAGQuery 类似地收集 dep/ref/str
  let depTexts = [];
  let refTexts = [];
  let strTexts = [];

  function distribute(obj) {
    if (!obj || !obj.values) return;
    const { values, type } = obj;
    switch (type) {
      case 'dependency':
        depTexts.push(...values);
        break;
      case 'reference':
        refTexts.push(...values);
        break;
      case 'strategy':
        strTexts.push(...values);
        break;
      default:
        break;
    }
  }

  distribute(dependencyData.climateRisks);
  distribute(dependencyData.regulations);
  distribute(dependencyData.projectTypes);
  distribute(dependencyData.environment);
  distribute(dependencyData.scale);

  const additionalText = dependencyData.additional || '';

  customFields.forEach((cf) => {
    switch (cf.fieldType) {
      case 'dependency':
        depTexts.push(`${cf.fieldName}: ${cf.fieldValue}`);
        break;
      case 'reference':
        refTexts.push(`${cf.fieldName}: ${cf.fieldValue}`);
        break;
      case 'strategy':
        strTexts.push(`${cf.fieldName}: ${cf.fieldValue}`);
        break;
      default:
        break;
    }
  });

  const combinedQuery = `
[Chain of Thought Mode]

User Dependencies: ${depTexts.join(', ')}
User References: ${refTexts.join(', ')}
User Strategies: ${strTexts.join(', ')}
Additional Info: ${additionalText}

User's question: ${userQuery}
`.trim();

  const docs = await store.similaritySearch(combinedQuery, 10);

  const context = docs
    .map(
      (d, idx) => `
---- Document #${idx + 1} ----
Strategy (pageContent):
${d.pageContent}
DependencyInDoc: ${d.metadata.dependency}
ReferenceInDoc : ${d.metadata.reference}
`
    )
    .join('\n');

  let langPrompt = '';
  if (language === 'zh') langPrompt = 'Answer in Chinese.';
  else if (language === 'en') langPrompt = 'Answer in English.';
  else langPrompt = `Answer in ${language}.`;

  // 这里我们加了一个"先写推理过程，再给最终答案"的指令
  const template = `
You are an expert consultant. 
We want to see a chain of thought: 
   1) Analyze the context step by step 
   2) Summarize the references 
   3) Provide the final short answer

${langPrompt}
Please respond in Markdown format. 
If there's insufficient info, say "No more info available."

=== Documents / Context ===
${context}

=== Chain of Thought ===
First, reason it out step by step. Then, produce the final answer.

User's question: ${userQuery}
  `;

  const model = new ChatOpenAI({
    modelName: 'gpt-3.5-turbo',
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
  const chain = RetrievalQAChain.fromLLM(model, store.asRetriever(), {
    prompt: PromptTemplate.fromTemplate(template),
  });

  const response = await chain.call({ query: combinedQuery });
  const answer = response.text;

  return {
    answer,
    usedPrompt: template,
  };
}
