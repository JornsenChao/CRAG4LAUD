import React, { useState } from 'react';
import axios from 'axios'; // 引入 axios 库，用于发送 HTTP 请求
import { InboxOutlined } from '@ant-design/icons';
import { message, Upload, Button, Input } from 'antd';

const { Dragger } = Upload; // 解构赋值获取 Upload 组件中的 Dragger 子组件

const DOMAIN = 'http://localhost:9999';

// // 这个 uploadToBackend 会在 attributes 中调用，而 attributes 会作为对象传递给文件上传窗口
// const uploadToBackend = async (file) => {
//   // 创建一个 FormData 对象, 将文件添加到 FormData 对象中
//   const formData = new FormData();
//   formData.append('file', file);
//   try {
//     // 使用 axios 发送 POST 请求，将文件上传到服务器，并附带 head
//     const response = await axios.post(`${DOMAIN}/upload`, formData, {
//       headers: {
//         'Content-Type': 'multipart/form-data',
//       },
//     });
//     // 返回服务器的响应
//     return response;
//   } catch (error) {
//     console.error('Error uploading file: ', error);
//     return null;
//   }
// };

// // 添加一个函数来调用后端 /useDemo 路由
// const useDemoDoc = async () => {
//   try {
//     const response = await axios.get(`${DOMAIN}/useDemo`);
//     if (response && response.status === 200) {
//       message.success('Demo file loaded successfully!');
//     } else {
//       message.error('Failed to load demo file!');
//     }
//   } catch (error) {
//     console.error('Error loading demo file:', error);
//     message.error('Error loading demo file!');
//   }
// };
// // attributes object 同时包含了函数 (name, multiple) 和数据字段(customRequest, onChange, onDrop) ，通过传递一个包含配置的对象来定制组件的行为和外观。
// // attributes object 用于配置 Upload.Dragger 组件的各种属性，包括文件字段名称、是否允许多文件上传、自定义上传请求逻辑、文件状态变化处理函数以及拖拽事件处理函数。
// const attributes = {
//   name: 'file', // 定义上传组件的属性
//   multiple: true, // 允许多文件上传
//   // customRequest：上传请求逻辑，使用 uploadToBackend 函数处理文件上传，并调用 onSuccess 或 onError 回调函数。
//   customRequest: async ({ file, onSuccess, onError }) => {
//     try {
//       const response = await uploadToBackend(file); // 调用上面新建的上传函数， 返回服务器的响应
//       // 如果上传成功，调用 onSuccess 回调函数； 否则，调用 onError 回调函数
//       if (response && response.status === 200) {
//         onSuccess(response.data);
//       } else {
//         onError(new Error('Upload failed'));
//       }
//     } catch (error) {
//       console.error('Error uploading file: ', error);
//       onError(new Error('Upload failed')); // 调用 onError 以处理错误
//     }
//   },
//   // onChange 是一个函数，接受 info，依据文件上传状态返回消息
//   onChange(info) {
//     const { status } = info.file; // 获取文件的上传状态
//     if (status !== 'uploading') {
//       console.log(info.file, info.fileList);
//     }
//     if (status === 'done') {
//       message.success(`${info.file.name} file uploaded successfully.`);
//     } else if (status === 'error') {
//       message.error(`${info.file.name} file upload failed.`);
//     }
//   },
//   onDrop(e) {
//     console.log('Dropped files', e.dataTransfer.files);
//   },
// };

const FileUploader = ({ onUploadSuccess, draggerStyle = {} }) => {
  const [customFileKey, setCustomFileKey] = useState('');

  const customRequest = async ({ file, onSuccess, onError }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const fileKeyParam = customFileKey || file.name;
      const url = `${DOMAIN}/upload?fileKey=${encodeURIComponent(
        fileKeyParam
      )}`;

      const res = await axios.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.status === 200) {
        onSuccess(res.data);
        message.success(res.data);
        onUploadSuccess?.(); // 通知父组件刷新文件列表（若你有 fileList）
      } else {
        onError(new Error('Upload failed'));
        message.error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading file: ', error);
      onError(error);
      message.error('Upload failed');
    }
  };

  const propsForDragger = {
    name: 'file',
    multiple: false,
    accept: '.pdf,.csv,.xlsx',
    customRequest,
    onChange(info) {
      // 这里如果需要可以处理 onChange 事件
    },
  };

  return (
    <div style={{ textAlign: 'center' }}>
      {/* <Input
        style={{ width: 200, marginBottom: 10 }}
        placeholder="Enter file key (optional)"
        value={customFileKey}
        onChange={(e) => setCustomFileKey(e.target.value)}
      /> */}
      <Dragger {...propsForDragger} style={draggerStyle}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">
          Click or drag a PDF / CSV / XLSX to this area to upload
        </p>
        <p className="ant-upload-hint">
          You can give it a custom key or leave blank to use file name.
        </p>
      </Dragger>
    </div>
  );
};

export default FileUploader;
