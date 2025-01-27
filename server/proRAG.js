import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { PromptTemplate } from 'langchain/prompts';
import { RetrievalQAChain } from 'langchain/chains';
import { Document } from 'langchain/document';

import { fileRegistry } from './fileManager.js';

export function parseTable(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  let records = [];
  if (ext === '.csv') {
    const csvData = fs.readFileSync(filePath, 'utf-8');
    // 简单切换, 也可用 d3-dsv 或 XLSX
    const lines = csvData.split('\n');
    const headers = lines[0].split(',');
    for (let i = 1; i < lines.length; i++) {
      const row = {};
      const cells = lines[i].split(',');
      headers.forEach((h, idx) => {
        row[h] = cells[idx] || '';
      });
      records.push(row);
    }
  } else if (ext === '.xlsx' || ext === '.xls') {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    records = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  } else {
    throw new Error(`Unsupported file type: ${ext}`);
  }
  return records;
}

/** ProRAG main RAG Query */
export async function proRAGQuery(
  dependencyData,
  userQuery,
  fileKey,
  language = 'en',
  customFields = []
) {
  const fileRec = fileRegistry[fileKey];
  if (!fileRec || !fileRec.storeBuilt || !fileRec.memoryStore) {
    throw new Error(`File ${fileKey} not found or store not built`);
  }
  const store = fileRec.memoryStore;

  // 1) gather user context from dependencyData + customFields
  let depTexts = [];
  let refTexts = [];
  let strTexts = [];

  function distribute(obj) {
    if (!obj || !obj.values) return;
    const { values, type } = obj;
    if (type === 'dependency') depTexts.push(...values);
    else if (type === 'reference') refTexts.push(...values);
    else if (type === 'strategy') strTexts.push(...values);
  }

  distribute(dependencyData.climateRisks);
  distribute(dependencyData.regulations);
  distribute(dependencyData.projectTypes);
  distribute(dependencyData.environment);
  distribute(dependencyData.scale);
  const additional = dependencyData.additional || '';

  customFields.forEach((cf) => {
    if (cf.fieldType === 'dependency') depTexts.push(cf.fieldValue);
    else if (cf.fieldType === 'reference') refTexts.push(cf.fieldValue);
    else if (cf.fieldType === 'strategy') strTexts.push(cf.fieldValue);
  });

  const combinedQuery = `
User Dependencies: ${depTexts.join(', ')}
User References: ${refTexts.join(', ')}
User Strategies: ${strTexts.join(', ')}
Additional: ${additional}

User's question: ${userQuery}
`.trim();

  // 2) Similarity search
  const docs = await store.similaritySearch(combinedQuery, 20);
  // 3) Build prompt
  let langPrompt = 'You must answer in English.';
  if (language === 'zh') langPrompt = 'You must answer in Chinese.';
  else if (language === 'es') langPrompt = 'You must answer in Spanish.';

  const context = docs
    .map((d, idx) => {
      return `
---- Doc #${idx + 1} ---
${d.pageContent}
DEP: ${d.metadata.dependency}
REF: ${d.metadata.reference}
`;
    })
    .join('\n');

  const template = `
You are an expert. ${langPrompt}

We found these chunks:
${context}

Now answer the question below concisely, referencing the found data if needed:
${userQuery}
`;

  const model = new ChatOpenAI({
    modelName: process.env.OPENAI_MODEL,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
  const chain = RetrievalQAChain.fromLLM(model, store.asRetriever(), {
    prompt: PromptTemplate.fromTemplate(template),
  });
  const response = await chain.call({ query: combinedQuery });
  return {
    answer: response.text,
    usedPrompt: template,
    docs,
  };
}

/** CoT version */
export async function proRAGQueryCoT(
  dependencyData,
  userQuery,
  fileKey,
  language = 'en',
  customFields = []
) {
  const fileRec = fileRegistry[fileKey];
  if (!fileRec || !fileRec.storeBuilt || !fileRec.memoryStore) {
    throw new Error(`File ${fileKey} not found or store not built`);
  }
  const store = fileRec.memoryStore;

  // same gather
  let depTexts = [];
  let refTexts = [];
  let strTexts = [];
  function distribute(obj) {
    if (!obj || !obj.values) return;
    const { values, type } = obj;
    if (type === 'dependency') depTexts.push(...values);
    else if (type === 'reference') refTexts.push(...values);
    else if (type === 'strategy') strTexts.push(...values);
  }
  distribute(dependencyData.climateRisks);
  distribute(dependencyData.regulations);
  distribute(dependencyData.projectTypes);
  distribute(dependencyData.environment);
  distribute(dependencyData.scale);

  customFields.forEach((cf) => {
    if (cf.fieldType === 'dependency') depTexts.push(cf.fieldValue);
    else if (cf.fieldType === 'reference') refTexts.push(cf.fieldValue);
    else if (cf.fieldType === 'strategy') strTexts.push(cf.fieldValue);
  });

  const combinedQuery = `
[Chain of Thought Mode]
User Dependencies: ${depTexts.join(', ')}
User References: ${refTexts.join(', ')}
User Strategies: ${strTexts.join(', ')}

User's question: ${userQuery}
`.trim();

  const docs = await store.similaritySearch(combinedQuery, 10);

  let langPrompt = 'Answer in English.';
  if (language === 'zh') langPrompt = 'Answer in Chinese.';
  else if (language === 'es') langPrompt = 'Answer in Spanish.';

  const context = docs
    .map((d, idx) => `Doc#${idx + 1}: ${d.pageContent}`)
    .join('\n');

  const template = `
You are an expert. We want chain-of-thought. 
${langPrompt}

Relevant docs:
${context}

Question:
${userQuery}
`;

  const model = new ChatOpenAI({
    modelName: process.env.OPENAI_MODEL,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
  const chain = RetrievalQAChain.fromLLM(model, store.asRetriever(), {
    prompt: PromptTemplate.fromTemplate(template),
  });
  const response = await chain.call({ query: combinedQuery });
  return { answer: response.text, usedPrompt: template };
}
