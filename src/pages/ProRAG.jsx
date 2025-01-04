// src/pages/ProRAG.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { Upload, Button, message, Select, Spin, Input } from 'antd';
import * as XLSX from 'xlsx';
import ColumnMapper from '../components/ColumnMapper';
import RAGQuery from '../components/RAGQuery';

const { Dragger } = Upload;
const DOMAIN = 'http://localhost:9999';

const ProRAG = () => {
  const [fileKey, setFileKey] = useState('');
  const [filePath, setFilePath] = useState('');
  const [columns, setColumns] = useState([]);
  const [columnMap, setColumnMap] = useState({
    dependencyCol: [],
    strategyCol: [],
    referenceCol: [],
  });
  const [storeBuilt, setStoreBuilt] = useState(false);

  // 步骤1: 上传表格
  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.xlsx,.csv',
    customRequest: async ({ file, onSuccess, onError }) => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await axios.post(
          `${DOMAIN}/proRAG/uploadFile?fileKey=${file.name}`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
          }
        );
        if (res.status === 200) {
          setFileKey(res.data.fileKey);
          setFilePath(res.data.filePath);
          message.success('File uploaded. Now map columns!');
          onSuccess(res.data);
          parseColsFrontEnd(file);
        } else {
          onError(new Error('Upload failed'));
          message.error('Upload failed');
        }
      } catch (err) {
        console.error(err);
        onError(err);
        message.error('Upload error');
      }
    },
  };

  // 在前端简单解析列名，辅助用户选择
  const parseColsFrontEnd = (file) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      if (json.length > 0) {
        setColumns(Object.keys(json[0]));
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 步骤2: 根据用户选择的三列，构建索引
  const handleBuildStore = async () => {
    const { dependencyCol, strategyCol, referenceCol } = columnMap;
    // 1) 是否为空
    if (
      dependencyCol.length === 0 ||
      strategyCol.length === 0 ||
      referenceCol.length === 0
    ) {
      message.error('Please select at least one column in each category!');
      return;
    }
    // 2) 检查是否有重复
    //   先合并成1个数组
    const allSelected = [...dependencyCol, ...strategyCol, ...referenceCol];
    const setSelected = new Set(allSelected);
    if (allSelected.length !== setSelected.size) {
      message.error(
        'Some columns are used in multiple categories, please fix.'
      );
      return;
    }
    // 向后端提交
    try {
      const payload = { fileKey, filePath, columnMap };
      const res = await axios.post(`${DOMAIN}/proRAG/buildStore`, payload);
      if (res.status === 200) {
        message.success('ProRAG store built successfully!');
        setStoreBuilt(true);
      }
    } catch (err) {
      console.error(err);
      message.error('Build store error');
    }
  };

  return (
    <div>
      {!storeBuilt && (
        <>
          <h4>1. Upload your CSV/Excel</h4>
          <Dragger {...uploadProps} style={{ marginBottom: 20 }}>
            <p>Click or drag file to upload</p>
          </Dragger>

          {columns.length > 0 && (
            <>
              <h4>2. Map columns</h4>
              <ColumnMapper
                columns={columns}
                columnMap={columnMap}
                setColumnMap={setColumnMap}
              />
              <Button
                type="primary"
                onClick={handleBuildStore}
                style={{ marginTop: 10 }}
              >
                Build Store
              </Button>
            </>
          )}
        </>
      )}

      {storeBuilt && (
        <>
          <h4>3. Now you can query ProRAG</h4>
          <RAGQuery fileKey={fileKey} />
        </>
      )}
    </div>
  );
};

export default ProRAG;
