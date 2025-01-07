import fs from 'fs';
import path from 'path';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { CSVLoader } from 'langchain/document_loaders/fs/csv';
// 如果你的langchain版本没有CSVLoader，可以用自定义方式
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { RetrievalQAChain } from 'langchain/chains';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { PromptTemplate } from 'langchain/prompts';
import XLSX from 'xlsx';
import { Document } from 'langchain/document';

/*
这个文件是快速聊天的主要逻辑：

1) 读取文件并切分
2) 生成并保存 MemoryVectorStore
3) 聊天
*/

export const vectorStoresMap = {};
/*
 * 1) 读取文件并切分
 * 尝试根据 filePath 解析文件类型，加载文件到 docs，切分，返回切分后的文件 splittedDocs
这个函数会在下面的 processFileAndSetVectorStore 被调用
 */
export async function loadAndSplitDocumentsByType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  let docs = [];

  if (ext === '.pdf') {
    const loader = new PDFLoader(filePath);
    docs = await loader.load();
  } else if (ext === '.csv') {
    // 用 LangChain 的 CSVLoader (仅在新版本中可用)
    const loader = new CSVLoader(filePath, {
      // 可选: 如果想把第一行当header
      // columnFields: ["col1", "col2", ...]
    });
    docs = await loader.load();
  } else if (ext === '.xlsx') {
    // 1) 用 xlsx 解析Excel
    // 2) 把所有sheet的内容转成 text
    // 3) 生成 docs
    const workbook = XLSX.readFile(filePath);
    let allText = '';

    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const csvData = XLSX.utils.sheet_to_csv(sheet);
      // 你也可以用 sheet_to_json 等方式处理
      allText += `Sheet: ${sheetName}\n${csvData}\n`;
    });

    // 将合并的文本封装成一个 Document 对象
    docs = [new Document({ pageContent: allText })];
  } else {
    throw new Error(`Unsupported file type: ${ext}`);
  }

  // 统一使用文本切分
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });
  const splittedDocs = await textSplitter.splitDocuments(docs);
  return splittedDocs;
}

/**
 * 2) 生成并保存 MemoryVectorStore
 * 根据 filePath，调用 loadAndSplitDocumentsByType，得到切分后的文件 splittedDocs
 * 将 splittedDocs 嵌入，得到 embeddings，构建 这个文件的 memoryStore
 * 根据文件名 fileKey 将 memoryStore 保存到 vectorStoresMap
 */
export async function processFileAndSetVectorStore(filePath, fileKey) {
  const splittedDocs = await loadAndSplitDocumentsByType(filePath);

  // 嵌入
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
  const memoryStore = await MemoryVectorStore.fromDocuments(
    splittedDocs,
    embeddings
  );

  vectorStoresMap[fileKey] = memoryStore;
  console.log(`Memory store for "${fileKey}" updated successfully!`);
}

/**
 * 3) 基于当前的 memoryStore 做问答
 * 需要用户的问题 query，以及提问的文件名 fileKey
 * 会在 app.get('/chat', async (req, res) => {} 中被调用。两个参数这样被解析:const { question, fileKey } = req.query; 其中 req是request，res是response
 */
export async function chat(query, fileKey) {
  if (!vectorStoresMap[fileKey]) {
    throw new Error(`File "${fileKey}" not found or not processed yet.`);
  }

  const model = new ChatOpenAI({
    modelName: 'gpt-3.5-turbo',
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const template = `
Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say "I don't know," don't make up an answer.
Use ten sentences maximum and keep the answer as concise as possible.
The user question maybe in English or other language, and if it's not in English, you should also reply to the user in their native language.

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

  const response = await chain.call({ query });
  return response.text;
}
