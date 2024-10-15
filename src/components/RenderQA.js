import React from "react";
import { Spin } from "antd";

const containerStyle = {
  display: "flex",
  justifyContent: "space-between",
  flexDirection: "column",
  marginBottom: "20px",
};

const userContainer = {
  textAlign: "right",
};

const agentContainer = {
  textAlign: "left",
};

const userStyle = {
  maxWidth: "50%",
  textAlign: "left",
  backgroundColor: "#1677FF",
  color: "white",
  display: "inline-block",
  borderRadius: "10px",
  padding: "10px",
  marginBottom: "10px",
};

const agentStyle = {
  maxWidth: "50%",
  textAlign: "left",
  backgroundColor: "#F9F9FE",
  color: "black",
  display: "inline-block",
  borderRadius: "10px",
  padding: "10px",
  marginBottom: "10px",
};

// RenderQA 在 App.js 中被调用，得到两个传入的参数：conversation, isLoading
// conversation 是 对话（一问一答作为一个元素）array，在 App.js 中被创建
// isLoading 是 App.js 中被创建的 状态
const RenderQA = (props) => {
  // conversation：包含问答对话的数组，每个元素包含 question 和 answer 属性。
  // isLoading：表示加载状态，正在请求时显示加载动画。
  const { conversation, isLoading } = props;

  return (
    // 遍历 conversation 数组，生成每个问答对话的 HTML 结构
    <>
      {conversation?.map((each, index) => {
        return (
          <div key={index} style={containerStyle}>
            <div style={userContainer}>
              <div style={userStyle}>{each.question}</div>
            </div>
            <div style={agentContainer}>
              <div style={agentStyle}>{each.answer}</div>
            </div>
          </div>
        );
      })}
      {isLoading && <Spin size="large" style={{ margin: "10px" }} />}
    </>
  );
};

export default RenderQA;
