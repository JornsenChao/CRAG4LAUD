import React, { useState } from 'react';
import PdfUploader from './components/PdfUploader';
import ChatComponent from './components/ChatComponent';
import RenderQA from './components/RenderQA';
import { Layout, Typography } from 'antd';

const chatComponentStyle = {
  position: 'fixed',
  bottom: '0',
  width: '80%',
  left: '10%', // this will center it because it leaves 10% space on each side
  marginBottom: '20px',
};

const pdfUploaderStyle = {
  margin: 'auto',
  paddingTop: '80px',
};

const renderQAStyle = {
  height: '50%', // adjust the height as you see fit
  overflowY: 'auto',
};

const App = () => {
  //   conversation：使用 useState 钩子来管理对话的状态，初始值为 空数组。
  // isLoading：使用 useState 钩子来管理加载状态，初始值为 false。
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  // 解构 antd 的组件
  const { Header, Content } = Layout;
  const { Title } = Typography;

  // handleResp 把 当前的 question, answer 河滨成一个元素 加入 conversation。会作为参数传入 ChatComponent.js
  const handleResp = (question, answer) => {
    setConversation([...conversation, { question, answer }]);
  };

  return (
    // 页面的三个部分， PdfUploader, renderQA, ChatComponent
    // 分别调用这三个函数，
    // 其中 PdfUploader 不需要传入参数，
    // renderQAStyle 需要传入 conversation 和 isLoading
    // ChatComponent 需要传入 handleResp（本 App.js 中定义）， isLoading, 和 setIsLoading
    <>
      <Layout style={{ height: '100vh', backgroundColor: 'white' }}>
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Title style={{ color: 'green', fontSize: '20px' }}>
            Chat with me on your local file
          </Title>
        </Header>
        <Content style={{ width: '80%', margin: 'auto' }}>
          <div style={pdfUploaderStyle}>
            <PdfUploader />
          </div>

          <br />
          <br />
          <div style={renderQAStyle}>
            <RenderQA conversation={conversation} isLoading={isLoading} />
          </div>

          <br />
          <br />
        </Content>
        <div style={chatComponentStyle}>
          <ChatComponent
            handleResp={handleResp}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        </div>
      </Layout>
    </>
  );
};

export default App;
