# Your local RAG chatbot

## Tech stacks

React (https://github.com/facebook/create-react-app)

GPT (https://platform.openai.com/docs/api-reference/chat)

Langchain (https://python.langchain.com/docs/tutorials/)

Express.js (https://expressjs.com/en/4x/api.html)

## key project structure

```
project/
│
├── server/ (backend)
│ ├── server.js
│ └── chat.js
│ └──  .env
│
└── src/
  ├── App.js
  └── components/
    ├── ChatComponent.js
    ├── PdfUploader.js
    └── RenderQA.js
```

## frontend & backend

### frontend (React + Ant Design)

通过 PdfUploader 组件把 PDF 文件上传到服务器（存到 uploads/ 目录），并在全局用一个 filePath 变量记录最后一次上传的文件路径。
通过 ChatComponent 组件给用户一个聊天/问答框，并将用户输入的 question 发往服务器接口 /chat。
RenderQA 组件把所有的提问和回答以一问一答的方式渲染出来。
App.js 里则把以上三个组件整合在一个页面布局（antd 的 Layout）中。

### backend (Node + Express)

```
server/
├── chat.js
├── package-lock.json
├── package.json
├── .env
├── server.js
└── uploads
    └── any-pdf-file-of-your-choice.pdf
```

server.js 用了 multer 来接收文件上传，并将文件写到 uploads/ 文件夹。
当用户在前端发出 GET /chat 请求时，会在后端调用自定义的 chat(filePath, question) 函数。
chat.js 里用 LangChain 做了：PDF 文档加载、文本切分、向量化（OpenAIEmbeddings + MemoryVectorStore），最后通过 RetrievalQAChain 得到对用户问题的回答并返回给前端。

## how to use

To run this locally, you will run both the server and the frontend, each using different port.

### 1. install at project folder

```
npm install
```

### 2. install the server

```
cd server
npm install
```

### 3. run the application

```
cd ..
npm run dev
```

## screenshots

![image](https://github.com/user-attachments/assets/c03a172d-a336-427f-ad65-1d2483c65ae5)
![image](https://github.com/user-attachments/assets/990416ef-f379-4be3-9723-73b7d99ad9d9)
