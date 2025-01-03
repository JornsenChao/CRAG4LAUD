// server/chat.js

import fs from 'fs';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { RetrievalQAChain } from 'langchain/chains';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { PromptTemplate } from 'langchain/prompts';

// 用于在内存中保存向量索引
let memoryStore = null;

/**
 * 1) 处理用户上传的 PDF，构建 MemoryVectorStore 并存入全局变量 memoryStore
 */
export async function processFileAndSetVectorStore(filePath) {
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
  memoryStore = await MemoryVectorStore.fromDocuments(splittedDocs, embeddings);

  console.log('Memory store updated successfully!');
}

/**
 * 2) 基于当前的 memoryStore 做问答
 */
export async function chat(query) {
  if (!memoryStore) {
    throw new Error(
      'No PDF has been processed yet. Please upload a file first.'
    );
  }

  const model = new ChatOpenAI({
    modelName: 'gpt-3.5-turbo',
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const template = `
Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say that you don't know, don't try to make up an answer.
Use ten sentences maximum and keep the answer as concise as possible.

{context}
Question: {question}
Helpful Answer:
  `;

  const chain = RetrievalQAChain.fromLLM(model, memoryStore.asRetriever(), {
    prompt: PromptTemplate.fromTemplate(template),
  });

  // 调用 chain，得到回答
  const response = await chain.call({ query });
  return response.text; // 只返回回答部分
}
