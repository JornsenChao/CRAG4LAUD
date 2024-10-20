# Your local RAG chatbot
## Tech stacks
React (https://github.com/facebook/create-react-app)
GPT (https://platform.openai.com/docs/api-reference/chat)
Langchain (https://python.langchain.com/docs/tutorials/)
Express.js (https://expressjs.com/en/4x/api.html)


## key project structure

project/
│
├── server/
│ ├── server.js
│ └── chat.js
│
└── src/
  ├── App.js
  └── components/
    ├── ChatComponent.js
    ├── PdfUploader.js
    └── RenderQA.js

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
