import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { processFileAndSetVectorStore, chat, vectorStoresMap } from './chat.js';
import { buildProRAGStore, proRAGQuery, proRAGStores } from './proRAG.js';

dotenv.config();
const app = express();
app.use(cors());

// 新增：允许express接收json body
app.use(express.json());

const PORT = process.env.PORT || 9999;

// 用于获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// multer存储设定
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // 先保存到 uploads
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // 原始文件名
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
// 根路由
app.get('/', (req, res) => {
  res.send('healthy');
});

/**
 * QuickTalk.1) 用户上传文件 -> processFileAndSetVectorStore -> 删除文件
 */
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const filePath = req.file.path;
    // 例如用户可通过 /upload?fileKey=userFile1 传自定义名字
    const fileKey = req.query.fileKey || req.file.originalname;
    // 构建向量索引
    await processFileAndSetVectorStore(filePath, fileKey);

    // 解析完后直接删除文件
    fs.unlinkSync(filePath);

    // 返回成功
    res.status(200).send(`File "${fileKey}" processed. Memory store updated.`);
  } catch (err) {
    console.error('Error handling file upload:', err);
    res.status(500).send(err.message);
  }
});

/**
 * QuickTalk.2) 加载 demo 文件 -> processFileAndSetVectorStore
 */
app.get('/useDemo', async (req, res) => {
  try {
    const fileKey = req.query.fileKey; // demo1, demo2, ...
    if (!fileKey) {
      return res.status(400).send('Missing fileKey param');
    }
    // 拼出 demo 文件路径, 例如 "demo1.pdf"、"demo2.csv"、"demo3.xlsx"
    // const demoFilePath = path.join(__dirname, 'demo_docs', `${fileKey}.pdf`);
    const demoFilePath = path.join(__dirname, 'demo_docs', `${fileKey}`);
    if (!fs.existsSync(demoFilePath)) {
      return res.status(404).send(`Demo file "${fileKey}" not found`);
    }

    // 直接调用之前写好的函数
    await processFileAndSetVectorStore(demoFilePath, fileKey);
    // 返回成功消息
    res.status(200).send(`Demo file "${fileKey}" loaded successfully!`);
  } catch (error) {
    console.error('Error loading demo file:', error);
    res.status(500).send(error.message);
  }
});

/**
 * QuickTalk.3) 前端问问题 /chat?question=xxx
 */
app.get('/chat', async (req, res) => {
  try {
    // const question = req.query.question;
    // const answer = await chat(question);
    const { question, fileKey } = req.query;
    if (!fileKey) {
      return res
        .status(400)
        .send({ error: 'No fileKey specified. Please select a file first.' });
    }
    const answer = await chat(question, fileKey);
    res.send(answer);
  } catch (error) {
    console.error('Error handling chat request:', error);
    res.status(500).send({ error: error.message });
  }
});

/**
 * QuickTalk.4) 返回当前所有加载过的文件 key
 */
app.get('/listFiles', (req, res) => {
  const keys = Object.keys(vectorStoresMap);
  res.json(keys);
});

// ============【以下为新增的 ProRAG 相关路由】============ //

/**
 * ProRAG.1) 上传表格文件，但暂不向量化，等前端指定列映射后再构建索引
 */
app.post('/proRAG/uploadFile', upload.single('file'), (req, res) => {
  try {
    const fileKey = req.query.fileKey || req.file.originalname;
    const filePath = req.file.path;
    // 返回给前端, 后面还要再调 /proRAG/buildStore
    res.json({ fileKey, filePath });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

/**
 * ProRAG.2) 前端确认列映射后 -> buildProRAGStore -> 删临时文件
 */
app.post('/proRAG/buildStore', async (req, res) => {
  try {
    const { fileKey, filePath, columnMap } = req.body;
    // columnMap = { dependencyCol, strategyCol, referenceCol }
    await buildProRAGStore(filePath, fileKey, columnMap);
    // 删除临时文件
    fs.unlinkSync(filePath);
    res.json({ success: true, message: 'ProRAG store built' });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

/**
 * ProRAG.3) 前端输入 dependency / language -> RAG 查询
 */
app.post('/proRAG/query', async (req, res) => {
  try {
    const { fileKey, dependencyData, userQuery, language } = req.body;
    const { answer, usedPrompt } = await proRAGQuery(
      dependencyData,
      userQuery,
      fileKey,
      language
    );
    res.json({ answer, usedPrompt });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
