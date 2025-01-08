// src/components/DependencySelector.js
import React, { useState, useEffect, useRef } from 'react';
import { Checkbox, Input, Button, Select } from 'antd';

const { TextArea } = Input;

// 示例：原本固定的选项
const climateRiskOptions = [
  { label: 'Flooding', value: 'flooding' },
  { label: 'Drought', value: 'drought' },
  { label: 'Extreme Heat Wave', value: 'heatwave' },
  { label: 'Sea Level Rise', value: 'sea level rise' },
  { label: 'Landslide', value: 'landslide' },
];

const regulatoryOptions = [
  { label: 'Building Height Limit', value: 'height limit' },
  { label: 'Nature Reserve', value: 'wetland' },
];

const projectTypeOptions = [
  { label: 'Civic Infrastructure', value: 'public building' },
  { label: 'Residential', value: 'residential' },
  { label: 'Commercial', value: 'commercial complex' },
];

const environmentOptions = [
  { label: 'Coastal', value: 'coastal' },
  { label: 'Inland', value: 'inland' },
  { label: 'Alpine', value: 'mountain' },
];

const scaleOptions = [
  { label: 'Site', value: 'small-scale site' },
  { label: 'Building', value: 'medium-scale site' },
  { label: 'Campus', value: 'large-scale region' },
];

/**
 * 现在我们希望：
 *  1) 每个区块（climateRisks / regulations / ...）都有一个下拉 Select 来让用户标记它是 dependency / reference / strategy
 *  2) 区块内也可以自定义添加选项
 *  3) 最终我们把每个区块收集成一个 { values: string[], type: 'dependency'|'reference'|'strategy' } 的对象
 *  4) 通过 onChange 回传给父组件
 */
const DependencySelector = ({ onChange }) => {
  // 每个区块都用一个对象来管理 { values: string[], type: 'dependency' | 'reference' | 'strategy' }
  const [climateRisksData, setClimateRisksData] = useState({
    values: [],
    type: 'dependency',
  });
  const [regulationsData, setRegulationsData] = useState({
    values: [],
    type: 'dependency',
  });
  const [projectTypesData, setProjectTypesData] = useState({
    values: [],
    type: 'dependency',
  });
  const [environmentData, setEnvironmentData] = useState({
    values: [],
    type: 'dependency',
  });
  const [scaleData, setScaleData] = useState({
    values: [],
    type: 'dependency',
  });

  // 其他补充
  const [additional, setAdditional] = useState('');

  // 每个区块的“自定义输入”
  const [customInput, setCustomInput] = useState({
    climateRisk: '',
    regulation: '',
    projectType: '',
    environment: '',
    scale: '',
  });

  // 当任何状态变更时，都合并所有数据给父组件
  const prevDataRef = useRef();
  useEffect(() => {
    // 合并
    const newData = {
      climateRisks: climateRisksData, // { values, type }
      regulations: regulationsData,
      projectTypes: projectTypesData,
      environment: environmentData,
      scale: scaleData,
      additional, // 字符串
    };
    // 比较
    if (JSON.stringify(prevDataRef.current) !== JSON.stringify(newData)) {
      prevDataRef.current = newData;
      onChange?.(newData);
    }
  }, [
    climateRisksData,
    regulationsData,
    projectTypesData,
    environmentData,
    scaleData,
    additional,
    onChange,
  ]);

  // 处理固定选项的选择
  const handleCheckboxChange = (fieldKey, values) => {
    // fieldKey : 'climateRisks','regulations',...
    // values: [string, string...]
    switch (fieldKey) {
      case 'climateRisks':
        setClimateRisksData((prev) => ({ ...prev, values }));
        break;
      case 'regulations':
        setRegulationsData((prev) => ({ ...prev, values }));
        break;
      case 'projectTypes':
        setProjectTypesData((prev) => ({ ...prev, values }));
        break;
      case 'environment':
        setEnvironmentData((prev) => ({ ...prev, values }));
        break;
      case 'scale':
        setScaleData((prev) => ({ ...prev, values }));
        break;
      default:
        break;
    }
  };

  // 处理类型下拉切换
  const handleTypeChange = (fieldKey, newType) => {
    switch (fieldKey) {
      case 'climateRisks':
        setClimateRisksData((prev) => ({ ...prev, type: newType }));
        break;
      case 'regulations':
        setRegulationsData((prev) => ({ ...prev, type: newType }));
        break;
      case 'projectTypes':
        setProjectTypesData((prev) => ({ ...prev, type: newType }));
        break;
      case 'environment':
        setEnvironmentData((prev) => ({ ...prev, type: newType }));
        break;
      case 'scale':
        setScaleData((prev) => ({ ...prev, type: newType }));
        break;
      default:
        break;
    }
  };

  // 处理自定义输入
  const handleAddCustom = (fieldKey) => {
    const val = customInput[fieldKey]?.trim();
    if (!val) return;
    let newValues;
    switch (fieldKey) {
      case 'climateRisk':
        newValues = [...climateRisksData.values, val];
        setClimateRisksData((prev) => ({ ...prev, values: newValues }));
        break;
      case 'regulation':
        newValues = [...regulationsData.values, val];
        setRegulationsData((prev) => ({ ...prev, values: newValues }));
        break;
      case 'projectType':
        newValues = [...projectTypesData.values, val];
        setProjectTypesData((prev) => ({ ...prev, values: newValues }));
        break;
      case 'environment':
        newValues = [...environmentData.values, val];
        setEnvironmentData((prev) => ({ ...prev, values: newValues }));
        break;
      case 'scale':
        newValues = [...scaleData.values, val];
        setScaleData((prev) => ({ ...prev, values: newValues }));
        break;
      default:
        break;
    }
    setCustomInput({ ...customInput, [fieldKey]: '' });
  };

  return (
    <div>
      {/* ========== climateRisks ========== */}
      <h4>Climate Hazard(s)</h4>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Checkbox.Group
          options={climateRiskOptions}
          value={climateRisksData.values}
          onChange={(vals) => handleCheckboxChange('climateRisks', vals)}
        />
        <Select
          style={{ width: 120 }}
          value={climateRisksData.type}
          onChange={(val) => handleTypeChange('climateRisks', val)}
        >
          <Select.Option value="dependency">dep</Select.Option>
          <Select.Option value="reference">ref</Select.Option>
          <Select.Option value="strategy">str</Select.Option>
        </Select>
      </div>
      {/* 自定义输入 */}
      <div style={{ marginTop: 5 }}>
        <Input
          style={{ width: 200 }}
          placeholder="Add custom hazard"
          value={customInput.climateRisk}
          onChange={(e) =>
            setCustomInput({ ...customInput, climateRisk: e.target.value })
          }
          onPressEnter={() => handleAddCustom('climateRisk')}
        />
        <Button
          style={{ marginLeft: 5 }}
          onClick={() => handleAddCustom('climateRisk')}
        >
          Add
        </Button>
      </div>

      {/* ========== regulations ========== */}
      <h4 style={{ marginTop: 20 }}>Code/Regulatory Requirement</h4>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Checkbox.Group
          options={regulatoryOptions}
          value={regulationsData.values}
          onChange={(vals) => handleCheckboxChange('regulations', vals)}
        />
        <Select
          style={{ width: 120 }}
          value={regulationsData.type}
          onChange={(val) => handleTypeChange('regulations', val)}
        >
          <Select.Option value="dependency">dep</Select.Option>
          <Select.Option value="reference">ref</Select.Option>
          <Select.Option value="strategy">str</Select.Option>
        </Select>
      </div>
      <div style={{ marginTop: 5 }}>
        <Input
          style={{ width: 200 }}
          placeholder="Add custom regulation"
          value={customInput.regulation}
          onChange={(e) =>
            setCustomInput({ ...customInput, regulation: e.target.value })
          }
          onPressEnter={() => handleAddCustom('regulation')}
        />
        <Button
          style={{ marginLeft: 5 }}
          onClick={() => handleAddCustom('regulation')}
        >
          Add
        </Button>
      </div>

      {/* ========== projectTypes ========== */}
      <h4 style={{ marginTop: 20 }}>Project Type</h4>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Checkbox.Group
          options={projectTypeOptions}
          value={projectTypesData.values}
          onChange={(vals) => handleCheckboxChange('projectTypes', vals)}
        />
        <Select
          style={{ width: 120 }}
          value={projectTypesData.type}
          onChange={(val) => handleTypeChange('projectTypes', val)}
        >
          <Select.Option value="dependency">dep</Select.Option>
          <Select.Option value="reference">ref</Select.Option>
          <Select.Option value="strategy">str</Select.Option>
        </Select>
      </div>
      <div style={{ marginTop: 5 }}>
        <Input
          style={{ width: 200 }}
          placeholder="Add custom project type"
          value={customInput.projectType}
          onChange={(e) =>
            setCustomInput({ ...customInput, projectType: e.target.value })
          }
          onPressEnter={() => handleAddCustom('projectType')}
        />
        <Button
          style={{ marginLeft: 5 }}
          onClick={() => handleAddCustom('projectType')}
        >
          Add
        </Button>
      </div>

      {/* ========== environment ========== */}
      <h4 style={{ marginTop: 20 }}>Project Geolocation</h4>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Checkbox.Group
          options={environmentOptions}
          value={environmentData.values}
          onChange={(vals) => handleCheckboxChange('environment', vals)}
        />
        <Select
          style={{ width: 120 }}
          value={environmentData.type}
          onChange={(val) => handleTypeChange('environment', val)}
        >
          <Select.Option value="dependency">dep</Select.Option>
          <Select.Option value="reference">ref</Select.Option>
          <Select.Option value="strategy">str</Select.Option>
        </Select>
      </div>
      <div style={{ marginTop: 5 }}>
        <Input
          style={{ width: 200 }}
          placeholder="Add custom environment"
          value={customInput.environment}
          onChange={(e) =>
            setCustomInput({ ...customInput, environment: e.target.value })
          }
          onPressEnter={() => handleAddCustom('environment')}
        />
        <Button
          style={{ marginLeft: 5 }}
          onClick={() => handleAddCustom('environment')}
        >
          Add
        </Button>
      </div>

      {/* ========== scale ========== */}
      <h4 style={{ marginTop: 20 }}>Project Scale</h4>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Checkbox.Group
          options={scaleOptions}
          value={scaleData.values}
          onChange={(vals) => handleCheckboxChange('scale', vals)}
        />
        <Select
          style={{ width: 120 }}
          value={scaleData.type}
          onChange={(val) => handleTypeChange('scale', val)}
        >
          <Select.Option value="dependency">dep</Select.Option>
          <Select.Option value="reference">ref</Select.Option>
          <Select.Option value="strategy">str</Select.Option>
        </Select>
      </div>
      <div style={{ marginTop: 5 }}>
        <Input
          style={{ width: 200 }}
          placeholder="Add custom scale"
          value={customInput.scale}
          onChange={(e) =>
            setCustomInput({ ...customInput, scale: e.target.value })
          }
          onPressEnter={() => handleAddCustom('scale')}
        />
        <Button
          style={{ marginLeft: 5 }}
          onClick={() => handleAddCustom('scale')}
        >
          Add
        </Button>
      </div>

      {/* ========== Other ========== */}
      <h4 style={{ marginTop: 20 }}>Other</h4>
      <TextArea
        rows={3}
        placeholder="e.g. budget limited, time sensitive, etc."
        value={additional}
        onChange={(e) => setAdditional(e.target.value)}
      />
    </div>
  );
};

export default DependencySelector;
