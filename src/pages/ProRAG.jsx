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
  Steps,
  Card,
} from 'antd';
import {
  InboxOutlined,
  FileDoneOutlined,
  TableOutlined,
  DatabaseOutlined,
  ControlOutlined,
} from '@ant-design/icons';
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

  // 用于标记当前处于的步骤索引
  // 0=上传文件，1=映射列，2=构建store，3=填写上下文, 4=查询
  const [currentStep, setCurrentStep] = useState(0);

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
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        if (res.status === 200) {
          setFileKey(res.data.fileKey);
          setFilePath(res.data.filePath);
          message.success('File uploaded. Now map columns!');
          onSuccess(res.data);
          parseColsFrontEnd(file);
          // 完成上传后，自动跳到下一步
          setCurrentStep(1);
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
        setCurrentStep(3);
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
    const newField = {
      fieldName: values.fieldName.trim(),
      fieldValue: values.fieldValue.trim(),
      fieldType: values.fieldType,
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
  const steps = [
    {
      title: 'Upload Table',
      icon: <InboxOutlined />,
      description: 'Upload your CSV/XLSX file',
    },
    {
      title: 'Map Columns',
      icon: <TableOutlined />,
      description: 'Specify which columns are dependency/strategy/reference',
    },
    {
      title: 'Build Store',
      icon: <DatabaseOutlined />,
      description: 'Generate vector store from mapped columns',
    },
    {
      title: 'Define Context',
      icon: <ControlOutlined />,
      description: 'Fill out climate, regulation, project type, etc.',
    },
    {
      title: 'Query & Visualize',
      icon: <FileDoneOutlined />,
      description: 'Ask questions & build graph',
    },
  ];

  return (
    <div style={{ padding: 20 }}>
      <Steps
        current={currentStep}
        items={steps.map((s, idx) => ({
          title: s.title,
          icon: s.icon,
          description: s.description,
        }))}
        style={{ marginBottom: 30 }}
      />

      {/* Step 0 & 1: 上传文件 + 映射 */}
      {!storeBuilt && (
        <>
          {currentStep === 0 && (
            <Card
              title="Step 1: Upload Table File (.CSV / .XLSX)"
              className="my-card"
            >
              <Dragger {...uploadProps} style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 16 }}>
                  <InboxOutlined /> Click or drag file to upload
                </p>
              </Dragger>
            </Card>
          )}

          {currentStep === 1 && (
            <Card title="Step 2: Map Columns to Category" className="my-card">
              <ColumnMapper
                columns={columns}
                columnMap={columnMap}
                setColumnMap={setColumnMap}
              />
              <Button
                type="primary"
                onClick={() => setCurrentStep(2)}
                style={{ marginTop: 10 }}
              >
                Next: Build Store
              </Button>
            </Card>
          )}
        </>
      )}
      {/* Step 2: 构建 store */}
      {!storeBuilt && currentStep === 2 && (
        <Card title="Step 3: Build ProRAG Store" className="my-card">
          <p>Please confirm columns, then build store.</p>
          <Button
            type="primary"
            loading={buildingStore}
            onClick={handleBuildStore}
          >
            Build Store
          </Button>
        </Card>
      )}

      {/* Step 3: 填写上下文 */}
      {storeBuilt && currentStep <= 3 && (
        <Card title="Step 4: Provide Project Context" className="my-card">
          <DependencySelector onChange={(data) => setDependencyData(data)} />

          <h4 style={{ marginTop: 20 }}>Add custom fields (with type)</h4>
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

          <div style={{ marginBottom: 20 }}>
            {customFields.map((cf, i) => (
              <div key={i} style={{ marginBottom: 4 }}>
                <b>{cf.fieldName}:</b> {cf.fieldValue} <i>({cf.fieldType})</i>
              </div>
            ))}
          </div>

          <Button onClick={handlePreviewQuery}>Preview Selection</Button>
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

          <div style={{ marginTop: 20 }}>
            <Button type="primary" onClick={() => setCurrentStep(4)}>
              Next: RAG Query
            </Button>
          </div>
        </Card>
      )}

      {/* Step 4: RAG Query */}
      {storeBuilt && currentStep >= 4 && (
        <Card title="Step 5: RAG Query & Visualization" className="my-card">
          <RAGQuery
            fileKey={fileKey}
            dependencyData={dependencyData}
            customFields={customFields}
          />
        </Card>
      )}
    </div>
  );
};

export default ProRAG;
