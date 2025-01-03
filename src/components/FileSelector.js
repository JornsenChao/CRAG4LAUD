// src/components/FileSelector.js
import React, { useState } from 'react';
import axios from 'axios';
import { InboxOutlined } from '@ant-design/icons';
import { message, Upload, Radio } from 'antd';

const { Dragger } = Upload;
const DOMAIN = 'http://localhost:9999';

const uploadToBackend = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  try {
    const response = await axios.post(`${DOMAIN}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  } catch (error) {
    console.error('Error uploading file: ', error);
    return null;
  }
};

const FileSelector = ({ onModeChange }) => {
  // 用 state 来表示当前选择模式： "demo" 或 "upload"
  const [mode, setMode] = useState('upload');

  const handleModeChange = (e) => {
    const newMode = e.target.value;
    setMode(newMode);
    // 通知父组件，“当前是否使用 Demo”
    onModeChange(newMode === 'demo');
  };

  const props = {
    name: 'file',
    multiple: false,
    customRequest: async ({ file, onSuccess, onError }) => {
      try {
        const response = await uploadToBackend(file);
        if (response && response.status === 200) {
          onSuccess(response.data);
        } else {
          onError(new Error('Upload failed'));
        }
      } catch (error) {
        onError(new Error('Upload failed'));
      }
    },
    onChange(info) {
      const { status } = info.file;
      if (status === 'done') {
        message.success(`${info.file.name} file uploaded successfully.`);
      } else if (status === 'error') {
        message.error(`${info.file.name} file upload failed.`);
      }
    },
    onDrop(e) {
      console.log('Dropped files', e.dataTransfer.files);
    },
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <Radio.Group
        value={mode}
        onChange={handleModeChange}
        style={{ marginBottom: 16 }}
      >
        <Radio.Button value="demo">使用 Demo 文件</Radio.Button>
        <Radio.Button value="upload">上传我的文件</Radio.Button>
      </Radio.Group>

      {mode === 'upload' && (
        <Dragger {...props}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            Click or drag file to this area to upload
          </p>
          <p className="ant-upload-hint">Support for a single PDF upload.</p>
        </Dragger>
      )}

      {mode === 'demo' && (
        <div style={{ marginTop: 10 }}>
          <p>当前已选择使用 demo_docs 目录下的内置 PDF。</p>
        </div>
      )}
    </div>
  );
};

export default FileSelector;
