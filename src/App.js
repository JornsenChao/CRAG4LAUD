import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Layout, Typography, Menu } from 'antd';
import {
  AppstoreOutlined,
  RobotOutlined,
  FileOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';

import QuickTalkView from './pages/QuickTalkView';
import ProRAG from './pages/ProRAG';
import About from './pages/About';
import FileManagement from './pages/FileManagement';

const { Sider, Content } = Layout;
const { Title } = Typography;

function App() {
  return (
    <Router>
      <Layout style={{ height: '100vh' }}>
        <Sider
          width={220}
          style={{ background: '#fff', borderRight: '1px solid #ddd' }}
        >
          <div
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              marginLeft: '20px',
              marginTop: '20px',
              marginBottom: '16px',
            }}
          >
            CRAG4LAUD
          </div>
          <Menu mode="inline" defaultSelectedKeys={['quicktalk']}>
            <Menu.Item key="filemgmt" icon={<FileOutlined />}>
              <Link to="/file-management">File Management</Link>
            </Menu.Item>
            <Menu.Item key="quicktalk" icon={<RobotOutlined />}>
              <Link to="/quicktalk">QuickTalk Mode</Link>
            </Menu.Item>
            <Menu.Item key="prorag" icon={<AppstoreOutlined />}>
              <Link to="/prorag">ProRAG Mode</Link>
            </Menu.Item>
            <Menu.Item key="about" icon={<InfoCircleOutlined />}>
              <Link to="/about">About</Link>
            </Menu.Item>
          </Menu>
        </Sider>
        <Layout>
          <Content
            style={{
              overflowY: 'auto',
              padding: '16px',
              background: '#f0f2f5',
            }}
          >
            <Routes>
              <Route path="/" element={<QuickTalkView />} />
              <Route path="/file-management" element={<FileManagement />} />
              <Route path="/quicktalk" element={<QuickTalkView />} />
              <Route path="/prorag" element={<ProRAG />} />
              <Route path="/about" element={<About />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Router>
  );
}

export default App;
