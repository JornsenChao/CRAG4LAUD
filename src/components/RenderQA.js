import React from 'react';
import { Spin } from 'antd';

const RenderQA = ({ conversation, isLoading }) => {
  return (
    <>
      {conversation?.map((each, idx) => (
        <div key={idx} style={{ marginBottom: '10px' }}>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                display: 'inline-block',
                maxWidth: '50%',
                backgroundColor: '#1677FF',
                color: 'white',
                padding: '10px',
                borderRadius: '10px',
                marginBottom: '4px',
              }}
            >
              {each.question}
            </div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div
              style={{
                display: 'inline-block',
                maxWidth: '50%',
                backgroundColor: '#F9F9FE',
                color: 'black',
                padding: '10px',
                borderRadius: '10px',
                marginBottom: '4px',
              }}
            >
              {typeof each.answer === 'string'
                ? each.answer
                : JSON.stringify(each.answer)}
            </div>
          </div>
        </div>
      ))}
      {isLoading && <Spin style={{ marginTop: 10 }} />}
    </>
  );
};

export default RenderQA;
