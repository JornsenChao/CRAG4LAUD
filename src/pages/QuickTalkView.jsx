import React, { useState, useEffect } from 'react';
import { Card, message } from 'antd';
import axios from 'axios';

import FileUploader from '../components/FileUploader';
import FileSelector from '../components/FileSelector';
import RenderQA from '../components/RenderQA';
import ChatComponent from '../components/ChatComponent';

const DOMAIN = 'http://localhost:9999';

const QuickTalkView = () => {
  // 这些状态和逻辑与之前相同
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFile, setActiveFile] = useState('');
  const [fileList, setFileList] = useState([]);

  const fetchFileList = async () => {
    try {
      const res = await axios.get(`${DOMAIN}/listFiles`);
      setFileList(res.data);
    } catch (err) {
      console.error('Failed to fetch file list:', err);
    }
  };

  useEffect(() => {
    fetchFileList();
  }, []);

  // 将 ChatComponent 回传的问答推入 conversation
  const handleResp = (question, answer) => {
    setConversation((prev) => [...prev, { question, answer }]);
  };

  return (
    // 父容器：占满父层空间（通常是 <Content> 里 height:100%）
    <div
      style={{
        display: 'flex',
        flexDirection: 'row', // 横向分栏
        height: '100%',
        overflow: 'hidden',
        gap: '16px',
      }}
    >
      {/* 左侧：固定宽度，垂直排布 */}
      <div
        style={{
          width: '360px', // 也可以用百分比，如 '30%'
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* 上半：FileUploader (Dragger) */}
        <Card size="small" style={{ flex: '0 0 auto' }}>
          <FileUploader
            onUploadSuccess={fetchFileList}
            // 若需要让 Dragger 更扁：
            draggerStyle={{ height: 200, border: '1px dashed #999' }}
          />
        </Card>

        {/* 下半：FileSelector + DemoLoad */}
        <Card size="large" style={{ flex: '1 1 auto', overflow: 'auto' }}>
          <FileSelector
            fileList={fileList}
            fetchFileList={fetchFileList}
            activeFile={activeFile}
            setActiveFile={setActiveFile}
          />
          {/* 你如果有“Load Demo”按钮，也是放这儿 */}
        </Card>
      </div>

      {/* 右侧：聊天记录+输入框，垂直布局 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {/* 聊天记录区：可滚动 */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            backgroundColor: '#fff',
            borderRadius: 8,
            padding: '12px',
          }}
        >
          <RenderQA conversation={conversation} isLoading={isLoading} />
        </div>

        {/* 底部输入区：ChatComponent */}
        <div style={{ flex: '0 0 auto' }}>
          <ChatComponent
            handleResp={handleResp}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            activeFile={activeFile}
          />
        </div>
      </div>
    </div>
  );
};

export default QuickTalkView;
