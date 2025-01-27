import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Select, Button, message } from 'antd';
import RenderQA from '../components/RenderQA';
import ChatComponent from '../components/ChatComponent';

const DOMAIN = 'http://localhost:9999';

const QuickTalkView = () => {
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [activeFile, setActiveFile] = useState('');

  useEffect(() => {
    fetchFileList();
  }, []);

  const fetchFileList = async () => {
    try {
      const res = await axios.get(`${DOMAIN}/files/list`);
      // 这里也可插入 Demo File 伪装
      setFileList(res.data);
    } catch (err) {
      console.error(err);
      message.error('Failed to fetch file list');
    }
  };

  const handleResp = (question, answer) => {
    setConversation((prev) => [...prev, { question, answer }]);
  };

  const loadDemo = async (demoName) => {
    try {
      const res = await axios.get(`${DOMAIN}/files/loadDemo`, {
        params: { demoName },
      });
      if (res.data.fileKey) {
        message.success(res.data.message || 'Demo loaded');
        // 重新拉取文件列表
        await fetchFileList();
        // 设为当前 activeFile
        setActiveFile(res.data.fileKey);
      }
    } catch (err) {
      console.error(err);
      message.error('Load demo failed');
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2>QuickTalk Mode</h2>
      <Card style={{ marginBottom: '16px' }}>
        <div>
          <label>Select a file for QA:</label>
          <Select
            style={{ width: 240, marginLeft: 10 }}
            placeholder="Select file"
            value={activeFile}
            onChange={(val) => setActiveFile(val)}
          >
            {fileList.map((f) => (
              <Select.Option key={f.fileKey} value={f.fileKey}>
                {f.fileName}
              </Select.Option>
            ))}
          </Select>
          <div>
            {/* 两个demo按钮示例 */}
            <Button
              onClick={() => loadDemo('demo.pdf')}
              style={{ marginRight: 8 }}
            >
              Load Demo PDF
            </Button>
            <Button onClick={() => loadDemo('demo.csv')}>Load Demo CSV</Button>
          </div>
        </div>
      </Card>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <RenderQA conversation={conversation} isLoading={isLoading} />
      </div>

      <div style={{ marginTop: 8 }}>
        <ChatComponent
          handleResp={handleResp}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          activeFile={activeFile}
        />
      </div>
    </div>
  );
};

export default QuickTalkView;
