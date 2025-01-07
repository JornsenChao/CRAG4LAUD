// src/pages/ProRAG.jsx

import React, { useState } from 'react';
import axios from 'axios';
import {
  Upload,
  Button,
  message,
  Modal,
  Select,
  Spin,
  Input,
  Form,
} from 'antd';
import * as XLSX from 'xlsx';

// 你已有的组件
import ColumnMapper from '../components/ColumnMapper';
import RAGQuery from '../components/RAGQuery';
import DependencySelector from '../components/DependencySelector';

const { Dragger } = Upload;
const DOMAIN = 'http://localhost:9999';

const ProRAG = () => {
  // =========== Step 0: 基础状态 ============= //
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

  // =========== Step 1: 用户在 DependencySelector.js 里选了 / 输入了内容 ============= //
  // 每个字段都是 { values: string[], type: 'dependency' | 'reference' | 'strategy' }
  // 例如 dependencyData.climateRisks = { values: ['Flooding','Drought'], type:'dependency' }
  const [dependencyData, setDependencyData] = useState({});

  // =========== Step 2: 可选的自定义字段 (fieldName, fieldValue, fieldType) ============= //
  const [customFields, setCustomFields] = useState([]);
  const [form] = Form.useForm();

  // =========== Step 3: 预览内容 (Modal) ============= //
  const [previewPrompt, setPreviewPrompt] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);

  // =========== 上传并解析表格  ============= //
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

  // 前端简单读取列名，用于 ColumnMapper
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

  // =========== 构建 store ============= //
  const handleBuildStore = async () => {
    const { dependencyCol, strategyCol, referenceCol } = columnMap;
    // 1) 检查列是否都选了
    if (
      dependencyCol.length === 0 ||
      strategyCol.length === 0 ||
      referenceCol.length === 0
    ) {
      message.error('Please select at least one column in each category!');
      return;
    }
    // 2) 检查是否有重复
    const allSelected = [...dependencyCol, ...strategyCol, ...referenceCol];
    const setSelected = new Set(allSelected);
    if (allSelected.length !== setSelected.size) {
      message.error(
        'Some columns are used in multiple categories, please fix.'
      );
      return;
    }

    // 3) 发请求
    try {
      setBuildingStore(true);
      const payload = { fileKey, filePath, columnMap };
      const res = await axios.post(`${DOMAIN}/proRAG/buildStore`, payload);
      if (res.status === 200) {
        message.success('ProRAG store built successfully!');
        setStoreBuilt(true);
      }
    } catch (err) {
      console.error(err);
      message.error('Build store error');
    } finally {
      setBuildingStore(false);
    }
  };

  // =========== 自定义字段：添加 & 显示 ============= //
  const onAddCustomField = (values) => {
    // values = { fieldName, fieldValue, fieldType }
    const newField = {
      fieldName: values.fieldName.trim(),
      fieldValue: values.fieldValue.trim(),
      fieldType: values.fieldType, // dependency | reference | strategy
    };
    setCustomFields((prev) => [...prev, newField]);
    form.resetFields();
  };

  // =========== 预览：将 dependencyData 和 customFields 都显示 ============= //
  const handlePreviewQuery = () => {
    /*
      dependencyData example:
      {
        climateRisks: { values:['Flooding','Drought'], type:'dependency' },
        regulations: { values:['建筑高度限制'], type:'reference' },
        ...
        additional: 'some extra text'
      }

      customFields example:
      [
        { fieldName:'LocalStandard', fieldValue:'ISO20123', fieldType:'reference' },
        ...
      ]
    */
    const {
      climateRisks,
      regulations,
      projectTypes,
      environment,
      scale,
      additional,
    } = dependencyData;

    // 常规区块
    const lines = [];
    lines.push(
      `[climateRisks] type=${climateRisks?.type || ''}, values=${(
        climateRisks?.values || []
      ).join(',')}`
    );
    lines.push(
      `[regulations] type=${regulations?.type || ''}, values=${(
        regulations?.values || []
      ).join(',')}`
    );
    lines.push(
      `[projectTypes] type=${projectTypes?.type || ''}, values=${(
        projectTypes?.values || []
      ).join(',')}`
    );
    lines.push(
      `[environment] type=${environment?.type || ''}, values=${(
        environment?.values || []
      ).join(',')}`
    );
    lines.push(
      `[scale] type=${scale?.type || ''}, values=${(scale?.values || []).join(
        ','
      )}`
    );
    lines.push(`[additional]=${additional || ''}`);

    // 自定义字段
    let customStr = customFields
      .map(
        (cf, i) =>
          `${i + 1}) [${cf.fieldType}] ${cf.fieldName} => ${cf.fieldValue}`
      )
      .join('\n');

    const preview = `
# Basic Fields
${lines.join('\n')}

# Custom Fields
${customStr || '(none)'}
    `.trim();

    setPreviewPrompt(preview);
    setPreviewVisible(true);
  };

  return (
    <div style={{ padding: 20 }}>
      {/* ========== (A) 如果还没 build store，则先展示上传 & column mapper ========== */}
      {!storeBuilt && (
        <>
          <h3>1. Upload Your Tabular File(CSV/Excel)</h3>
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

      {/* ========== (B) 如果已经 build store，则展示 DependencySelector + 自定义字段 + RAGQuery ========== */}
      {storeBuilt && (
        <>
          <h2>ProRAG Database is now ready.</h2>
          <p>
            Please fill out the project context below. You can mark each field
            as dependency / reference / strategy. Also you can add custom
            fields. Then do a RAG query.
          </p>

          {/* Step 3.1: 填写基础区块( climateRisks, regulations, ... ) */}
          <h3>3. Provide some project context</h3>
          <DependencySelector onChange={(data) => setDependencyData(data)} />

          {/* Step 3.2: 额外的自定义字段 */}
          <h4 style={{ marginTop: 20 }}>3.1 Add custom fields (with type)</h4>
          <Form
            layout="inline"
            form={form}
            onFinish={onAddCustomField}
            style={{ marginBottom: 20 }}
          >
            <Form.Item
              name="fieldName"
              rules={[{ required: true, message: 'Please enter Field Name' }]}
            >
              <Input placeholder="Field Name" />
            </Form.Item>
            <Form.Item
              name="fieldValue"
              rules={[{ required: true, message: 'Please enter Field Value' }]}
            >
              <Input placeholder="Field Value" />
            </Form.Item>
            <Form.Item
              name="fieldType"
              initialValue="dependency"
              rules={[{ required: true, message: 'Select type' }]}
            >
              <Select style={{ width: 120 }}>
                <Select.Option value="dependency">dependency</Select.Option>
                <Select.Option value="reference">reference</Select.Option>
                <Select.Option value="strategy">strategy</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                Add
              </Button>
            </Form.Item>
          </Form>

          {/* 展示已经添加的自定义字段 */}
          <div style={{ marginBottom: 20 }}>
            {customFields.map((cf, i) => (
              <div key={i} style={{ marginBottom: 4 }}>
                <b>{cf.fieldName}:</b> {cf.fieldValue} <i>({cf.fieldType})</i>
              </div>
            ))}
          </div>

          {/* 预览按钮 */}
          <Button type="default" onClick={handlePreviewQuery}>
            Preview Selection
          </Button>
          <Modal
            title="Preview of Dependencies + Custom Fields"
            visible={previewVisible}
            onCancel={() => setPreviewVisible(false)}
            footer={[
              <Button key="close" onClick={() => setPreviewVisible(false)}>
                Close
              </Button>,
            ]}
          >
            <pre style={{ whiteSpace: 'pre-wrap' }}>{previewPrompt}</pre>
          </Modal>

          {/* 最终查询 */}
          <h3 style={{ marginTop: 30 }}>4. RAG Query</h3>
          <p>
            Use <code>RAGQuery</code> to pass your context (including typed
            fields) and get strategies from the table.
          </p>
          <RAGQuery
            fileKey={fileKey}
            // 将 customFields 也传给后端
            dependencyData={dependencyData}
            customFields={customFields}
          />
        </>
      )}
    </div>
  );
};

export default ProRAG;
