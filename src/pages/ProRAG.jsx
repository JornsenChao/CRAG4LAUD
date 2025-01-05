// src/pages/ProRAG.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { Upload, Button, message, Modal, Select, Spin, Input } from 'antd';
import * as XLSX from 'xlsx';
import ColumnMapper from '../components/ColumnMapper';
import RAGQuery from '../components/RAGQuery';
import DependencySelector from '../components/DependencySelector';

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
  const [buildingStore, setBuildingStore] = useState(false);

  // =========== 新增状态：管理用户在 DependencySelector 里的选择  ===========
  const [dependencyData, setDependencyData] = useState({}); // { climateRisks, regulations, projectTypes, environment, scale, additional }
  const [previewPrompt, setPreviewPrompt] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);

  // 用户点击“Preview Query”后，拼装成最终要查询的文本
  const handlePreviewQuery = () => {
    // 把 dependencyData 各项拼成一段文字
    const {
      climateRisks = [],
      regulations = [],
      projectTypes = [],
      environment = [],
      scale = [],
      additional = '',
    } = dependencyData;

    // 简单拼成一段
    const text = `
【气候风险类型】= ${climateRisks.join(', ') || '无'}
【法规限制】= ${regulations.join(', ') || '无'}
【项目类型】= ${projectTypes.join(', ') || '无'}
【项目环境】= ${environment.join(', ') || '无'}
【项目尺度】= ${scale.join(', ') || '无'}
【其他补充】= ${additional || '无'}
`.trim();

    setPreviewPrompt(text);
    setPreviewVisible(true);
  };

  // 你也可以在弹窗里再确认后，自动发请求
  // 这里先演示点击"Confirm & Query"时，把 previewPrompt 当做 dependencyDescription

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
    <div style={{ padding: 20 }}>
      {!storeBuilt && (
        <>
          <h3>1. Upload Tabular File(CSV/Excel)</h3>
          <Dragger {...uploadProps} style={{ marginBottom: 20 }}>
            <p>Click or drag file to upload</p>
          </Dragger>

          {columns.length > 0 && (
            <>
              <h3>2. Map Columns to Category </h3>
              <ColumnMapper
                columns={columns}
                columnMap={columnMap}
                setColumnMap={setColumnMap}
              />
              <Button
                type="primary"
                onClick={handleBuildStore}
                loading={buildingStore}
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
          <h2>ProRAG Database is now ready</h2>
          <p>
            You can use the following UI to collect dependency conditions and
            then perform RAG queries.
          </p>

          <h3>3. Select or Input</h3>
          <DependencySelector onChange={(data) => setDependencyData(data)} />

          <div>
            <Button type="default" onClick={handlePreviewQuery}>
              Preview Selction
            </Button>
          </div>

          <Modal
            title="Preview of Dependency Query"
            visible={previewVisible}
            onCancel={() => setPreviewVisible(false)}
            footer={[
              <Button key="cancel" onClick={() => setPreviewVisible(false)}>
                Close
              </Button>,
              <Button
                key="confirm"
                type="primary"
                onClick={() => {
                  // 你也可以改成单独的函数
                  setPreviewVisible(false);
                  // 做别的处理，比如自动更新 <RAGQuery> 的 dependency
                }}
              >
                Confirm & Close
              </Button>,
            ]}
          >
            <div style={{ whiteSpace: 'pre-wrap' }}>{previewPrompt}</div>
          </Modal>

          <h3 style={{ marginTop: 30 }}>4. RAG Query</h3>
          <p>
            这里直接用你已有的 <code>RAGQuery</code> 组件示例。
            <br />
            你可以将 <b>previewPrompt</b> 作为 <code>defaultDependency</code>{' '}
            传给 RAGQuery。
          </p>
          <RAGQuery fileKey={fileKey} defaultDependency={previewPrompt} />
        </>
      )}
    </div>
  );
};

export default ProRAG;
