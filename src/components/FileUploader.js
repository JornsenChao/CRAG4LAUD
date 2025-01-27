import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, Input, message } from 'antd';
import { AudioOutlined, ThunderboltOutlined } from '@ant-design/icons';
import SpeechRecognition, {
  useSpeechRecognition,
} from 'react-speech-recognition';
import Speech from 'speak-tts';

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
    sp.init({ volume: 1, lang: 'en-GB' })
      .then(() => setSpeech(sp))
      .catch((e) => console.error('Speech init error:', e));
  }, []);

  useEffect(() => {
    if (!listening && transcript) {
      onSearch(transcript);
      setIsRecording(false);
      resetTranscript();
    }
  }, [listening, transcript]);

  const onSearch = async (question) => {
    if (!activeFile) {
      return message.warning('No file selected');
    }
    setSearchValue('');
    setIsLoading(true);
    try {
      const res = await axios.get(`${DOMAIN}/chat`, {
        params: { question, fileKey: activeFile },
      });
      handleResp(question, res.data);
      if (isChatModeOn && speech) {
        speech.speak({ text: res.data, queue: false });
      }
    } catch (err) {
      console.error(err);
      handleResp(question, { error: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChatMode = () => {
    setIsChatModeOn(!isChatModeOn);
    if (isRecording) {
      setIsRecording(false);
      SpeechRecognition.stopListening();
    }
  };

  const toggleRecording = () => {
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
      <Input
        placeholder="Type your question"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        onPressEnter={() => onSearch(searchValue)}
        style={{ flex: 1 }}
      />
      <Button
        type="primary"
        icon={<ThunderboltOutlined />}
        onClick={() => onSearch(searchValue)}
        loading={isLoading}
      >
        Ask
      </Button>
      <Button type="primary" danger={isChatModeOn} onClick={toggleChatMode}>
        Chat Mode: {isChatModeOn ? 'On' : 'Off'}
      </Button>
      {isChatModeOn && (
        <Button
          icon={<AudioOutlined />}
          danger={isRecording}
          onClick={toggleRecording}
        >
          {isRecording ? 'Recording...' : 'Rec'}
        </Button>
      )}
    </div>
  );
};

export default ChatComponent;
