// src/components/GraphViewer.js
import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import * as d3 from 'd3';
import * as THREE from 'three';
import { ForceGraph3D } from 'react-force-graph';
import ReactEChartsCore from 'echarts-for-react';
import * as echarts from 'echarts/core';
import { GraphChart } from 'echarts/charts';
import { TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
echarts.use([GraphChart, TooltipComponent, LegendComponent, CanvasRenderer]);
/**
 * GraphViewer
 * @param {object} props.graphData  格式 { nodes: [ {id,label,type}, ... ], edges: [ {source, target, relation}, ... ] }
 */
/**
 * 一个小函数，用于把文本生成 Sprite:
 * - fontsize: 字体大小
 * - color: 字体颜色
 */
function makeTextSprite(message, { fontsize = 70, color = '#ffffff' } = {}) {
  // 1) 创建一个离屏 canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = `${fontsize}px sans-serif`;
  ctx.font = font;

  // 2) 计算文本尺寸，设置canvas
  const textWidth = ctx.measureText(message).width;
  canvas.width = textWidth;
  // 给字体预留上下一点空间
  canvas.height = fontsize * 1.2;

  // 3) 再次设定字体 & 绘制
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.fillText(message, 0, fontsize);

  // 4) 贴图
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter; // 避免模糊

  // 5) 用 sprite material
  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
  });
  const sprite = new THREE.Sprite(spriteMaterial);

  // 把sprite的中心移动到左下角
  // 也可以按需要调节 sprite.scale
  sprite.scale.set(0.1 * canvas.width, 0.1 * canvas.height, 1);

  return sprite;
}
function GraphViewerCytoscape({ graphData }) {
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
}
function GraphViewerD3Force({ graphData }) {
  const svgRef = useRef(null);
  const width = 400,
    height = 400;

  useEffect(() => {
    if (!graphData || !graphData.nodes?.length) return;

    const svgEl = d3.select(svgRef.current);
    svgEl.selectAll('*').remove(); // clear old

    // Convert edges to d3-friendly format
    const links = graphData.edges.map((e) => ({
      source: e.source,
      target: e.target,
    }));
    const nodes = graphData.nodes.map((n) => ({ ...n }));

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance(50)
      )
      .force('charge', d3.forceManyBody().strength(-100))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const linkGroup = svgEl.append('g').attr('stroke', '#999');
    const linkElems = linkGroup
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke-width', 1.5);

    const nodeGroup = svgEl
      .append('g')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5);
    const nodeElems = nodeGroup
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', 10)
      .attr('fill', '#1f77b4')
      .call(
        d3
          .drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
      );

    const labelElems = nodeGroup
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .attr('x', 12)
      .attr('y', '0.31em')
      .text((d) => d.label || d.id)
      .style('font-size', '10px');

    simulation.on('tick', () => {
      linkElems
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      nodeElems.attr('cx', (d) => d.x).attr('cy', (d) => d.y);

      labelElems.attr('x', (d) => d.x + 12).attr('y', (d) => d.y);
    });

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [graphData]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ border: '1px solid #ccc' }}
    ></svg>
  );
}
function GraphViewerReactForceGraph({ graphData }) {
  const fgRef = useRef();

  // 1) 如果后端没算 degree，可以在前端算一次
  useEffect(() => {
    if (!graphData?.nodes || !graphData?.edges) return;
    // reset
    graphData.nodes.forEach((n) => (n.degree = 0));
    graphData.edges.forEach((e) => {
      const src = graphData.nodes.find((n) => n.id === e.source);
      const tgt = graphData.nodes.find((n) => n.id === e.target);
      if (src) src.degree = (src.degree || 0) + 1;
      if (tgt) tgt.degree = (tgt.degree || 0) + 1;
    });
  }, [graphData]);

  // 2) nodeThreeObject: 绘制(球体 + 文字sprite)
  const nodeThreeObject = useCallback((node) => {
    // (a) 做一个球
    const radius = 1 + Math.log2(node.degree + 1);
    // 这里用 log2 给高连接度节点更大，但不至于过度膨胀
    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    // 你可根据 node 的 type/degree 设定不同颜色
    const color = node.color
      ? node.color
      : '#' + Math.floor(Math.random() * 16777215).toString(16);
    const material = new THREE.MeshLambertMaterial({ color });
    const sphere = new THREE.Mesh(geometry, material);

    // (b) 创建文字 sprite
    // 如果你要过滤空文本/过长文本，可加逻辑
    if (node.label) {
      const sprite = makeTextSprite(node.label, {
        fontsize: 60, // 可调
        color: '#ffffff', // 字体颜色
      });
      // 把文字放在球体上方
      sprite.position.set(0, radius + 0.5, 0);
      sphere.add(sprite);
    }

    return sphere;
  }, []);

  // 3) linkAutoColorBy => 用 link.relation 的不同值区分颜色
  //    也可以 linkColor={(link) => ...} 自定义
  //    这里做最简单的 multi-color
  // 4) nodeAutoColorBy => 若节点无自定义颜色，也可以
  //    nodeAutoColorBy="type"

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <ForceGraph3D
        ref={fgRef}
        backgroundColor="#000000" // 黑色背景
        graphData={{
          nodes: graphData.nodes,
          links: graphData.edges.map((e) => ({
            source: e.source,
            target: e.target,
            rel: e.relation,
          })),
        }}
        nodeThreeObject={nodeThreeObject} // 自定义节点
        linkAutoColorBy={(link) => link.rel} // 根据 relation 上色
        linkDirectionalArrowLength={3}
        linkDirectionalArrowRelPos={1}
        linkWidth={1.2}
        linkOpacity={0.9}
        showNavInfo={false} // 不显示右上角 help
        // 如果想让节点可拖拽:
        enableNodeDrag={true}
        // force engine param:
        warmupTicks={100}
        coolDownTime={3000}
        // ...
        onNodeClick={(node) => console.log('Node clicked:', node)}
        onLinkClick={(link) => console.log('Link clicked:', link)}
      />
    </div>
  );
}
function GraphViewerECharts({ graphData }) {
  // convert to ECharts 'graph' series
  const option = {
    title: { text: 'ECharts Graph' },
    tooltip: {},
    legend: [{ data: ['Graph'] }],
    series: [
      {
        name: 'Graph',
        type: 'graph',
        layout: 'force',
        roam: true,
        force: {
          repulsion: 80,
          gravity: 0.02,
        },
        data: graphData.nodes.map((n) => ({
          name: n.id,
          value: n.label,
          category: n.type, // or something
          symbolSize: 30,
        })),
        links: graphData.edges.map((e) => ({
          source: e.source,
          target: e.target,
          label: { formatter: e.relation },
        })),
        edgeSymbol: ['none', 'arrow'],
        emphasis: { focus: 'adjacency' },
      },
    ],
  };

  return (
    <div style={{ width: 600, height: 400 }}>
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
/**
 * 【对外导出的主组件】GraphViewer
 *  - 接受 props: { graphData, library }
 *  - library 可选: "cytoscape" | "d3-force" | "react-force-graph" | "sigma" | "echarts" | "visx"
 */
export default function GraphViewer({ graphData, library = 'cytoscape' }) {
  switch (library) {
    case 'cytoscape':
      return <GraphViewerCytoscape graphData={graphData} />;
    case 'd3':
      return <GraphViewerD3Force graphData={graphData} />;
    case 'force3d':
      return <GraphViewerReactForceGraph graphData={graphData} />;
    case 'echarts':
      return <GraphViewerECharts graphData={graphData} />;
    default:
      return <div>No library selected or unsupported: {library}</div>;
  }
}
