// src/components/DependencySelector.js
import React, { useState } from 'react';
import { Checkbox, Select, Input } from 'antd';

const { TextArea } = Input;

// 你可以根据实际需要，把各个选项写成数组，也可从服务端获取
const climateRiskOptions = [
  { label: '洪涝', value: 'flooding' },
  { label: '干旱', value: 'drought' },
  { label: '极端高温', value: 'heatwave' },
  { label: '海平面上升', value: 'sea level rise' },
];

const regulatoryOptions = [
  { label: '建筑高度限制', value: 'height limit' },
  { label: '湿地保护区', value: 'wetland' },
  { label: '饮用水源地保护', value: 'drinking water source' },
];

// 更多示例
const projectTypeOptions = [
  { label: '公共建筑', value: 'public building' },
  { label: '居住区', value: 'residential' },
  { label: '商业综合体', value: 'commercial complex' },
];

const environmentOptions = [
  { label: '沿海', value: 'coastal' },
  { label: '内陆', value: 'inland' },
  { label: '山地', value: 'mountain' },
];

const scaleOptions = [
  { label: '小型场地', value: 'small-scale site' },
  { label: '中型场地', value: 'medium-scale site' },
  { label: '大型区域', value: 'large-scale region' },
];

/**
 * DependencySelector
 * @param {function} onChange - 父组件传入的回调，用于获取用户选择的依赖项信息
 */
const DependencySelector = ({ onChange }) => {
  // 本组件内部管理五类选项，以及一个额外文本框
  const [climateRisks, setClimateRisks] = useState([]);
  const [regulations, setRegulations] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [environment, setEnvironment] = useState([]);
  const [scale, setScale] = useState([]);
  const [additional, setAdditional] = useState('');

  // 每次用户有任何变动，汇总成一个对象，通过 onChange 向父组件输出
  const emitChange = () => {
    const dependencyData = {
      climateRisks, // array
      regulations, // array
      projectTypes, // array
      environment, // array
      scale, // array
      additional, // string
    };
    onChange?.(dependencyData);
  };

  // 你也可以用 useEffect 监听任一状态变化，然后自动 emitChange
  // 这里为了简单，所有 setState 以后都手动调用一次 emitChange
  const handleClimateChange = (vals) => {
    setClimateRisks(vals);
    emitChange();
  };
  const handleRegulationsChange = (vals) => {
    setRegulations(vals);
    emitChange();
  };
  const handleProjectTypeChange = (vals) => {
    setProjectTypes(vals);
    emitChange();
  };
  const handleEnvironmentChange = (vals) => {
    setEnvironment(vals);
    emitChange();
  };
  const handleScaleChange = (vals) => {
    setScale(vals);
    emitChange();
  };
  const handleAdditionalChange = (e) => {
    setAdditional(e.target.value);
    emitChange();
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <h4>Climate Hazard(s)</h4>
      <Checkbox.Group
        options={climateRiskOptions}
        value={climateRisks}
        onChange={handleClimateChange}
      />

      <h4 style={{ marginTop: 20 }}>Code/Regulatory Requirement</h4>
      <Checkbox.Group
        options={regulatoryOptions}
        value={regulations}
        onChange={handleRegulationsChange}
      />

      <h4 style={{ marginTop: 20 }}>Project Type</h4>
      <Checkbox.Group
        options={projectTypeOptions}
        value={projectTypes}
        onChange={handleProjectTypeChange}
      />

      <h4 style={{ marginTop: 20 }}>Project Geolocation</h4>
      <Checkbox.Group
        options={environmentOptions}
        value={environment}
        onChange={handleEnvironmentChange}
      />

      <h4 style={{ marginTop: 20 }}>Proejct Scale</h4>
      <Checkbox.Group
        options={scaleOptions}
        value={scale}
        onChange={handleScaleChange}
      />

      <h4 style={{ marginTop: 20 }}>Other</h4>
      <TextArea
        rows={3}
        placeholder="e.g. budget limited, coastal area, time sensitive, etc."
        value={additional}
        onChange={handleAdditionalChange}
      />
    </div>
  );
};

export default DependencySelector;
