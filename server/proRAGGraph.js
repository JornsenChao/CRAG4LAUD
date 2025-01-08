// server/proRAGGraph.js

import { loadFrameworkData } from './frameworks/frameworkManager.js';
// 如果你想做 embedding，就 import { OpenAIEmbeddings }... 并写相似度函数

/**
 * buildGraphDataFromDocs(docs, frameworkName)
 * @param {Array} docs - 前端传递过来的文档数组，形如 [{pageContent, metadata: {...}}, ...]
 * @param {string} frameworkName - 用户选的框架，比如 'AIA'，或空
 * @returns {object} { nodes, edges }
 */
export async function buildGraphDataFromDocs(docs, frameworkName) {
  const nodesMap = {};
  const edges = [];

  // 1) 如果 docs 为空，直接返回空图
  if (!docs || docs.length === 0) {
    return { nodes: [], edges: [] };
  }

  // 2) 如果有 frameworkName，就加载
  let frameworkData = null;
  if (frameworkName) {
    frameworkData = loadFrameworkData(frameworkName);
    if (!frameworkData) {
      console.log(`[Graph] framework "${frameworkName}" not found or empty`);
    }
  }

  // 3) 遍历 docs
  docs.forEach((doc, idx) => {
    // Strategy node
    const strategyId = `strategy-${idx}`;
    const strategyLabel = doc.pageContent.slice(0, 50).replace(/\n/g, ' ');
    if (!nodesMap[strategyId]) {
      nodesMap[strategyId] = {
        id: strategyId,
        label: strategyLabel,
        type: 'strategy',
      };
    }

    // Dependency
    const depVal = doc.metadata?.dependency || '';
    const depArr = depVal
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    depArr.forEach((dep) => {
      const depId = `dependency-${dep}`;
      if (!nodesMap[depId]) {
        nodesMap[depId] = {
          id: depId,
          label: dep,
          type: 'dependency',
        };
      }
      edges.push({
        source: strategyId,
        target: depId,
        relation: 'addresses',
      });
    });

    // Reference
    const refVal = doc.metadata?.reference || '';
    const refArr = refVal
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    refArr.forEach((ref) => {
      const refId = `reference-${ref}`;
      if (!nodesMap[refId]) {
        nodesMap[refId] = {
          id: refId,
          label: ref,
          type: 'reference',
        };
      }
      edges.push({
        source: strategyId,
        target: refId,
        relation: 'references',
      });
    });

    // 4) 若有 Framework，就做关键字匹配（示例）
    if (frameworkData && frameworkData.dimensions) {
      const lowerText = doc.pageContent.toLowerCase();
      frameworkData.dimensions.forEach((dim) => {
        // 若 dimension 的某些 keyword 出现在 strategy 里，就连接
        const hits = dim.keywords.filter((kw) =>
          lowerText.includes(kw.toLowerCase())
        );
        if (hits.length > 0) {
          // create dimension node
          const dimId = `framework-${dim.id}`;
          if (!nodesMap[dimId]) {
            nodesMap[dimId] = {
              id: dimId,
              label: dim.name,
              type: 'frameworkDimension',
            };
          }
          edges.push({
            source: strategyId,
            target: dimId,
            relation: 'alignedWith',
          });
        }
      });
    }
  });

  // 5) 返回
  return {
    nodes: Object.values(nodesMap),
    edges,
  };
}
