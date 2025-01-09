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
 * 辅助：为给定 colorHex 调整亮度 (lighten)
 * 可以用 HSL、也可以用简单 RGB
 */
function lightenColor(hex, percent = 0.3) {
  // parse #RRGGBB
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);

  // lighten
  r = Math.round(r + (255 - r) * percent);
  g = Math.round(g + (255 - g) * percent);
  b = Math.round(b + (255 - b) * percent);

  // clamp
  if (r > 255) r = 255;
  if (g > 255) g = 255;
  if (b > 255) b = 255;

  // to hex
  const rr = r.toString(16).padStart(2, '0');
  const gg = g.toString(16).padStart(2, '0');
  const bb = b.toString(16).padStart(2, '0');
  return `#${rr}${gg}${bb}`;
}

/**
 * 每种 type 都有一个主色
 */
const TYPE_COLORS = {
  strategy: '#1f77b4', // 蓝
  dependency: '#ff7f0e', // 橙
  reference: '#2ca02c', // 绿
  frameworkDimension: '#9467bd', // 紫
};

/**
 * 如果没有匹配，就用灰色
 */
function getTypeColor(type) {
  return TYPE_COLORS[type] || '#cccccc';
}
// 一个辅助: 根据距离返回 0~1 的衰减值
// dist=0 => 1, dist>=maxDist => 0
function fadeByDistance(dist, maxDist = 100) {
  const ratio = 1 - dist / maxDist;
  if (ratio < 0) return 0;
  if (ratio > 1) return 1;
  return ratio;
}

/**
 * makeTextSprite: 用指定 color 画出文字贴图
 */
function makeTextSprite(message, { fontsize = 70, color = '#ffffff' } = {}) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = `${fontsize}px sans-serif`;
  ctx.font = font;

  const textWidth = ctx.measureText(message).width;
  canvas.width = textWidth;
  canvas.height = fontsize * 1.2;

  ctx.font = font;
  ctx.fillStyle = color;
  ctx.fillText(message, 0, fontsize);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
  });

  const sprite = new THREE.Sprite(spriteMaterial);
  // scale
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

  // 先前的 degree 计算
  useEffect(() => {
    if (!graphData?.nodes || !graphData?.edges) return;
    graphData.nodes.forEach((n) => (n.degree = 0));
    graphData.edges.forEach((e) => {
      const s = graphData.nodes.find((n) => n.id === e.source);
      const t = graphData.nodes.find((n) => n.id === e.target);
      if (s) s.degree = (s.degree || 0) + 1;
      if (t) t.degree = (t.degree || 0) + 1;
    });
  }, [graphData]);

  // nodeThreeObject
  const nodeThreeObject = useCallback((node) => {
    // 1) 获取主色
    const mainColor = getTypeColor(node.type);

    // 2) 节点大小
    const radius = 1 + Math.log2((node.degree || 1) + 1);

    // 3) 创建球体
    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    // 球体颜色 = mainColor
    const material = new THREE.MeshLambertMaterial({ color: mainColor });
    const sphere = new THREE.Mesh(geometry, material);

    // 4) 加文字: 文字颜色 = lighten(mainColor)
    if (node.label) {
      const textColor = lightenColor(mainColor, 0.5);
      // 提亮 50%
      const sprite = makeTextSprite(node.label, {
        fontsize: 60,
        color: textColor,
      });
      sprite.position.set(0, radius + 0.5, 0);
      sphere.add(sprite);
    }

    return sphere;
  }, []);

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <ForceGraph3D
        ref={fgRef}
        backgroundColor="#000000"
        // 不一定要雾化，这里先注释
        // onInit={(threeObj)=>{ threeObj.scene.fog = new THREE.FogExp2(0x000000, 0.015); }}
        graphData={{
          nodes: graphData.nodes,
          links: graphData.edges.map((e) => ({
            source: e.source,
            target: e.target,
            rel: e.relation,
          })),
        }}
        nodeThreeObject={nodeThreeObject}
        linkAutoColorBy={(link) => link.rel}
        linkDirectionalArrowLength={3}
        linkDirectionalArrowRelPos={1}
        linkWidth={1.2}
        linkOpacity={0.9}
        enableNodeDrag={true}
        showNavInfo={false}
        warmupTicks={100}
        coolDownTime={2000}
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
