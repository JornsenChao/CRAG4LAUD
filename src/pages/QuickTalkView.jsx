// src/pages/QuickTalkView.jsx
import React, { useState, useEffect } from 'react';
import { Row, Col, Card } from 'antd';
import axios from 'axios';
import FileSelector from '../components/FileSelector';
import FileUploader from '../components/FileUploader';
import RenderQA from '../components/RenderQA';
import ChatComponent from '../components/ChatComponent';

const DOMAIN = 'http://localhost:9999';

const QuickTalkView = () => {
  // 这里放置 QuickTalk 模式使用的状态和逻辑
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFile, setActiveFile] = useState('');
  const [fileList, setFileList] = useState([]);

  // 拉取后端已有 fileKey
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

  // 接收ChatComponent返回的问答
  const handleResp = (question, answer) => {
    setConversation((prev) => [...prev, { question, answer }]);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%', // 占满Content的高度
        overflow: 'hidden', // 不产生自身滚动条
      }}
    >
      {/* 1) 顶部区域：放文件选择 + 文件上传 */}
      <div style={{ flex: '0 0 auto' }}>
        <Row gutter={16}>
          <Col flex="auto">
            {/* 卡片：FileSelector */}
            <Card size="small" style={{ marginBottom: 10 }}>
              <FileSelector
                fileList={fileList}
                fetchFileList={fetchFileList}
                activeFile={activeFile}
                setActiveFile={setActiveFile}
              />
            </Card>
          </Col>
          <Col flex="300px">
            {/* 卡片：FileUploader，调小Dragger高度 */}
            <Card size="small" style={{ marginBottom: 10 }}>
              <FileUploader
                onUploadSuccess={fetchFileList}
                draggerStyle={{ height: 20 }} // 额外传入自定义样式
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* 2) 中间区域：聊天记录，内部可滚动 */}
      <div
        style={{
          flex: '1 1 auto',
          marginTop: 10,
          overflowY: 'auto', // 仅此处滚动，不出现浏览器滚动条
          background: '#fefefe',
          borderRadius: 8,
          padding: 10,
        }}
      >
        <RenderQA conversation={conversation} isLoading={isLoading} />
      </div>

      {/* 3) 底部：聊天输入区 */}
      <div style={{ flex: '0 0 auto', marginTop: 10 }}>
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
