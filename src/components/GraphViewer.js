// src/components/GraphViewer.js
import React, { useMemo } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';

/**
 * GraphViewer
 * @param {object} props.graphData  格式 { nodes: [ {id,label,type}, ... ], edges: [ {source, target, relation}, ... ] }
 */
const GraphViewer = ({ graphData }) => {
  // 将 graphData 转成 cytoscape 需要的 elements
  // elements: [{ data:{id,label} }, { data:{id,source,target}, }, ...]
  const elements = useMemo(() => {
    if (!graphData || !graphData.nodes) return [];

    const nodeElements = graphData.nodes.map((n) => ({
      data: { id: n.id, label: n.label, type: n.type },
    }));

    const edgeElements = graphData.edges.map((e, index) => ({
      data: {
        id: `edge-${index}`,
        source: e.source,
        target: e.target,
        label: e.relation,
      },
    }));

    return [...nodeElements, ...edgeElements];
  }, [graphData]);

  const layout = { name: 'cose', animate: true };

  // ====== 这里是关键，增加对 frameworkDimension 的样式 ======
  const stylesheet = [
    {
      selector: 'node',
      style: {
        'background-color': '#678',
        label: 'data(label)',
        'font-size': 12,
        'text-wrap': 'wrap',
        'text-max-width': '80px',
      },
    },
    {
      selector: 'node[type="strategy"]',
      style: {
        'background-color': '#1f77b4',
        shape: 'round-rectangle',
      },
    },
    {
      selector: 'node[type="dependency"]',
      style: {
        'background-color': '#ff7f0e',
      },
    },
    {
      selector: 'node[type="reference"]',
      style: {
        'background-color': '#2ca02c',
      },
    },
    {
      // 新增: 匹配后端返回的 frameworkDimension 节点
      selector: 'node[type="frameworkDimension"]',
      style: {
        'background-color': '#9467bd',
        shape: 'diamond',
      },
    },
    {
      selector: 'edge',
      style: {
        'line-color': '#999',
        'target-arrow-color': '#999',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        label: 'data(label)',
        'font-size': 10,
        'text-background-color': '#fff',
        'text-background-opacity': 1,
      },
    },
  ];

  return (
    <div style={{ width: '100%', height: '800px', border: '1px solid #ccc' }}>
      <CytoscapeComponent
        elements={elements}
        style={{ width: '100%', height: '100%' }}
        layout={layout}
        stylesheet={stylesheet}
      />
    </div>
  );
};

export default GraphViewer;
