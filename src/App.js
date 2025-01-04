import FileUploader from './components/FileUploader';
import ChatComponent from './components/ChatComponent';
import RenderQA from './components/RenderQA';
import FileSelector from './components/FileSelector';

import React, { useState, useEffect } from 'react';
import { Layout, Typography, Button } from 'antd'; //【新增：Button】
import axios from 'axios';
import ProRAG from './pages/ProRAG'; //【新增：引入ProRAG页面】

const DOMAIN = 'http://localhost:9999';

const { Header, Content } = Layout;
const { Title } = Typography;

const chatComponentStyle = {
  position: 'fixed',
  bottom: '0',
  width: '80%',
  left: '10%', // this will center it because it leaves 10% space on each side
  marginBottom: '20px',
};

const fileUploaderStyle = {
  margin: 'auto',
  paddingTop: '80px',
};

const renderQAStyle = {
  height: '50%', // adjust the height as you see fit
  overflowY: 'auto',
};

const App = () => {
  // ============【新增：视图模式】============ //
  const [viewMode, setViewMode] = useState('quicktalk');
  // quicktalk 或 proRAG

  // ============（以下保留你的 QuickTalk逻辑）============ //
  //   conversation：使用 useState 钩子来管理对话的状态，初始值为 空数组。
  // isLoading：使用 useState 钩子来管理加载状态，初始值为 false。
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // 1) 当前选中的 fileKey
  const [activeFile, setActiveFile] = useState('');

  // 2) 当前已有的全部 fileKey 列表
  const [fileList, setFileList] = useState([]);

  // 3) 拉取后端已有的 fileKey 列表
  const fetchFileList = async () => {
    try {
      const res = await axios.get(`${DOMAIN}/listFiles`);
      setFileList(res.data); // 更新前端的 fileList
    } catch (err) {
      console.error('Failed to fetch file list:', err);
    }
  };

  // 组件挂载时，先获取一次
  useEffect(() => {
    fetchFileList();
  }, []);

  // 处理回答结果 handleResp 把 当前的 question, answer 河滨成一个元素 加入 conversation。会作为参数传入 ChatComponent.js
  const handleResp = (question, answer) => {
    setConversation([...conversation, { question, answer }]);
  };

  return (
    <Layout style={{ height: '100vh', backgroundColor: 'white' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Title style={{ color: 'green', fontSize: '20px' }}>
          A chatbot for landscape and architecture folks
        </Title>
        {/* ============【新增：切换按钮】============ */}
        <Button
          type="primary"
          onClick={() => {
            setViewMode(viewMode === 'quicktalk' ? 'proRAG' : 'quicktalk');
          }}
        >
          Switch to {viewMode === 'quicktalk' ? 'ProRAG' : 'QuickTalk'}
        </Button>
      </Header>

      <Content style={{ width: '80%', margin: 'auto', paddingTop: 20 }}>
        {viewMode === 'quicktalk' && (
          <>
            <h2>QuickTalk Mode</h2>
            <FileSelector
              fileList={fileList}
              fetchFileList={fetchFileList}
              activeFile={activeFile}
              setActiveFile={setActiveFile}
            />

            <FileUploader onUploadSuccess={fetchFileList} />

            <div style={{ height: '40vh', overflowY: 'auto', marginTop: 20 }}>
              <RenderQA conversation={conversation} isLoading={isLoading} />
            </div>

            <ChatComponent
              handleResp={handleResp}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              activeFile={activeFile}
            />
          </>
        )}

        {viewMode === 'proRAG' && (
          <>
            <h2>ProRAG Mode</h2>
            <ProRAG />
          </>
        )}
      </Content>
    </Layout>
  );
};

export default App;
