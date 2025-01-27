import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { chat } from './chat.js';
import { proRAGQuery, proRAGQueryCoT } from './proRAG.js';
import { buildGraphDataFromDocs } from './proRAGGraph.js';

import { fileManagerRouter } from './fileManager.js'; // 新增

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 9999;

/** 使用fileManagerRouter处理 /files 路由下的所有文件管理相关API */
app.use('/files', fileManagerRouter);

/** Demo接口，保留，用于加载demo文件(复制后端的demo_docs/xxx)到内存store */
app.get('/useDemo', (req, res) => {
  // 这里仅示例: 由前端传 ?fileKey=demo.pdf / demo.csv
  // or just hardcode
  const fileKey = req.query.fileKey;
  if (!fileKey) {
    return res.status(400).send('Missing fileKey param for demo');
  }
  // 让前端直接调 /files/uploadDemo?file=xxx 也可以
  return res.send(`Demo file ${fileKey} would be loaded (placeholder).`);
});

/** 1) QuickTalk Chat: GET /chat?question=xx&fileKey=xx */
app.get('/chat', async (req, res) => {
  try {
    const { question, fileKey } = req.query;
    if (!fileKey) {
      return res
        .status(400)
        .send({ error: 'No fileKey specified. Please select a file first.' });
    }
    const answer = await chat(question, fileKey);
    res.send(answer);
  } catch (error) {
    console.error('Error in /chat:', error);
    res.status(500).send({ error: error.message });
  }
});

/** 2) ProRAG Query & CoT Query */
app.post('/proRAG/query', async (req, res) => {
  try {
    const {
      fileKey,
      dependencyData,
      userQuery,
      language,
      customFields = [],
    } = req.body;
    const { answer, usedPrompt, docs } = await proRAGQuery(
      dependencyData,
      userQuery,
      fileKey,
      language,
      customFields
    );
    res.json({ answer, usedPrompt, docs });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

app.post('/proRAG/queryCoT', async (req, res) => {
  try {
    const {
      fileKey,
      dependencyData,
      userQuery,
      language,
      customFields = [],
    } = req.body;
    const { answer, usedPrompt } = await proRAGQueryCoT(
      dependencyData,
      userQuery,
      fileKey,
      language,
      customFields
    );
    res.json({ answer, usedPrompt });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

/** 3) Build Graph from docs */
app.post('/proRAG/buildGraph', async (req, res) => {
  try {
    const { docs, frameworkName } = req.body;
    const graphData = await buildGraphDataFromDocs(docs, frameworkName);
    res.json({ graphData });
  } catch (err) {
    console.error('Error building graph:', err);
    res.status(500).send(err.message);
  }
});

app.get('/', (req, res) => {
  res.send(
    'Server is healthy. Access /files for file management, or /chat, etc.'
  );
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
