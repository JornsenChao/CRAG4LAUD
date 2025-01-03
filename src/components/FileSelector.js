// src/components/FileSelector.js
import React, { useState } from 'react';
import axios from 'axios';
import { Select, Button, Input, message } from 'antd';

const { Option } = Select;
const DOMAIN = 'http://localhost:9999';

const FileSelector = ({
  fileList = [],
  fetchFileList,
  activeFile,
  setActiveFile,
}) => {
  const [demoName, setDemoName] = useState('');

  // 用户点击 "Load Demo"
  const loadDemo = async () => {
    if (!demoName) return;
    try {
      const res = await axios.get(`${DOMAIN}/useDemo?fileKey=${demoName}`);
      if (res.status === 200) {
        message.success(`Demo "${demoName}" loaded!`);
        // 刷新 fileList
        fetchFileList();
        // 切到这个 demo
        setActiveFile(demoName);
      }
    } catch (err) {
      console.error(err);
      message.error('Load demo failed');
    }
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <div>
        <Select
          style={{ width: 200 }}
          placeholder="Select file"
          value={activeFile}
          onChange={(val) => setActiveFile(val)}
        >
          {fileList.map((fileKey) => (
            <Option key={fileKey} value={fileKey}>
              {fileKey}
            </Option>
          ))}
        </Select>
        <span style={{ marginLeft: '10px' }}>
          Current: {activeFile || 'None'}
        </span>
      </div>

      <div style={{ marginTop: '10px' }}>
        <Input
          style={{ width: 120 }}
          placeholder="pdf / csv ..."
          value={demoName}
          onChange={(e) => setDemoName(e.target.value)}
        />
        <Button style={{ marginLeft: '5px' }} onClick={loadDemo}>
          Load Demo
        </Button>
      </div>
    </div>
  );
};

export default FileSelector;
