import express from "express";
import cors from "cors"; // cross-origin-resource-sharing
import dotenv from "dotenv";
import multer from "multer"; // 处理用户上传的文件
import chat from "./chat.js";

dotenv.config(); // 自动识别 .env 文件

/*初始化 Express 应用
express 是 Node.js 的一个 Web 应用框架，用于构建 Web 和移动应用程序。
cors：用于处理跨域资源共享。
初始化 Express 应用 app。使用 cors 中间件，允许跨域请求。
*/
const app = express();
app.use(cors());

/* 配置 storage (multer)
配置 Multer 的存储策略，指定文件上传后的存储路径和文件名.
创建一个 upload 实例，使用上述存储配置。
 */
const storage = multer.diskStorage({
  // destination: 上传文件的保存路径
  // filename: 上传文件命名
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

/*服务器端口设置
从环境变量中读取端口号，如果没有定义则使用默认值 9999
 */
const PORT = process.env.PORT || 9999;

let filePath;

app.get("/", (req, res) => {
  res.send("healthy");
});

// 写 api，首先考虑 RESTful? FAST? SOAP? GRAPHql?
// 确定了 restful，那些关键词? GET/POST/DELETE/PATCH
// status code?200, 400,500
// input payload, params?
// output

/* 用 express 写 api
// app.post(path, callback [, callback ...])： 
*/

/* upload: 用户上传文件，我们保存在 uploads 目录下（使用 Multer 处理）
express.post( http 路径, middleware, callback )
保存文件路径到全局变量 filePath，并返回上传成功消息。
*/
app.post("/upload", upload.single("file"), async (req, res) => {
  // Use multer to handle file upload
  filePath = req.file.path; // The path where the file is temporarily saved
  res.send(filePath + " upload successfully.");
});

/*
app.get("/chat", async (req, res) => {}：
req 是一个表示 HTTP 请求的对象，它包含了客户端发给服务器的各种信息和数据。常用的属性包括：req.query, req.params, req.body, etc
res 是一个表示 HTTP 响应的对象，用于向客户端发送响应。常用的方法包括：res.send(), res.json(), res.status(), res.redrict(), res.set()
*/
app.get("/chat", async (req, res) => {
  try {
    // 调用自定义聊天函数，传入文件路径和查询问题 req.query.question
    // chat 函数 接受两个参数，文件路径 和 问题
    // chat 函数 返回一个结果， response
    const response = await chat(filePath, req.query.question); // Pass the file path to your main function
    // 返回聊天响应的文本内容。
    res.send(response.text);
  } catch (error) {
    console.error("Error handling chat request:", error);
    res.status(500).send({ error: error.message }); // 返回错误状态码和消息
  }
});

// 启动服务器，监听指定端口。输出服务器启动成功的消息。
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
