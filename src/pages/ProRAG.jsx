import React, { useState } from 'react';
import { Card, Select, Button, message, Modal } from 'antd';
import axios from 'axios';
import DependencySelector from '../components/DependencySelector';
import RAGQuery from '../components/RAGQuery';

const DOMAIN = 'http://localhost:9999';

function ProRAG() {
  const [fileKey, setFileKey] = useState('');
  const [fileList, setFileList] = useState([]);
  const [dependencyData, setDependencyData] = useState({});
  const [customFields, setCustomFields] = useState([]);

  const [loadingFiles, setLoadingFiles] = useState(false);

  const fetchFileList = async () => {
    try {
      setLoadingFiles(true);
      const res = await axios.get(`${DOMAIN}/files/list`);
      setFileList(res.data);
    } catch (err) {
      console.error(err);
      message.error('Fail to get files');
    } finally {
      setLoadingFiles(false);
    }
  };

  // 组件加载时
  React.useEffect(() => {
    fetchFileList();
  }, []);

  return (
    <div>
      <h2>ProRAG Mode</h2>
      <Card className="my-card">
        <p>
          Select a “built” CSV/XLSX file (storeBuilt==true), then define
          context, do RAG query.
        </p>
        <Select
          style={{ width: 300 }}
          placeholder="Select ProRAG file"
          value={fileKey}
          onChange={(val) => setFileKey(val)}
          loading={loadingFiles}
        >
          {fileList
            .filter((f) => f.storeBuilt === true)
            .map((f) => (
              <Select.Option key={f.fileKey} value={f.fileKey}>
                {f.fileName}
              </Select.Option>
            ))}
        </Select>
      </Card>

      <Card title="Step 1: Define Context" className="my-card">
        <DependencySelector onChange={(data) => setDependencyData(data)} />
      </Card>

      <Card title="Step 2: RAG Query & Graph" className="my-card">
        <RAGQuery
          fileKey={fileKey}
          dependencyData={dependencyData}
          customFields={customFields}
        />
      </Card>
    </div>
  );
}

export default ProRAG;
