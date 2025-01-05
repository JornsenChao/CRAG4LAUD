// src/components/RAGQuery.js
import React, { useState } from 'react';
import axios from 'axios';
import { Input, Select, Button, Modal, message, Spin } from 'antd';

const { TextArea } = Input;
const { Option } = Select;
const DOMAIN = 'http://localhost:9999';

/**
 * RAGQuery
 * @param {string} fileKey - 当前要查询的 fileKey
 * @param {object} dependencyData - 父组件传入的依赖信息对象 (★ 新增)
 */
const RAGQuery = ({ fileKey, dependencyData }) => {
  const [dependencyDesc, setDependencyDesc] = useState(''); // 用户输入的问题
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');
  const [promptPreview, setPromptPreview] = useState('');
  const [promptModalVisible, setPromptModalVisible] = useState(false);

  const handleQuery = async () => {
    if (!fileKey) {
      message.error('No fileKey, please build store first.');
      return;
    }
    setLoading(true);
    setAnswer('');
    setPromptPreview('');

    try {
      const res = await axios.post(`${DOMAIN}/proRAG/query`, {
        fileKey,
        dependencyData, // 将依赖项数据传递到后端
        userQuery: dependencyDesc, // 用户输入的问题
        language,
      });
      if (res.status === 200) {
        // 后端返回 answer / usedPrompt
        setAnswer(res.data.answer);
        setPromptPreview(res.data.usedPrompt); // 将后端返回的 Prompt 放入 Modal
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
        <span>Enter dependency / context:</span>
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

      {answer && (
        <div style={{ marginTop: 20 }}>
          <h4>Answer:</h4>
          <div>{answer}</div>
        </div>
      )}
      {/* 如果 promptPreview 不为空，我们就显示一个按钮来查看最终 Prompt */}
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
