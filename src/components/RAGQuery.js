import React, { useState } from 'react';
import axios from 'axios';
import { Input, Select, Button, Modal, message } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import GraphViewer from './GraphViewer';

const DOMAIN = 'http://localhost:9999';

const RAGQuery = ({ fileKey, dependencyData, customFields = [] }) => {
  const [userQuery, setUserQuery] = useState('');
  const [language, setLanguage] = useState('en');
  const [loadingNormal, setLoadingNormal] = useState(false);
  const [loadingCoT, setLoadingCoT] = useState(false);

  const [answerNormal, setAnswerNormal] = useState('');
  const [promptNormal, setPromptNormal] = useState('');
  const [docs, setDocs] = useState([]);

  const [answerCoT, setAnswerCoT] = useState('');
  const [promptCoT, setPromptCoT] = useState('');

  const [graphData, setGraphData] = useState(null);
  const [selectedLibrary, setSelectedLibrary] = useState('cytoscape');
  const [selectedFramework, setSelectedFramework] = useState('');

  const [promptModalVisible, setPromptModalVisible] = useState(false);
  const [promptModalContent, setPromptModalContent] = useState('');

  const handleQueryNormal = async () => {
    if (!fileKey) {
      return message.error('No file selected');
    }
    if (!userQuery.trim()) {
      return message.warning('Type something');
    }
    setLoadingNormal(true);
    setAnswerNormal('');
    setPromptNormal('');
    try {
      const res = await axios.post(`${DOMAIN}/proRAG/query`, {
        fileKey,
        dependencyData,
        userQuery,
        language,
        customFields,
      });
      setAnswerNormal(res.data.answer);
      setPromptNormal(res.data.usedPrompt);
      setDocs(res.data.docs || []);
    } catch (err) {
      console.error(err);
      message.error('Query normal error');
    } finally {
      setLoadingNormal(false);
    }
  };

  const handleQueryCoT = async () => {
    if (!fileKey) {
      return message.error('No file selected');
    }
    if (!userQuery.trim()) {
      return message.warning('Type something');
    }
    setLoadingCoT(true);
    setAnswerCoT('');
    setPromptCoT('');
    try {
      const res = await axios.post(`${DOMAIN}/proRAG/queryCoT`, {
        fileKey,
        dependencyData,
        userQuery,
        language,
        customFields,
      });
      setAnswerCoT(res.data.answer);
      setPromptCoT(res.data.usedPrompt);
    } catch (err) {
      console.error(err);
      message.error('Query CoT error');
    } finally {
      setLoadingCoT(false);
    }
  };

  const handleViewInGraph = async () => {
    if (!docs || docs.length === 0) {
      return message.warning('No docs to visualize');
    }
    try {
      const res = await axios.post(`${DOMAIN}/proRAG/buildGraph`, {
        docs,
        frameworkName: selectedFramework,
      });
      setGraphData(res.data.graphData);
      message.success('Graph built');
    } catch (err) {
      console.error(err);
      message.error('Graph build error');
    }
  };

  const showPromptModal = (which) => {
    if (which === 'normal') setPromptModalContent(promptNormal);
    else setPromptModalContent(promptCoT);
    setPromptModalVisible(true);
  };

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <Input.TextArea
          rows={3}
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          placeholder="Type your question..."
        />
      </div>
      <div style={{ marginBottom: 10 }}>
        <span>Answer language: </span>
        <Select
          value={language}
          onChange={(val) => setLanguage(val)}
          style={{ width: 120 }}
        >
          <Select.Option value="en">English</Select.Option>
          <Select.Option value="zh">中文</Select.Option>
          <Select.Option value="es">Español</Select.Option>
        </Select>
      </div>
      <Button
        type="primary"
        onClick={handleQueryNormal}
        loading={loadingNormal}
      >
        RAG Query
      </Button>
      <Button
        style={{ marginLeft: 8 }}
        onClick={handleQueryCoT}
        loading={loadingCoT}
      >
        RAG Query + CoT
      </Button>

      {answerNormal && (
        <div style={{ marginTop: 20 }}>
          <h4>Normal RAG Answer</h4>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {answerNormal}
          </ReactMarkdown>
          <Button
            style={{ marginTop: 8 }}
            onClick={() => showPromptModal('normal')}
          >
            Show Final Prompt
          </Button>
        </div>
      )}
      {answerCoT && (
        <div style={{ marginTop: 20 }}>
          <h4>CoT RAG Answer</h4>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{answerCoT}</ReactMarkdown>
          <Button
            style={{ marginTop: 8 }}
            onClick={() => showPromptModal('cot')}
          >
            Show CoT Prompt
          </Button>
        </div>
      )}
      {/* Graph builder */}
      <div
        style={{ marginTop: 20, borderTop: '1px solid #ccc', paddingTop: 10 }}
      >
        <h3>Build & View Graph from retrieved docs</h3>
        <Select
          style={{ width: 200, marginRight: 10 }}
          value={selectedFramework}
          onChange={(val) => setSelectedFramework(val)}
        >
          <Select.Option value="">(none)</Select.Option>
          <Select.Option value="AIA">AIA Framework</Select.Option>
        </Select>
        <Select
          style={{ width: 200, marginRight: 10 }}
          value={selectedLibrary}
          onChange={(val) => setSelectedLibrary(val)}
        >
          <Select.Option value="cytoscape">Cytoscape</Select.Option>
          <Select.Option value="d3Force">D3 Force</Select.Option>
          <Select.Option value="ReactForceGraph3d">3D ForceGraph</Select.Option>
        </Select>
        <Button onClick={handleViewInGraph}>View in Graph</Button>
      </div>
      {graphData && (
        <div style={{ marginTop: 20 }}>
          <GraphViewer library={selectedLibrary} graphData={graphData} />
        </div>
      )}

      <Modal
        title="Final Prompt"
        visible={promptModalVisible}
        onCancel={() => setPromptModalVisible(false)}
        footer={null}
        width={800}
      >
        <pre style={{ whiteSpace: 'pre-wrap' }}>{promptModalContent}</pre>
      </Modal>
    </div>
  );
};

export default RAGQuery;
