// server/server.js

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import { processFileAndSetVectorStore, chat } from './chat.js';

dotenv.config();

const app = express();
app.use(cors());

// 如果需要 bodyParser 或 JSON 解析，可以加上
// app.use(express.json());

const PORT = process.env.PORT || 9999;

/**
 * 配置 multer，先存到 uploads/ 文件夹
 * 稍后会立刻解析并删除
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // 先保存到 uploads
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // 原始文件名
  },
});
const upload = multer({ storage });

app.get('/', (req, res) => {
  res.send('healthy');
});

/**
 * 1) 用户上传文件
 *    - 用 multer 存到 uploads/
 *    - processFileAndSetVectorStore(filePath)
 *    - 删除文件
 */
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const filePath = req.file.path;

    // 构建向量索引
    await processFileAndSetVectorStore(filePath);

    // 解析完后直接删除文件
    fs.unlinkSync(filePath);

    // 返回成功
    res
      .status(200)
      .send('File processed and memory store updated. File deleted.');
  } catch (err) {
    console.error('Error handling file upload:', err);
    res.status(500).send(err.message);
  }
});

/**
 * 2) 前端问问题 /chat?question=xxx
 *    - 调用 chat(question)，得到回答
 */
app.get('/chat', async (req, res) => {
  try {
    const question = req.query.question;
    const answer = await chat(question);
    res.send(answer);
  } catch (error) {
    console.error('Error handling chat request:', error);
    res.status(500).send({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
