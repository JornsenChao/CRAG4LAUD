import fs from 'fs';
import path from 'path';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { CSVLoader } from 'langchain/document_loaders/fs/csv';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { RetrievalQAChain } from 'langchain/chains';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { PromptTemplate } from 'langchain/prompts';
import XLSX from 'xlsx';
import { Document } from 'langchain/document';

import { fileRegistry } from './fileManager.js';

// NOTE: 如果仍想保留全局 map, 也可以
export const vectorStoresMap = {};

/** 加载并切分(仅用于pdf/txt/csv/xlsx) */
export async function loadAndSplitDocumentsByType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  let docs = [];
  if (ext === '.pdf') {
    const loader = new PDFLoader(filePath);
    docs = await loader.load();
  } else if (ext === '.csv') {
    const loader = new CSVLoader(filePath);
    docs = await loader.load();
  } else if (ext === '.xlsx' || ext === '.xls') {
    const workbook = XLSX.readFile(filePath);
    let allText = '';
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const csvData = XLSX.utils.sheet_to_csv(sheet);
      allText += `Sheet: ${sheetName}\n${csvData}\n`;
    });
    docs = [new Document({ pageContent: allText })];
  } else if (ext === '.txt') {
    const txt = fs.readFileSync(filePath, 'utf-8');
    docs = [new Document({ pageContent: txt })];
  } else {
    throw new Error(`Unsupported file type: ${ext}`);
  }
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });
  return splitter.splitDocuments(docs);
}

/** 原先 QuickTalk 的问答: /chat?question=xx&fileKey=xx */
export async function chat(query, fileKey) {
  const fileRec = fileRegistry[fileKey];
  if (!fileRec || !fileRec.storeBuilt || !fileRec.memoryStore) {
    throw new Error(`File ${fileKey} not found or store not built.`);
  }
  const store = fileRec.memoryStore;
  const model = new ChatOpenAI({
    modelName: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const template = `
Use the following pieces of context to answer the question at the end.
If you don't know, just say "I don't know."

{context}
Question: {question}
Answer:
  `;
  const chain = RetrievalQAChain.fromLLM(model, store.asRetriever(), {
    prompt: PromptTemplate.fromTemplate(template),
  });
  const response = await chain.call({ query });
  return response.text;
}
