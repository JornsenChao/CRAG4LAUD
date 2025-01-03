import React, { useState, useEffect } from 'react'; // Import useState
import axios from 'axios';
import { Button, Input } from 'antd';
import { AudioOutlined } from '@ant-design/icons';
import SpeechRecognition, {
  useSpeechRecognition,
} from 'react-speech-recognition';
import Speech from 'speak-tts';

const { Search } = Input;

// const PORT_backend = require("../utils/getPorts")().PORT_backend;
const DOMAIN = 'http://localhost:9999';

const searchContainer = {
  display: 'flex',
  justifyContent: 'center',
};
// ChatComponent 在 App.js 中被调用，得到三个传入的参数：handleResp, isLoading, setIsLoading
const ChatComponent = (props) => {
  // 接住 父组件 传入的参数
  const { handleResp, isLoading, setIsLoading, activeFile } = props;
  // Define a state variable to keep track of the search value
  const [searchValue, setSearchValue] = useState('');

  const [isChatModeOn, setIsChatModeOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speech, setSpeech] = useState();

  // speech recognation
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition();

  useEffect(() => {
    const speech = new Speech();
    speech
      .init({
        volume: 1,
        lang: 'en-US',
        rate: 1,
        pitch: 1,
        voice: 'Google UK English Male',
        splitSentences: true,
      })
      .then((data) => {
        // The "data" object contains the list of available voices and the voice synthesis params
        console.log('Speech is ready, voices are available', data);
        setSpeech(speech);
      })
      .catch((e) => {
        console.error('An error occured while initializing : ', e);
      });
  }, []);

  useEffect(() => {
    if (!listening && !!transcript) {
      (async () => await onSearch(transcript))();
      setIsRecording(false);
    }
  }, [listening, transcript]);

  const talk = (what2say) => {
    speech
      .speak({
        text: what2say,
        queue: false, // current speech will be interrupted,
        listeners: {
          onstart: () => {
            console.log('Start utterance');
          },
          onend: () => {
            console.log('End utterance');
          },
          onresume: () => {
            console.log('Resume utterance');
          },
          onboundary: (event) => {
            console.log(
              event.name +
                ' boundary reached after ' +
                event.elapsedTime +
                ' milliseconds.'
            );
          },
        },
      })
      .then(() => {
        // if everyting went well, start listening again
        console.log('Success !');
        userStartConvo();
      })
      .catch((e) => {
        console.error('An error occurred :', e);
      });
  };

  const userStartConvo = () => {
    SpeechRecognition.startListening();
    setIsRecording(true);
    resetEverything();
  };

  const resetEverything = () => {
    resetTranscript();
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
  /*onSearch ：一个异步函数，用于处理输入框的变化事件。当用户在输入框中输入文本时，这个函数会被调用，并更新组件的状态，使得输入框中的值（即用户输入的文本）得以实时反映在组件的状态中。
   */
  const onSearch = async (question) => {
    if (!activeFile) {
      alert('No file selected! Please select or load a file first.');
      return;
    }
    // 清空搜索输入框
    setSearchValue('');
    // 设置加载状态为 true，表示正在处理请求
    setIsLoading(true);

    try {
      // 发送 GET 请求到 /chat 路由，传递查询参数 question
      const response = await axios.get(`${DOMAIN}/chat`, {
        params: {
          question,
          fileKey: activeFile,
        },
      });
      // 调用 handleResp 函数处理响应，将查询问题和响应数据传递给父组件,把question 和 answer 组合 加入 array
      handleResp(question, response.data);
      if (isChatModeOn) {
        talk(response.data);
      }
    } catch (error) {
      console.error(`Error: ${error}`);
      // 捕获并处理错误，将查询问题和错误信息传递给父组件
      handleResp(question, { error: error.message }); // 确保传递的错误信息是一个对象
    } finally {
      // 设置加载状态为 false，表示请求处理完成
      setIsLoading(false);
    }
  };

  // 当检测到任何事件
  const handleChange = (e) => {
    // Update searchValue state when the user types in the input box
    setSearchValue(e.target.value);
  };

  return (
    <div style={searchContainer}>
      {!isChatModeOn && (
        <Search
          placeholder="input search text"
          enterButton="Ask"
          size="large"
          onSearch={onSearch}
          loading={isLoading}
          value={searchValue} // Control the value
          onChange={handleChange} // Update the value when changed
        />
      )}
      <Button
        type="primary"
        size="large"
        danger={isChatModeOn}
        onClick={chatModeClickHandler}
        style={{ marginLeft: '5px' }}
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
          style={{ marginLeft: '5px' }}
        >
          {isRecording ? 'Recording...' : 'Click to record'}
        </Button>
      )}
    </div>
  );
};

export default ChatComponent;
