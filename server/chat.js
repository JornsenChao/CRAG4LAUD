// server/chat.js

import fs from 'fs';
import path from 'path';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { RetrievalQAChain } from 'langchain/chains';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { PromptTemplate } from 'langchain/prompts';

export const vectorStoresMap = {};
// 用来保存所有文件的 vector store： { fileName1: store1, fileName2: store2, ... }

/**
 * 处理 PDF 文件，产生向量索引，存到 vectorStoresMap[fileKey] 中
 * @param {string} filePath - PDF 路径
 * @param {string} fileKey - 存在 map 中的 key
 */

/**
 * 1) 处理用户上传的 PDF，构建 MemoryVectorStore 并存入全局变量 memoryStore
 */
export async function processFileAndSetVectorStore(filePath, fileKey) {
  // 用 PDFLoader 加载文档
  const loader = new PDFLoader(filePath);
  const docs = await loader.load();

  // 切分文档
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 0,
  });
  const splittedDocs = await textSplitter.splitDocuments(docs);

  // 构建嵌入并生成向量存储
  const embeddings = new OpenAIEmbeddings({
    // 注意后端通常用 process.env.OPENAI_API_KEY
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
  // memoryStore = await MemoryVectorStore.fromDocuments(splittedDocs, embeddings);
  // 生成向量存储
  const memoryStore = await MemoryVectorStore.fromDocuments(
    splittedDocs,
    embeddings
  );
  // 存到全局对象中
  vectorStoresMap[fileKey] = memoryStore;
  console.log('Memory store updated successfully!');
}

/**
 * 2) 基于当前的 memoryStore 做问答
 */
export async function chat(query, fileKey) {
  // 如果这个文件还没有生成向量索引，报错
  if (!vectorStoresMap[fileKey]) {
    throw new Error(
      `File "${fileKey}" not found. Please upload or load a demo first.`
    );
  }

  const model = new ChatOpenAI({
    modelName: 'gpt-3.5-turbo',
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const template = `
Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say "I don't know," don't try to make up an answer.
Use ten sentences maximum and keep the answer as concise as possible.

{context}
Question: {question}
Helpful Answer:
  `;

  const chain = RetrievalQAChain.fromLLM(
    model,
    vectorStoresMap[fileKey].asRetriever(),
    {
      prompt: PromptTemplate.fromTemplate(template),
    }
  );

  // 调用 chain，得到回答
  const response = await chain.call({ query });
  return response.text; // 只返回回答部分
}
