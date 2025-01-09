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
import ForceGraph3D from 'react-force-graph-3d';
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
function fadeByDistance(dist, maxDist = 1000) {
  // method 1
  // const ratio = 1 - dist / maxDist;
  // if (ratio < 0) return 0;
  // if (ratio > 1) return 1;

  // method 2
  // let ratio = 1 - dist / maxDist;
  // ratio = Math.min(Math.max(ratio, 0), 1);
  // ratio = ratio ** 3;

  // method 3
  // const ratio = Math.exp(-Math.log(2) * (dist / 500));

  // method 4
  const d0 = 350; // 中心位置
  const k = 0.1; // 陡峭度
  const ratio = 0.2 + 1 / (1 + Math.exp(k * (dist - d0)));
  console.log(ratio);
  // if (ratio > 1) return 1;
  // console.log(dist);
  // console.log(maxDist);
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
function computeNodeDegrees(graphData) {
  if (!graphData?.nodes || !graphData?.edges) return graphData;
  graphData.nodes.forEach((n) => {
    n.degree = 0;
  });
  graphData.edges.forEach((edge) => {
    const sNode = graphData.nodes.find((n) => n.id === edge.source);
    if (sNode) sNode.degree++;
    const tNode = graphData.nodes.find((n) => n.id === edge.target);
    if (tNode) tNode.degree++;
  });
  return graphData;
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
  const fgRef = useRef(null);
  // 在初始化或 graphData 变化后，先计算节点度
  useEffect(() => {
    if (!graphData?.nodes?.length) return;
    computeNodeDegrees(graphData);
  }, [graphData]);

  // 在初始时给每个 node 做 sphere + text sprite
  const nodeThreeObject = useCallback((node) => {
    const mainColor = getTypeColor(node.type) || '#888888';
    // const radius = 1.0 + Math.log2((node.degree || 1) + 1);
    // node.degree 如果没设置，先默认0
    const deg = node.degree || 0;
    // console.log(deg);
    // 例如把 radius = 1 + sqrt(deg) (可随你需要)
    const radius = (0.1 + Math.sqrt(deg)) * 1;

    // 创建球体
    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    const material = new THREE.MeshLambertMaterial({
      color: mainColor,
      transparent: true, // 允许后续动态修改透明度
      opacity: 1,
    });
    const sphere = new THREE.Mesh(geometry, material);

    // 创建文字 Sprite（贴图）
    if (node.label) {
      // 文字颜色可做一下加亮
      const textColor = lightenColor(mainColor, 0.5);
      const sprite = makeTextSprite(node.label, {
        fontsize: 40,
        color: textColor,
        align: 'left',
      });
      // 把文字略微放在球体上方
      sprite.position.set(0, radius + 0.5, 0);
      sphere.add(sprite); // 让文字跟随球体
    }

    return sphere;
  }, []);

  // 2) 每帧执行：遍历 nodes，对远处节点做 fade
  const handleEngineTick = useCallback(() => {
    if (!fgRef.current) return;
    const fgInstance = fgRef.current;

    // 访问 camera
    const camera = fgInstance.camera();
    if (!camera || !graphData?.nodes) return;

    // 直接使用 graphData.nodes，而不是 fgInstance.graphData()
    graphData.nodes.forEach((node) => {
      const nodeObj = node.__threeObj;
      if (!nodeObj) return;

      // 算出节点世界坐标
      const worldPos = new THREE.Vector3();
      nodeObj.getWorldPosition(worldPos);
      const dist = camera.position.distanceTo(worldPos);

      // 根据距离计算透明度
      const fadeRatio = fadeByDistance(dist, 1000);

      // 设置球体和文字 sprite 的透明度
      if (nodeObj.material) {
        nodeObj.material.opacity = fadeRatio;
      }
      nodeObj.children.forEach((child) => {
        if (child.material) {
          child.material.opacity = fadeRatio;
        }
      });
    });
  }, [graphData]);

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <ForceGraph3D
        ref={fgRef}
        graphData={{
          nodes: graphData.nodes,
          links: graphData.edges.map((e) => ({
            source: e.source,
            target: e.target,
            rel: e.relation,
          })),
        }}
        nodeThreeObject={nodeThreeObject}
        // 1) 让连线是曲线
        linkCurvature={0.3} // 可以调大/小
        linkCurveRotation={0}
        // 2) 边的颜色/箭头
        linkAutoColorBy="rel"
        linkDirectionalArrowLength={3}
        linkDirectionalArrowRelPos={1}
        linkOpacity={0.8}
        linkWidth={1}
        // 3) 每帧执行, 更新节点明暗
        onEngineTick={handleEngineTick}
        // 其他可选
        showNavInfo={false}
        backgroundColor="#111111" // 深色背景
        enableNodeDrag={true}
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
