// src/components/RAGQuery.js
import React, { useState } from 'react';
import axios from 'axios';
import { Input, Select, Button, Modal, message, Spin } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import GraphViewer from './GraphViewer';

const { TextArea } = Input;
const { Option } = Select;
const DOMAIN = 'http://localhost:9999';

const RAGQuery = ({ fileKey, dependencyData, customFields = [] }) => {
  // 用户输入的问题
  const [userQuery, setUserQuery] = useState('');
  const [language, setLanguage] = useState('en');

  // 加载状态
  const [loadingNormal, setLoadingNormal] = useState(false);
  const [loadingCoT, setLoadingCoT] = useState(false);

  // LLM 找到的文档
  const [docs, setDocs] = useState([]);

  // 普通RAG回答
  const [answerNormal, setAnswerNormal] = useState('');
  const [promptNormal, setPromptNormal] = useState('');

  // 带CoT的RAG回答
  const [answerCoT, setAnswerCoT] = useState('');
  const [promptCoT, setPromptCoT] = useState('');

  // 控制Modal
  const [promptModalVisible, setPromptModalVisible] = useState(false);
  const [promptModalContent, setPromptModalContent] = useState('');

  // const [graphData, setGraphData] = useState(null);
  // const [selectedFramework, setSelectedFramework] = useState('');

  // 点击按钮：普通 RAG Query
  const handleQueryNormal = async () => {
    if (!fileKey) {
      return message.error('No fileKey, please build store first.');
    }
    if (!userQuery.trim()) {
      // 如果用户没输入任何文字
      message.warning('Please type something in the query box!');
      return; // 不执行请求
    }
    setLoadingNormal(true);
    setAnswerNormal('');
    setPromptNormal('');
    // setGraphData(null);

    try {
      const res = await axios.post(`${DOMAIN}/proRAG/query`, {
        fileKey,
        dependencyData,
        userQuery,
        language,
        customFields,
        // selectedFramework,
      });
      if (res.status === 200) {
        setAnswerNormal(res.data.answer);
        setPromptNormal(res.data.usedPrompt);
        setDocs(res.data.docs || []);
        // if (res.data.graphData && res.data.graphData.nodes) {
        //   setGraphData(res.data.graphData);
        //   console.log(res.data.graphData);
        // } else {
        //   setGraphData({ nodes: [], edges: [] });
        // }
      }
    } catch (err) {
      console.error(err);
      message.error('Query (normal) error');
    } finally {
      setLoadingNormal(false);
    }
  };

  // 点击按钮：RAG Query with CoT
  const handleQueryCoT = async () => {
    if (!fileKey) {
      return message.error('No fileKey, please build store first.');
    }
    if (!userQuery.trim()) {
      // 如果用户没输入任何文字
      message.warning('Please type something in the query box!');
      return; // 不执行请求
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
      if (res.status === 200) {
        setAnswerCoT(res.data.answer);
        setPromptCoT(res.data.usedPrompt);
      }
    } catch (err) {
      console.error(err);
      message.error('Query (CoT) error');
    } finally {
      setLoadingCoT(false);
    }
  };

  // 显示 Prompt 的 modal
  const showPromptModal = (which) => {
    if (which === 'normal') {
      setPromptModalContent(promptNormal);
    } else {
      setPromptModalContent(promptCoT);
    }
    setPromptModalVisible(true);
  };

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <p>Enter your question or requests here:</p>
        <TextArea
          rows={3}
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <span>Answer language: </span>
        <Select
          style={{ width: 120 }}
          value={language}
          onChange={(val) => setLanguage(val)}
        >
          <Option value="en">English</Option>
          <Option value="zh">中文</Option>
          <Option value="es">Español</Option>
        </Select>
      </div>

      {/* ============ 在这里新增一个选择框架的下拉 ============ */}
      {/* <div style={{ marginBottom: 10 }}>
        <span>Framework: </span>
        <Select
          style={{ width: 200 }}
          value={selectedFramework}
          onChange={(val) => setSelectedFramework(val)}
        >
          <Option value="">No Framework (none)</Option>
          <Option value="AIA">AIA Framework for Design Excellence</Option>
        </Select>
      </div> */}

      {/* 两个按钮 */}
      <Button
        type="primary"
        onClick={handleQueryNormal}
        loading={loadingNormal}
      >
        RAG Query
      </Button>
      <Button
        type="default"
        onClick={handleQueryCoT}
        loading={loadingCoT}
        style={{ marginLeft: 10 }}
      >
        RAG Query with CoT
      </Button>

      {/* 普通回答 */}
      {answerNormal && (
        <div style={{ marginTop: 20 }}>
          <h4>Normal RAG Answer:</h4>
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

      {/* 带CoT回答 */}
      {answerCoT && (
        <div style={{ marginTop: 20 }}>
          <h4>RAG + Chain of Thought Answer:</h4>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{answerCoT}</ReactMarkdown>
          <Button
            style={{ marginTop: 8 }}
            onClick={() => showPromptModal('cot')}
          >
            Show CoT Prompt
          </Button>
        </div>
      )}
      {/* {graphData ? (
        <div style={{ marginTop: 20 }}>
          <h4>Knowledge Graph (Cytoscape)</h4>
          <GraphViewer graphData={graphData} />
        </div>
      ) : null} */}
      {/* 查看Prompt的弹窗 */}
      <Modal
        title="Final Prompt Sent to LLM"
        visible={promptModalVisible}
        onCancel={() => setPromptModalVisible(false)}
        footer={null}
        width={800}
      >
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            maxHeight: 400,
            overflowY: 'auto',
            background: '#f9f9f9',
            padding: 10,
          }}
        >
          {promptModalContent}
        </pre>
      </Modal>
    </div>
  );
};

export default RAGQuery;
