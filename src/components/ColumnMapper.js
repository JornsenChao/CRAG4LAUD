// src/components/ColumnMapper.js
import React from 'react';
import { Select } from 'antd';
const { Option } = Select;

const ColumnMapper = ({ columns, columnMap, setColumnMap }) => {
  const handleChange = (value, which) => {
    setColumnMap({
      ...columnMap,
      [which]: value,
    });
  };

  return (
    <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
      <div>
        <div>Dependency Column</div>
        <Select
          mode="multiple"
          style={{ width: 220 }}
          placeholder="Select column(s)"
          value={columnMap.dependencyCol}
          onChange={(val) => handleChange(val, 'dependencyCol')}
        >
          {columns.map((col) => (
            <Option key={col} value={col}>
              {col}
            </Option>
          ))}
        </Select>
      </div>

      <div>
        <div>Strategy Column</div>
        <Select
          mode="multiple"
          style={{ width: 220 }}
          placeholder="Select column(s)"
          value={columnMap.strategyCol}
          onChange={(val) => handleChange(val, 'strategyCol')}
        >
          {columns.map((col) => (
            <Option key={col} value={col}>
              {col}
            </Option>
          ))}
        </Select>
      </div>

      <div>
        <div>Reference Column</div>
        <Select
          mode="multiple"
          style={{ width: 220 }}
          placeholder="Select column(s)"
          value={columnMap.referenceCol}
          onChange={(val) => handleChange(val, 'referenceCol')}
        >
          {columns.map((col) => (
            <Option key={col} value={col}>
              {col}
            </Option>
          ))}
        </Select>
      </div>
    </div>
  );
};

export default ColumnMapper;
