import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table, Button, Modal, Input, Tag, message, Upload, Space } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import ColumnMapper from '../components/ColumnMapper';

const DOMAIN = 'http://localhost:9999';

function FileManagement() {
  const [fileList, setFileList] = useState([]);
  const [loading, setLoading] = useState(false);

  // For upload
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadTags, setUploadTags] = useState([]);
  // For rename/edit
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [editName, setEditName] = useState('');
  const [editTags, setEditTags] = useState([]);

  // For column mapping
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [mapRecord, setMapRecord] = useState(null);
  const [columnMap, setColumnMap] = useState({
    dependencyCol: [],
    strategyCol: [],
    referenceCol: [],
  });
  const [availableCols, setAvailableCols] = useState([]);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${DOMAIN}/files/list`);
      setFileList(res.data);
    } catch (err) {
      console.error(err);
      message.error('Failed to fetch file list');
    } finally {
      setLoading(false);
    }
  };

  // 1) 上传文件
  const handleUploadFile = async ({ file }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      // 也可以 append('tags', JSON.stringify(uploadTags)) but simpler:
      uploadTags.forEach((tag) => formData.append('tags', tag));

      const res = await axios.post(`${DOMAIN}/files/upload`, formData);
      if (res.data.fileKey) {
        message.success('File uploaded');
        fetchFiles();
      }
    } catch (err) {
      console.error(err);
      message.error('Upload failed');
    }
  };

  // 2) 删除
  const handleDelete = async (record) => {
    if (!window.confirm(`Are you sure to delete file: ${record.fileName}?`))
      return;
    try {
      await axios.delete(`${DOMAIN}/files/${record.fileKey}`);
      message.success('File deleted');
      fetchFiles();
    } catch (err) {
      console.error(err);
      message.error('Delete failed');
    }
  };

  // 3) 编辑(重命名/标签)
  const openEditModal = (record) => {
    setEditRecord(record);
    setEditName(record.fileName);
    setEditTags(record.tags || []);
    setEditModalVisible(true);
  };
  const handleEditOk = async () => {
    try {
      await axios.patch(`${DOMAIN}/files/${editRecord.fileKey}`, {
        newName: editName,
        tags: editTags,
      });
      message.success('File updated');
      setEditModalVisible(false);
      fetchFiles();
    } catch (err) {
      console.error(err);
      message.error('Update failed');
    }
  };

  // 4) map columns (只对 CSV/XLSX)
  const openMapModal = async (record) => {
    setMapRecord(record);
    // 如果记录里已经有 columnMap，就先加载
    const existingMap = record.columnMap || {
      dependencyCol: [],
      strategyCol: [],
      referenceCol: [],
    };
    setColumnMap(existingMap);

    // 调后端获取该文件的columns
    try {
      const res = await axios.get(`${DOMAIN}/files/${record.fileKey}/columns`);
      setAvailableCols(res.data); // res.data 是一个字符串数组
    } catch (err) {
      console.error(err);
      message.error('Failed to get columns');
      setAvailableCols([]);
    }

    setMapModalVisible(true);
  };

  const handleMapOk = async () => {
    if (!mapRecord) return;
    try {
      // 1) save map
      await axios.post(`${DOMAIN}/files/${mapRecord.fileKey}/mapColumns`, {
        columnMap,
      });
      message.success('Column map saved');
      // 2) 立即 build store ?
      await axios.post(`${DOMAIN}/files/${mapRecord.fileKey}/buildStore`);
      message.success('Vector store built');
      setMapModalVisible(false);
      fetchFiles();
    } catch (err) {
      console.error(err);
      message.error('Map/Build failed');
    }
  };

  // 5) 单独 build store (对 pdf/txt)
  const handleBuildStore = async (record) => {
    try {
      await axios.post(`${DOMAIN}/files/${record.fileKey}/buildStore`);
      message.success('Vector store built');
      fetchFiles();
    } catch (err) {
      console.error(err);
      message.error('Build store failed');
    }
  };

  const columns = [
    {
      title: 'File Name',
      dataIndex: 'fileName',
    },
    {
      title: 'Tags',
      dataIndex: 'tags',
      render: (tags) =>
        tags?.map((t) => (
          <Tag color="blue" key={t}>
            {t}
          </Tag>
        )),
    },
    {
      title: 'FileType',
      dataIndex: 'fileType',
    },
    {
      title: 'StoreBuilt',
      dataIndex: 'storeBuilt',
      render: (val) => (val ? 'Yes' : 'No'),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      render: (val) => {
        if (!val) return '';
        // 例如：2025-01-31T11:22:33.456Z -> "2025-01-31 11:22:33"
        // return val.slice(0, 19).replace('T', ' ');
        const dt = new Date(val);
        return dt.toLocaleString();
      },
    },
    {
      title: 'Last Build',
      dataIndex: 'lastBuildAt',
      render: (val) => {
        if (!val) return '';
        // 显示本地时间或只截断
        const dt = new Date(val);
        return dt.toLocaleString();
      },
    },
    {
      title: 'Build Method',
      dataIndex: 'mapAndBuildMethod',
      render: (val) => val || '',
    },
    {
      title: 'Actions',
      render: (text, record) => (
        <Space>
          <Button onClick={() => openEditModal(record)}>Edit</Button>
          <Button danger onClick={() => handleDelete(record)}>
            Delete
          </Button>
          {['.csv', '.xlsx', '.xls'].includes(record.fileType) && (
            <Button onClick={() => openMapModal(record)}>Map & Build</Button>
          )}
          {['.pdf', '.txt'].includes(record.fileType) && !record.storeBuilt && (
            <Button onClick={() => handleBuildStore(record)}>BuildStore</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2>File Management</h2>
      <Button type="primary" onClick={() => setUploadModalVisible(true)}>
        Upload New File
      </Button>

      <Table
        style={{ marginTop: 20 }}
        columns={columns}
        dataSource={fileList}
        rowKey="fileKey"
        loading={loading}
      />

      {/* Upload Modal */}
      <Modal
        title="Upload File"
        visible={uploadModalVisible}
        onCancel={() => setUploadModalVisible(false)}
        footer={null}
      >
        <div style={{ marginBottom: 10 }}>
          <label>Tags (comma separated): </label>
          <Input
            placeholder="e.g. climate, reference"
            onChange={(e) =>
              setUploadTags(e.target.value.split(',').map((t) => t.trim()))
            }
          />
        </div>
        <Upload
          beforeUpload={(file) => {
            handleUploadFile({ file });
            return false; // prevent default
          }}
          multiple={false}
          showUploadList={false}
        >
          <Button icon={<UploadOutlined />}>Select file</Button>
        </Upload>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Edit File"
        visible={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={handleEditOk}
      >
        <label>New Name:</label>
        <Input
          style={{ marginBottom: 10 }}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
        />
        <label>Tags (comma separated):</label>
        <Input
          value={editTags.join(', ')}
          onChange={(e) =>
            setEditTags(e.target.value.split(',').map((x) => x.trim()))
          }
        />
      </Modal>

      {/* Map & Build Modal */}
      <Modal
        title="Map Columns & Build Store"
        visible={mapModalVisible}
        onOk={handleMapOk}
        onCancel={() => setMapModalVisible(false)}
      >
        <ColumnMapper
          columns={availableCols}
          columnMap={columnMap}
          setColumnMap={setColumnMap}
        />
      </Modal>
    </div>
  );
}

export default FileManagement;
