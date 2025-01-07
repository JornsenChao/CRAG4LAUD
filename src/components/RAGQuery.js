// src/components/RAGQuery.js
import React, { useState } from 'react';
import axios from 'axios';
import { Input, Select, Button, Modal, message, Spin } from 'antd';
// =============== 新增：导入 react-markdown 和 remark-gfm ================
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const { TextArea } = Input;
const { Option } = Select;
const DOMAIN = 'http://localhost:9999';

/**
 * RAGQuery:
 * - 负责把用户的 dependencyData、language 等信息发送给后端 /proRAG/query
 * - 将后端返回的 answer 显示在页面中
 * - 这里我们用 react-markdown 来渲染 answer (带 Markdown 语法)
 */
const RAGQuery = ({ fileKey, dependencyData, customFields = [] }) => {
  const [dependencyDesc, setDependencyDesc] = useState('');
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');
  const [promptPreview, setPromptPreview] = useState('');
  const [promptModalVisible, setPromptModalVisible] = useState(false);

  // 点击"RAG Query"按钮时调用
  const handleQuery = async () => {
    if (!fileKey) {
      message.error('No fileKey, please build store first.');
      return;
    }
    setLoading(true);
    setAnswer('');
    setPromptPreview('');

    try {
      // 向后端发送 POST
      const res = await axios.post(`${DOMAIN}/proRAG/query`, {
        fileKey,
        dependencyData, // 对象，包括 climateRisks, regulations 等
        userQuery: dependencyDesc, // 这里是用户在此组件里的输入
        language,
        customFields, // 如果你在 ProRAG.jsx 中也收集了自定义字段，就传过来
      });
      if (res.status === 200) {
        // 后端返回 { answer, usedPrompt }
        setAnswer(res.data.answer); // 这是 LLM 生成的 Markdown
        setPromptPreview(res.data.usedPrompt);
      }
    } catch (err) {
      console.error(err);
      message.error('Query error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <span>Enter your question or requests here:</span>
        <TextArea
          rows={3}
          value={dependencyDesc}
          onChange={(e) => setDependencyDesc(e.target.value)}
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
      <Button type="primary" onClick={handleQuery}>
        RAG Query
      </Button>
      {loading && <Spin style={{ marginLeft: 10 }} />}

      {/* 如果有answer，就渲染 */}
      {answer && (
        <div style={{ marginTop: 20 }}>
          <h4>Answer:</h4>
          {/* 重点：用 ReactMarkdown + remarkGfm 渲染 Markdown */}
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
        </div>
      )}

      {/* 如果 promptPreview 不为空，可提供一个按钮查看后端使用的Prompt */}
      {promptPreview && (
        <div style={{ marginTop: 20 }}>
          <Button onClick={() => setPromptModalVisible(true)}>
            Show Final Prompt
          </Button>
        </div>
      )}

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
            maxHeight: '400px',
            overflowY: 'auto',
            background: '#f9f9f9',
            padding: '10px',
          }}
        >
          {promptPreview}
        </pre>
      </Modal>
    </div>
  );
};

export default RAGQuery;
