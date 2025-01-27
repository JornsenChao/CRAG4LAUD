import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';

import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { loadAndSplitDocumentsByType } from './chat.js';
import { parseTable } from './proRAG.js'; // 里头 parse CSV/XLSX

const router = express.Router();

// 用于获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 全局存一个 registry (仅内存示例)
export const fileRegistry = {};

// 确保 uploads 文件夹存在
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer，指向 server/fileManager.js 同级下的 uploads 目录
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // 这里用绝对路径
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

/**
 * 1) GET /files/list
 *    列出所有文件的简要信息
 */
router.get('/list', (req, res) => {
  const list = Object.keys(fileRegistry).map((fileKey) => {
    const {
      fileName,
      tags,
      fileType,
      storeBuilt,
      columnMap,
      createdAt,
      lastBuildAt,
      mapAndBuildMethod,
    } = fileRegistry[fileKey];

    return {
      fileKey,
      fileName,
      tags,
      fileType,
      storeBuilt,
      columnMap,
      createdAt, // 文件首次上传时间
      lastBuildAt, // 最近一次 buildStore 时间
      mapAndBuildMethod, // 最近一次 build 的方法名
    };
  });
  res.json(list);
});

/**
 * 2) POST /files/upload
 *    上传新文件(任何类型：pdf/csv/xlsx/txt等)，可同时指定标签tags
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { tags = [] } = req.body; // 传自前端
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileKey = Date.now().toString() + '_' + file.originalname;
    const ext = path.extname(file.originalname).toLowerCase();
    const nowISO = new Date().toISOString();

    fileRegistry[fileKey] = {
      fileName: file.originalname,
      tags: Array.isArray(tags) ? tags : [tags],
      fileType: ext,
      localPath: file.path,
      storeBuilt: false,
      columnMap: null,

      // 我们只保留这几个时间字段
      createdAt: nowISO, // 第一次上传即生成
      lastBuildAt: null, // 尚未build
      mapAndBuildMethod: null, // 尚未build

      memoryStore: null, // 向量store
    };

    return res.json({
      fileKey,
      message: `File ${file.originalname} uploaded and registered.`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 3) PATCH /files/:fileKey
 *    更新文件信息（重命名、打标签等）
 */
router.patch('/:fileKey', (req, res) => {
  try {
    const { fileKey } = req.params;
    const { newName, tags } = req.body;
    const fileRec = fileRegistry[fileKey];
    if (!fileRec) {
      return res.status(404).send('File not found');
    }
    if (newName) {
      fileRec.fileName = newName;
    }
    if (tags) {
      fileRec.tags = Array.isArray(tags) ? tags : [tags];
    }
    return res.json({ message: 'File updated', data: fileRec });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

/**
 * 4) DELETE /files/:fileKey
 *    删除文件与其向量store
 */
router.delete('/:fileKey', (req, res) => {
  try {
    const { fileKey } = req.params;
    const fileRec = fileRegistry[fileKey];
    if (!fileRec) {
      return res.status(404).send('File not found');
    }
    // 删除物理文件
    if (fs.existsSync(fileRec.localPath)) {
      fs.unlinkSync(fileRec.localPath);
    }
    // 删除 registry
    delete fileRegistry[fileKey];
    return res.json({ message: `File ${fileKey} deleted.` });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

/**
 * 5) POST /files/:fileKey/mapColumns
 *    如果是 CSV/XLSX 等，可以设置 columnMap
 *    仅保存到 registry，不立即建store(可分步，也可立即在此建)
 */
router.post('/:fileKey/mapColumns', (req, res) => {
  try {
    const { fileKey } = req.params;
    const fileRec = fileRegistry[fileKey];
    if (!fileRec) {
      return res.status(404).send('File not found');
    }
    if (!['.csv', '.xlsx', '.xls'].includes(fileRec.fileType)) {
      return res.status(400).send('Not a CSV/XLSX file, cannot map columns');
    }
    const { columnMap } = req.body;
    fileRec.columnMap = columnMap;
    fileRec.storeBuilt = false; // 需要重新构建
    return res.json({ message: 'Column map saved', columnMap });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

/**
 * GET /files/:fileKey/columns
 * 返回 CSV/XLSX 文件的列名数组
 */
router.get('/:fileKey/columns', (req, res) => {
  try {
    const { fileKey } = req.params;
    const fileRec = fileRegistry[fileKey];
    if (!fileRec) {
      return res.status(404).send('File not found');
    }
    const ext = fileRec.fileType.toLowerCase();
    if (!['.csv', '.xlsx', '.xls'].includes(ext)) {
      return res.status(400).send('Not a CSV/XLSX file, cannot get columns');
    }

    // 调用 parseTable 获得 records
    const records = parseTable(fileRec.localPath);
    if (!records || records.length === 0) {
      return res.json([]); // 无数据
    }
    // 拿第一行的所有 key
    const columns = Object.keys(records[0]);
    return res.json(columns);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 6) POST /files/:fileKey/buildStore
 *    根据文件类型( PDF/TXT -> 直接loadAndSplitDocumentsByType；CSV/XLSX -> parse表格, 处理columnMap )
 *    然后构建 MemoryVectorStore
 */
router.post('/:fileKey/buildStore', async (req, res) => {
  try {
    const { fileKey } = req.params;
    const fileRec = fileRegistry[fileKey];
    if (!fileRec) {
      return res.status(404).send('File not found');
    }
    const ext = fileRec.fileType.toLowerCase();
    let docs = [];
    if (['.pdf', '.txt', '.csv', '.xlsx'].includes(ext)) {
      if (ext === '.csv' || ext === '.xlsx') {
        // 如果是表格，需要先 parse => row => docs(pageContent, metadata)
        if (!fileRec.columnMap) {
          return res.status(400).send('Need columnMap first');
        }
        const records = parseTable(fileRec.localPath);
        const { dependencyCol, strategyCol, referenceCol } = fileRec.columnMap;
        docs = [];
        records.forEach((row) => {
          const depText = dependencyCol.map((c) => row[c] || '').join(', ');
          const refText = referenceCol.map((c) => row[c] || '').join(', ');
          const strategyText = strategyCol.map((c) => row[c] || '').join('\n');
          docs.push({
            pageContent: strategyText,
            metadata: {
              dependency: depText,
              reference: refText,
            },
          });
        });
      } else {
        // .pdf / .txt
        docs = await loadAndSplitDocumentsByType(fileRec.localPath);
      }
    } else {
      return res.status(400).send(`Unsupported file ext: ${ext}`);
    }

    // 构建向量索引
    // 你可在这里选择OpenAI/Huggingface等, 现示例:
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    const store = await MemoryVectorStore.fromDocuments(docs, embeddings);
    fileRec.memoryStore = store;
    fileRec.storeBuilt = true;

    // 更新 build 相关字段
    const nowISO = new Date().toISOString();
    fileRec.lastBuildAt = nowISO;
    fileRec.mapAndBuildMethod = 'OpenAIEmbeddings'; // 可以根据实际情况写

    return res.json({
      message: `Memory store built for fileKey=${fileKey}`,
      docCount: docs.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

/**
 * 7) GET /files/loadDemo?demoName=xxx
 * - 将 server/demo_docs/xxx 复制到 uploads/ 并注册到 fileRegistry
 * - 返回 { fileKey, message }
 */
router.get('/loadDemo', async (req, res) => {
  try {
    const { demoName } = req.query;
    if (!demoName) {
      return res.status(400).send('Missing demoName param');
    }
    // demo文件在 server/demo_docs/ 下
    const demoFilePath = path.join(__dirname, 'demo_docs', demoName);
    if (!fs.existsSync(demoFilePath)) {
      return res
        .status(404)
        .send(`Demo file ${demoName} not found in demo_docs.`);
    }

    // 复制到 uploads
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // 这里生成一个新的名字防止冲突
    const newFileKey = Date.now().toString() + '_' + demoName;
    const uploadPath = path.join(uploadsDir, newFileKey);
    fs.copyFileSync(demoFilePath, uploadPath);

    // 解析拓展名
    const ext = path.extname(demoName).toLowerCase();

    const nowISO = new Date().toISOString();
    // 注册到 fileRegistry
    fileRegistry[newFileKey] = {
      fileName: demoName,
      tags: ['demo'],
      fileType: ext,
      localPath: uploadPath,
      storeBuilt: false,
      columnMap: null,

      createdAt: nowISO,
      lastBuildAt: null,
      mapAndBuildMethod: null,

      memoryStore: null,
    };

    res.json({
      fileKey: newFileKey,
      message: `Demo ${demoName} loaded as fileKey=${newFileKey}`,
    });
  } catch (err) {
    console.error('Error in /files/loadDemo:', err);
    res.status(500).send(err.message);
  }
});

/** 导出 router */
export const fileManagerRouter = router;
