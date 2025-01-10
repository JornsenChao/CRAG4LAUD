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

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition();

  useEffect(() => {
    const sp = new Speech();
    sp.init({
      volume: 1,
      lang: 'en-US',
      rate: 1,
      pitch: 1,
      voice: 'Google UK English Male',
      splitSentences: true,
    })
      .then(() => {
        setSpeech(sp);
      })
      .catch((e) => {
        console.error('An error occured while initializing speech: ', e);
      });
  }, []);

  useEffect(() => {
    if (!listening && transcript) {
      onSearch(transcript);
      setIsRecording(false);
    }
  }, [listening, transcript]);

  const talk = (text) => {
    if (!speech) return;
    speech
      .speak({ text, queue: false })
      .then(() => {
        userStartConvo();
      })
      .catch((e) => {
        console.error('An error occurred in speak:', e);
      });
  };

  const userStartConvo = () => {
    SpeechRecognition.startListening();
    setIsRecording(true);
    resetEverything();
  };

  const resetEverything = () => {
    resetTranscript();
    setSearchValue('');
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

  const onSearch = async (question) => {
    if (!activeFile) {
      message.warning('No file selected! Please select or load a file first.');
      return;
    }
    setSearchValue('');
    setIsLoading(true);
    try {
      const response = await axios.get(`${DOMAIN}/chat`, {
        params: {
          question,
          fileKey: activeFile,
        },
      });
      handleResp(question, response.data);
      if (isChatModeOn) {
        talk(response.data);
      }
    } catch (error) {
      console.error(`Error: ${error}`);
      handleResp(question, { error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
      {!isChatModeOn && (
        <Search
          placeholder="Type your question"
          enterButton={
            <Tooltip title="Send your query">
              <ThunderboltOutlined /> Ask
            </Tooltip>
          }
          size="large"
          onSearch={onSearch}
          loading={isLoading}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      )}

      <Button
        type="primary"
        size="large"
        danger={isChatModeOn}
        onClick={chatModeClickHandler}
      >
        Chat Mode: {isChatModeOn ? 'On' : 'Off'}
      </Button>

      {isChatModeOn && (
        <Button
          type="primary"
          icon={<AudioOutlined />}
          size="large"
          danger={isRecording}
          onClick={recordingClickHandler}
        >
          {isRecording ? 'Recording...' : 'Click to record'}
        </Button>
      )}
    </div>
  );
};

export default ChatComponent;
