import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { RetrievalQAChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { PromptTemplate } from "langchain/prompts";

import { PDFLoader } from "langchain/document_loaders/fs/pdf";

// NOTE: change this default filePath to any of your default file name
// 一个异步函数，接受两个参数：filePath（默认值为 ./uploads/hbs-lean-startup.pdf）和 query（查询问题）。
const chat = async (filePath = "./uploads/hbs-lean-startup.pdf", query) => {
  // step 1: load the file
  const loader = new PDFLoader(filePath); // create an instance of PDFLoader
  const data = await loader.load(); // await until the file is loaded. this is a promise

  // step 2: split the big document into smaller chunks
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500, //  (in terms of number of characters)
    chunkOverlap: 0,
  }); // create an instance of RecursiveCharacterTextSplitter

  const splitDocs = await textSplitter.splitDocuments(data); // split the big document into smaller chunks

  // step 3: embeddings

  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.REACT_APP_OPENAI_API_KEY,
  });

  const vectorStore = await MemoryVectorStore.fromDocuments(
    splitDocs,
    embeddings
  );

  // step 4: retrieval

  const relevantDocs = await vectorStore.similaritySearch(
    "What is task decomposition?"
  );

  // step 5: qa w/ customzie the prompt
  const model = new ChatOpenAI({
    modelName: "gpt-3.5-turbo",
    openAIApiKey: process.env.REACT_APP_OPENAI_API_KEY,
  });

  const template = `Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say that you don't know, don't try to make up an answer.
Use three sentences maximum and keep the answer as concise as possible.

{context}
Question: {question}
Helpful Answer:`;
  // step 6: pass the llm (model), retriever (vectorStore) and prompt (template) to RetrievalQAChain.fromLLM
  const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever(), {
    prompt: PromptTemplate.fromTemplate(template),
    // returnSourceDocuments: true,
  });
  // step 7: call the chain with the query
  // chain.call：这个方法调用是异步的，调用此方法会返回一个 Promise，表示这个操作是异步的，并且在操作完成后会提供结果。
  // await：await 关键字会暂停 chat 函数的执行，直到 chain.call 返回的 Promise 被解决（即完成或被拒绝）。在 Promise 被解决之前，chat 函数不会继续向下执行，从而确保 response 变量获得的是 chain.call 的最终结果。
  const response = await chain.call({
    query,
  });

  return response;
};

export default chat;
