# Your local RAG chatbot

# ChatRAG

ChatRAG is a simple demo project showcasing Retrieval-Augmented Generation (RAG), allowing you to upload PDF/CSV/XLSX files, build vector embeddings, and ask questions with context retrieved from those files. It also includes a ProRAG module to demonstrate table-based strategies and their dependencies, particularly useful for architecture, landscape architecture, and urban planning contexts.

## Features

- **QuickTalk**:
  - Upload or load files (PDF/CSV/XLSX), and ask questions directly.
  - Preloaded demo files:
    - demo.pdf: [Retrieval-augmented Generation: Shelby, Lacy, and Renato Villela Mafra Alves Da Silva. Retrieval-Augmented Generation: Empowering Landscape Architects with Data-Driven Design. DE: Wichmann Verlag, 2024. https://doi.org/10.14627/537752025.](https://gispoint.de/fileadmin/user_upload/paper_gis_open/DLA_2024/537752025.pdf)
    - demo.csv: Data excerpt from [NOAA’s Climate Resilience Toolkit Options Database](https://toolkit.climate.gov/content/options-database).
- **ProRAG**:
  - Upload a spreadsheet, map columns to categories (dependencies, references, strategies).
  - Retrieve relevant rows and generate answers using an LLM.
  - Especially suitable for “project context – project strategy” data structures, helping architects, landscape architects, and urban planners systematically explore and connect their project information.
  - Another mode for handling large design codes/local planning plans (PDFs, etc.) is under development.
  - Build a knowledge graph to visualize dependencies or frameworks (like AIA Framework for Design Excellence).
- **Graph Visualization**: Uses `react-cytoscapejs`, `react-force-graph`, and `react-speech-recognition` for getting insights of various context, strategies, and how they connect.

## Technology Stack

- **Frontend**

  - [React](https://reactjs.org/) (Create React App)
  - [Ant Design](https://ant.design/) for UI components
  - [Axios](https://github.com/axios/axios) for HTTP requests
  - [Cytoscape](https://js.cytoscape.org/), [react-cytoscapejs](https://github.com/plotly/react-cytoscapejs), [react-force-graph](https://github.com/vasturiano/react-force-graph), [D3](https://d3js.org/) & [ECharts](https://echarts.apache.org/) for graph visualization
  - [React Speech Recognition](https://github.com/JamesBrill/react-speech-recognition) & [speak-tts](https://github.com/tom-s/speak-tts) for speech input/output
  - [XLSX.js](https://github.com/SheetJS/sheetjs) for spreadsheet parsing

- **Backend**

  - [Node.js](https://nodejs.org/) / [Express.js](https://expressjs.com/) server
  - [Multer](https://github.com/expressjs/multer) for file uploads
  - Some modules from [LangChain](https://github.com/hwchase17/langchain) or other embedding logic (in `server` directory)
  - In-memory vector store for quick RAG demonstration

- **Build & Dev Tools**
  - [Concurrently](https://github.com/open-cli-tools/concurrently) to run React dev server + Node server together
  - [React Scripts](https://create-react-app.dev/docs/getting-started) for bundling the frontend

## Getting Started

### 1. Clone the Repository

```
git clone https://github.com/JornsenChao/Chat-RAG.git
cd Chat-RAG
```

### 2. Install Dependencies

To run this locally, you will run both the server and the frontend, each using different port.

#### 1. install at project folder

```
npm install
```

#### 2. install the server

```
cd server
npm install
```

#### 3. run the application, both frontend and server

```
cd ..
npm run dev
```

This will install both frontend and server dependencies specified in the root package.json.

Note: The server folder also has its own package.json for backend dependencies. If needed, run cd server && npm install in there as well—but typically this project structure is set up to install everything from the root.

### 3. Environment Variables

Create a .env file in the root or in the server directory for storing sensitive keys (e.g., your_api_key). Example:

```
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL=gpt-3.5-turbo
HUGGINGFACE_API_KEY = hf_xxx
HUGGINGFACE_MODEL = 'deepseek-ai/DeepSeek-V3-Base'
```

Make sure you add .env to your .gitignore and never commit real API keys.

### 4. Run in Development

Use the dev script to start both the React dev server (port 3000) and the Node server (port 9999 by default) simultaneously:

```
npm run dev
```

The React app is served at http://localhost:3000.
The Express backend is served at http://localhost:9999.

### 5. Usage

#### QuickTalk Mode:

In the frontend, select a file (PDF/CSV/XLSX) to upload or load a demo.
Ask questions in the chat UI. The server does a vector-based RAG retrieval and returns an answer.

#### ProRAG Mode:

- Currently tailored for architects, landscape architects, and urban designers to handle structured “project context – project strategy” data.
- A future mode for handling large design codes and local planning plan PDFs is under development.

1. Upload a spreadsheet, map columns to “dependency”, “strategy”, “reference.”
2. Build the store, then fill in your project context.
3. Click “RAG Query” or “RAG Query with CoT” to get an LLM-generated answer referencing your table data.
4. (Optionally) view or build a graph showing how strategies connect to references, dependencies, or frameworks.

### 6. Build for Production

If you want to bundle the React app for production:

```
npm run build
```

This creates a build folder with a production-optimized version of your React app. Typically, you’d then serve those static files using your Node server or a hosting provider.

## Scripts Overview

npm run dev: Runs React + Node server concurrently for local dev.
npm start: Runs the React app dev server (by default from Create React App).
npm run server: Changes directory to server and runs Node/Express server with nodemon.
npm run build: Builds the React frontend into a production build directory.
npm test: Runs React test runner (Jest/RTL).

# License

No explicit license is currently provided. You may customize or add your own if needed. For usage or distribution, check with the repository owner.

Thanks for checking out ChatRAG! If you have any questions or feedback, feel free to open an issue or contact the repository owner. Enjoy experimenting with the RAG + Graph approach!
