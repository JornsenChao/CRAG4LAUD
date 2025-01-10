import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, Input, Tooltip, message } from 'antd';
import { AudioOutlined, ThunderboltOutlined } from '@ant-design/icons';
import SpeechRecognition, {
  useSpeechRecognition,
} from 'react-speech-recognition';
import Speech from 'speak-tts';

const { Search } = Input;
const DOMAIN = 'http://localhost:9999';

const ChatComponent = (props) => {
  const { handleResp, isLoading, setIsLoading, activeFile } = props;
  const [searchValue, setSearchValue] = useState('');
  const [isChatModeOn, setIsChatModeOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speech, setSpeech] = useState(null);

  const { transcript, listening, resetTranscript } = useSpeechRecognition();

  useEffect(() => {
    const sp = new Speech();
    sp.init({
      /*...*/
    })
      .then(() => setSpeech(sp))
      .catch((e) => console.error('Error init speech:', e));
  }, []);

  useEffect(() => {
    if (!listening && transcript) {
      onSearch(transcript);
      setIsRecording(false);
    }
  }, [listening, transcript]);

  const onSearch = async (question) => {
    if (!activeFile) {
      message.warning('No file selected! Please select or load a file first.');
      return;
    }
    setSearchValue('');
    setIsLoading(true);
    try {
      const response = await axios.get(`${DOMAIN}/chat`, {
        params: { question, fileKey: activeFile },
      });
      handleResp(question, response.data);
      if (isChatModeOn && speech) {
        speech.speak({ text: response.data, queue: false });
      }
    } catch (error) {
      console.error(error);
      handleResp(question, { error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const chatModeClickHandler = () => {
    setIsChatModeOn(!isChatModeOn);
    setIsRecording(false);
    SpeechRecognition.stopListening();
  };

  const recordingClickHandler = () => {
    if (isRecording) {
      setIsRecording(false);
      SpeechRecognition.stopListening();
    } else {
      setIsRecording(true);
      SpeechRecognition.startListening();
    }
  };

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {/* 输入框 + 提交按钮 + Chat Mode按钮 一行 */}
      {/* 让输入框尽量宽，用flex: 1 */}
      <Input
        placeholder="Type your question"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        onPressEnter={() => onSearch(searchValue)}
        style={{ flex: 1 }}
      />

      {/* Ask 按钮 */}
      <Button
        type="primary"
        icon={<ThunderboltOutlined />}
        onClick={() => onSearch(searchValue)}
        loading={isLoading}
      >
        Ask
      </Button>

      {/* Chat Mode按钮 */}
      <Button
        type="primary"
        danger={isChatModeOn}
        onClick={chatModeClickHandler}
      >
        Chat Mode: {isChatModeOn ? 'On' : 'Off'}
      </Button>

      {/* 如果chatModeOn, 录音按钮 */}
      {isChatModeOn && (
        <Button
          type="primary"
          icon={<AudioOutlined />}
          danger={isRecording}
          onClick={recordingClickHandler}
        >
          {isRecording ? 'Recording...' : 'Rec'}
        </Button>
      )}
    </div>
  );
};

export default ChatComponent;
