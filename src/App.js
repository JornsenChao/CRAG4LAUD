// src/App.js
import React, { useState, useEffect } from 'react';
import {
  Layout,
  Typography,
  Button,
  Menu,
  Row,
  Col,
  Card,
  Space,
  theme,
} from 'antd';
import {
  AppstoreOutlined,
  RobotOutlined,
  SyncOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import FileSelector from './components/FileSelector';
import FileUploader from './components/FileUploader';
import ChatComponent from './components/ChatComponent';
import RenderQA from './components/RenderQA';
import ProRAG from './pages/ProRAG';
import QuickTalkView from './pages/QuickTalkView';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const DOMAIN = 'http://localhost:9999'; // 你的后端地址

function App() {
  // ============【新增：视图模式】============ //
  const [viewMode, setViewMode] = useState('quicktalk');

  // QuickTalk 所需状态
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFile, setActiveFile] = useState('');
  const [fileList, setFileList] = useState([]);

  // 拉取后端已有的 fileKey 列表
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

  // 处理回答结果
  const handleResp = (question, answer) => {
    setConversation((prev) => [...prev, { question, answer }]);
  };

  // 自定义一个菜单项数组
  const menuItems = [
    { key: 'quicktalk', icon: <RobotOutlined />, label: 'QuickTalk Mode' },
    { key: 'prorag', icon: <AppstoreOutlined />, label: 'ProRAG Mode' },
  ];

  const handleMenuClick = (e) => {
    if (e.key === 'quicktalk') {
      setViewMode('quicktalk');
    } else if (e.key === 'prorag') {
      setViewMode('proRAG');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Header */}
      <Header style={{ backgroundColor: '#fff', padding: '0 20px' }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Title level={3} className="app-header-title">
              A chatbot for landscape and architecture folks
            </Title>
          </Col>
          <Col>
            <Menu
              mode="horizontal"
              defaultSelectedKeys={[viewMode]}
              selectedKeys={[viewMode]}
              onClick={handleMenuClick}
              items={menuItems}
            />
          </Col>
        </Row>
      </Header>

      {/* Content */}
      <Layout>
        <Content style={{ margin: '20px auto', width: '95%' }}>
          {/* 当 viewMode === 'quicktalk' 时 */}
          {viewMode === 'quicktalk' && (
            <Card
              className="my-card"
              title={
                <>
                  <RobotOutlined /> QuickTalk Mode
                </>
              }
              bordered={false}
            >
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
            </Card>
          )}

          {/* 当 viewMode === 'proRAG' 时 */}
          {viewMode === 'proRAG' && (
            <Card
              className="my-card"
              title={
                <>
                  <AppstoreOutlined /> ProRAG Mode
                </>
              }
              bordered={false}
            >
              <ProRAG />
            </Card>
          )}
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
