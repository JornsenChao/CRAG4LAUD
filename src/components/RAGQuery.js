// src/components/RAGQuery.js
import React, { useState } from 'react';
import axios from 'axios';
import { Input, Select, Button, message, Spin } from 'antd';

const { TextArea } = Input;
const { Option } = Select;
const DOMAIN = 'http://localhost:9999';

const RAGQuery = ({ fileKey }) => {
  const [dependencyDesc, setDependencyDesc] = useState('');
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');

  const handleQuery = async () => {
    if (!fileKey) {
      message.error('No fileKey, please build store first.');
      return;
    }
    setLoading(true);
    setAnswer('');
    try {
      const res = await axios.post(`${DOMAIN}/proRAG/query`, {
        fileKey,
        dependencyDescription: dependencyDesc,
        language,
      });
      if (res.status === 200) {
        setAnswer(res.data.answer);
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
    </div>
  );
};

export default RAGQuery;
