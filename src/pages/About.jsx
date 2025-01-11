// src/pages/About.jsx
import React from 'react';
import { Card } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// 引入 github-markdown-css 提供的样式
import 'github-markdown-css/github-markdown.css';

const readmeContent = `

***CRAG4LAUD* (Chatbot RAG for landscape architects, arcitects, and urban planners)** is a demo project illustrating how Retrieval-Augmented Generation (RAG) works. You can upload PDF, CSV, or XLSX files, generate vector embeddings, and then ask questions that leverage those embeddings to retrieve highly relevant context from your documents—enabling more accurate, grounded responses from the language model (LLM).

In addition, CRAG4LAUD includes a ProRAG module designed for table-based data. It’s particularly helpful in fields such as architecture, landscape architecture, and urban planning, where complex strategies, dependencies, and references often need to be managed in a structured format. ProRAG demonstrates how to organize this information, retrieve it via RAG, and then visualize relationships among strategies, dependencies, and references.

Beyond Q&A, CRAG4LAUD also supports graph visualization using multiple libraries (Cytoscape, D3 Force, React Force Graph, etc.), offering an intuitive way to explore how different pieces of your documents interconnect.

If you’re interested in learning about RAG or want to see how to integrate retrieval and LLM-based generation into your own workflow, feel free to upload documents, build embeddings, and experience the end-to-end RAG process right here.


- **QuickTalk**:
  - Upload or load files (PDF/CSV/XLSX), and ask questions directly.
  - Preloaded demo files:
    - demo.pdf: [Retrieval-augmented Generation: Shelby, Lacy, and Renato Villela Mafra Alves Da Silva. Retrieval-Augmented Generation: Empowering Landscape Architects with Data-Driven Design. DE: Wichmann Verlag, 2024. https://doi.org/10.14627/537752025.](https://gispoint.de/fileadmin/user_upload/paper_gis_open/DLA_2024/537752025.pdf)
    - demo.csv: Data excerpt from [NOAA’s Climate Resilience Toolkit Options Database](https://toolkit.climate.gov/content/options-database).
- **ProRAG**:
  - Upload a spreadsheet, map columns to categories (dependencies, references, strategies).
  - Retrieve relevant rows and generate answers using an LLM.
  - Especially suitable for “project context – project strategy” data structures, helping architects, landscape architects, and urban planners systematically explore and connect their project information. ProRAG module organizes project strategies, dependencies, and references in a clear, table-driven format.
  - Another mode for handling large design codes/local planning plans (PDFs, etc.) is under development.
  - Build a knowledge graph to visualize dependencies or frameworks (like AIA Framework for Design Excellence).
    - Graph Visualization: Uses react-cytoscapejs, react-force-graph, and react-speech-recognition for getting insights of various context, strategies, and how they connect.

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
  - [LangChain](https://github.com/hwchase17/langchain) or other embedding logic 
  - In-memory vector store for quick RAG demonstration

- **Build & Dev Tools**
  - [Concurrently](https://github.com/open-cli-tools/concurrently) to run React dev server + Node server together
  - [React Scripts](https://create-react-app.dev/docs/getting-started) for bundling the frontend


# About the author
This tool is developed by Yongqin Zhao (yongqz2@uw.edu), an Master of Science in Design Technology candidate from the University of Washington.

# Contribute to this project?
https://github.com/JornsenChao/CREG4LAUD

# License

No explicit license is currently provided. You may customize or add your own if needed. For usage or distribution, check with the repository owner.

Thanks for checking out my project! If you have any questions or feedback, feel free to open an issue or contact the repository owner. Enjoy experimenting with the RAG + Graph approach!

`;

function About() {
  return (
    <div style={{ background: '#d9d9d9', padding: 0, minHeight: '100vh' }}>
      {/* <Card
        title="About This Project"
        bordered={false}
        style={{
          maxWidth: 1000,
          margin: '0 auto', // 水平居中
          minHeight: '80vh',
        }}
      > */}
      {/* Markdown 容器加上 GitHub 的样式类 */}
      <div className="markdown-body" style={{ minHeight: '60vh' }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {readmeContent}
        </ReactMarkdown>
      </div>
      {/* </Card> */}
    </div>
  );
}

export default About;
