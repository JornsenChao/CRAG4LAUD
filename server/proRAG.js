// server/proRAG.js

import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { PromptTemplate } from 'langchain/prompts';
import { RetrievalQAChain } from 'langchain/chains';
import { Document } from 'langchain/document';

// import { loadFrameworkData } from './frameworks/frameworkManager.js';

// 用于获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * proRAGStores 包含两部分：columnMap 和 vectorStoreMap
 * - columnMap[fileKey]：记录用户在前端映射了哪些列为 dependencyCol、strategyCol、referenceCol
 * - vectorStoreMap[fileKey]：记录已构建好的 MemoryVectorStore 实例
 */
export const proRAGStores = {
  columnMap: {},
  vectorStoreMap: {},
};

/**
 * parseTable(filePath):
 *  - 根据文件扩展名 (xlsx, csv, 等) 解析成 JS 对象数组
 */
function parseTable(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  let records = [];

  if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    records = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  } else {
    throw new Error(`Unsupported file type: ${ext}`);
  }

  return records;
}

/**
 * buildProRAGStore(filePath, fileKey, columnMap):
 *  - 读取表格并解析成 records
 *  - 根据 columnMap 把 strategyCol 的文本合并到 pageContent，把 dependencyCol / referenceCol 的文本合并到 metadata
 *  - 用 OpenAIEmbeddings 嵌入后存储到 MemoryVectorStore
 *  - 存到 proRAGStores.vectorStoreMap[fileKey]
 */
export async function buildProRAGStore(filePath, fileKey, columnMap) {
  const records = parseTable(filePath);

  // 将表格中的每一行转成一个 Document
  // 这里简化处理：将 strategyCol 对应的列文本合并到 pageContent；dependencyCol, referenceCol 合并到 metadata。
  const docs = [];
  for (const row of records) {
    // 多列合并
    const strategyText = columnMap.strategyCol
      .map((col) => (row[col] || '').toString())
      .join('\n')
      .trim();

    const dependencyVal = columnMap.dependencyCol
      .map((col) => (row[col] || '').toString())
      .join(', ')
      .trim();

    const referenceVal = columnMap.referenceCol
      .map((col) => (row[col] || '').toString())
      .join(', ')
      .trim();

    // 构造 Document
    const doc = new Document({
      pageContent: strategyText,
      metadata: {
        dependency: dependencyVal,
        reference: referenceVal,
      },
    });

    docs.push(doc);
  }

  // 构建向量索引 (MemoryVectorStore)
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const memoryStore = await MemoryVectorStore.fromDocuments(docs, embeddings);

  // 保存到全局
  proRAGStores.vectorStoreMap[fileKey] = memoryStore;
  proRAGStores.columnMap[fileKey] = columnMap;

  console.log(
    `[ProRAG] store built for fileKey=${fileKey}, docCount=${docs.length}`
  );
}
/**
 * 新增: matchFrameworkDimensions() 函数
 * @param {string} text - Strategy的内容
 * @param {Array} dims - e.g. [ {id, name, keywords, description}, ... ]
 * @returns {Array} 命中的维度对象
 */
function matchFrameworkDimensions(text, dims) {
  const lowerText = text.toLowerCase();
  const matched = [];
  for (const dim of dims) {
    // 如果keywords里有任意一个匹配到，就算命中
    const hits = dim.keywords.filter((kw) =>
      lowerText.includes(kw.toLowerCase())
    );
    if (hits.length > 0) {
      matched.push(dim);
    }
  }
  return matched;
}
/**
 * 1) 计算 embeddings:
 *   - 对每个 dimension: 维度名称 + 描述 => 向量
 *   - 对每个 doc: pageContent => 向量
 *   - 对比相似度 => 过阈值即匹配
 *
 * @param {string} text  - Strategy的正文
 * @param {Array} dims   - [{id, name, description, ...}, ...]
 * @param {object} embedder - langchain embeddings实例 (OpenAIEmbeddings 或其他)
 * @param {number} threshold - 相似度阈值 (0~1之间, 可以调试)
 * @returns {Array} matchedDims - 返回匹配到的所有 dimension 对象
 */
async function semanticMatchFrameworkDimensions(
  text,
  dims,
  embedder,
  threshold = 0.78
) {
  if (!dims || dims.length === 0) return [];

  // 1) 为当前 doc 的文本生成 embedding
  const docVector = await embedder.embedQuery(text);

  // 2) 逐个与 dimension 的 embedding 做余弦相似度
  const matched = [];
  for (const dim of dims) {
    // 如果 dimension 没预先算好 embedding，就算一下
    if (!dim._embedding) {
      const dimText = dim.name + '. ' + (dim.description || '');
      dim._embedding = await embedder.embedQuery(dimText);
    }
    // 计算相似度
    const score = cosineSimilarity(docVector, dim._embedding);
    if (score >= threshold) {
      matched.push(dim);
    }
  }
  return matched;
}

/**
 * 2) 计算向量余弦相似度 (简单实现)
 */
function cosineSimilarity(vecA, vecB) {
  // vecA, vecB 是等长数组
  let dot = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
// ============== 2) 辅助函数：把 docs 转成图数据 ==============
function buildGraphDataFromDocs(docs, selectedFramework) {
  /**
   * 让每条doc => Strategy Node
   * doc.metadata.dependency => Dependency Node(s)
   * doc.metadata.reference => Reference Node(s)
   * edges:
   *   Strategy --(addresses)--> Dependency
   *   Strategy --(references)--> Reference
   *
   * 为了去重，我们用一个 Map / dict 来存已经出现的节点
   */

  const nodesMap = {}; // key: "type:label", value: { id, label, type }
  const edges = [];
  // 如果有 selectedFramework，就尝试加载
  let frameworkData = null;
  if (selectedFramework) {
    frameworkData = loadFrameworkData(selectedFramework);
    if (!frameworkData) {
      console.log(
        `[ProRAG] framework "${selectedFramework}" not found. Skipping...`
      );
    } else {
      console.log(`[ProRAG] using framework "${selectedFramework}"`);
      console.log('selectedFramework:', selectedFramework);
      console.log('frameworkData:', frameworkData);
    }
  }

  docs.forEach((doc, idx) => {
    if (!doc) {
      console.log('Warning: one doc is null at index', idx);
      return; // 跳过
    }
    // 1) Strategy node
    const strategyLabel =
      doc.pageContent.slice(0, 80).replace(/\n/g, ' ') ||
      `Strategy #${idx + 1}`;
    // 生成唯一ID
    const strategyId = `strategy-${idx}`;
    // 存入 nodesMap
    if (!nodesMap[strategyId]) {
      nodesMap[strategyId] = {
        id: strategyId,
        label: strategyLabel,
        type: 'strategy',
      };
    }

    // 2) Dependency
    // 可能有多个, 用逗号拆分
    const dependencyStr = doc.metadata.dependency || '';
    const dependencyArr = dependencyStr
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    dependencyArr.forEach((dep) => {
      const depId = `dependency-${dep}`;
      if (!nodesMap[depId]) {
        nodesMap[depId] = {
          id: depId,
          label: dep,
          type: 'dependency',
        };
      }
      // edge
      edges.push({
        source: strategyId,
        target: depId,
        relation: 'addresses', // or "hasDependency"
      });
    });

    // 3) Reference
    // 也可能多个
    const referenceStr = doc.metadata.reference || '';
    const referenceArr = referenceStr
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    referenceArr.forEach((ref) => {
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

    // 3) 如果启用了 frameworkData，就做关键字匹配
    if (frameworkData && frameworkData.dimensions) {
      const matchedDims = matchFrameworkDimensions(
        doc.pageContent,
        frameworkData.dimensions
      );
      console.log(`doc #${idx} matched dims:`, matchedDims);
      matchedDims.forEach((dim) => {
        const dimId = `framework-${dim.id}`;
        if (!nodesMap[dimId]) {
          nodesMap[dimId] = {
            id: dimId,
            label: dim.name,
            type: 'frameworkDimension', // 你也可以叫 'frameworkNode'
          };
        }
        edges.push({
          source: strategyId,
          target: dimId,
          relation: 'alignedWith',
        });
      });
    }
  });

  // 将nodesMap转成数组
  const nodes = Object.values(nodesMap);

  return { nodes, edges };
}
/**
 * proRAGQuery():
 *  - 从前端接收 dependencyData + customFields + userQuery
 *  - dependencyData 中每个字段都是 { values:string[], type:'dependency'|'reference'|'strategy' }, 以及 additional
 *  - customFields 是 [{fieldName, fieldValue, fieldType}, ...]
 *  - 把这些输入拼接到 combinedQuery，做 similaritySearch
 *  - 用 RetrievalQAChain 生成回答
 */
export async function proRAGQuery(
  dependencyData,
  userQuery,
  fileKey,
  language = 'en',
  customFields = []
  // selectedFramework = ''
) {
  // 获取对应的向量索引
  const store = proRAGStores.vectorStoreMap[fileKey];
  if (!store) {
    throw new Error(
      `No store found for fileKey="${fileKey}". Did you build store?`
    );
  }

  // =============== 1. 整理 dependencyData =============== //
  // dependencyData 可能包含 5~6 个字段: climateRisks, regulations, projectTypes, environment, scale, additional
  // 每个字段结构: { values:string[], type:'dependency'|'reference'|'strategy' }
  // 例如:
  //   dependencyData.climateRisks = { values:['Flooding','Drought'], type:'dependency' }
  //   dependencyData.regulations   = { values:['wetland'],          type:'reference' }
  //   ...
  //   dependencyData.additional = 'any extra text'
  //
  // 我们可以按 type 整理:
  let depTexts = [];
  let refTexts = [];
  let strTexts = [];

  function distribute(obj) {
    // obj = { values, type }
    if (!obj || !obj.values) return;
    const { values, type } = obj;
    switch (type) {
      case 'dependency':
        depTexts.push(...values);
        break;
      case 'reference':
        refTexts.push(...values);
        break;
      case 'strategy':
        strTexts.push(...values);
        break;
      default:
        break;
    }
  }

  // 把 5~6 个字段都分配一下
  distribute(dependencyData.climateRisks);
  distribute(dependencyData.regulations);
  distribute(dependencyData.projectTypes);
  distribute(dependencyData.environment);
  distribute(dependencyData.scale);

  // 其他补充
  const additionalText = dependencyData.additional || '';

  // =============== 2. 整理 customFields =============== //
  // customFields 是 [{ fieldName, fieldValue, fieldType }, ...]
  // 也要分到 depTexts, refTexts, strTexts
  customFields.forEach((cf) => {
    switch (cf.fieldType) {
      case 'dependency':
        depTexts.push(`${cf.fieldName}: ${cf.fieldValue}`);
        break;
      case 'reference':
        refTexts.push(`${cf.fieldName}: ${cf.fieldValue}`);
        break;
      case 'strategy':
        strTexts.push(`${cf.fieldName}: ${cf.fieldValue}`);
        break;
      default:
        break;
    }
  });

  // =============== 3. 拼接成一个 combinedQuery =============== //
  const combinedQuery = `
User Dependencies: ${depTexts.join(', ')}
User References: ${refTexts.join(', ')}
User Strategies: ${strTexts.join(', ')}
Additional Info: ${additionalText}

User's question: ${userQuery}
`.trim();

  // =============== 4. 相似度检索 =============== //
  const docs = await store.similaritySearch(combinedQuery, 10);
  // const graphData = buildGraphDataFromDocs(docs, selectedFramework);
  // 整理 chunk 作为上下文
  const context = docs
    .map(
      (d, idx) => `
---- Document #${idx + 1} ----
Strategy (pageContent):
${d.pageContent}
***DEPENDENCY***: ${d.metadata.dependency}
***REFERENCE***: ${d.metadata.reference}
`
    )
    .join('\n');

  // =============== 5. 构建 Prompt =============== //
  let langPrompt = '';
  if (language === 'zh') langPrompt = 'You must answer in Chinese 中文.';
  else if (language === 'en') langPrompt = 'You must answer in English.';
  else if (language === 'es')
    langPrompt = 'You must answer in Spanish Espanol.';
  else {
    langPrompt = `Answer in ${language}.`;
  }

  const template = `
You are a knowledgeable consultant in architecture, engineering, and design.
${langPrompt}

The user has provided the following typed context:
- Dependencies: ${depTexts.join(', ')}
- References: ${refTexts.join(', ')}
- Strategies: ${strTexts.join(', ')}
Additional info: ${additionalText}

We found these relevant table chunks:
${context}

// Now, please answer the user's question below in a concise manner, referencing the found chunks if needed. 
// Please respond in Markdown format, with an ordered list (1., 2., 3., ...).
Please note:
1) **If the user explicitly asks for a reference, you must include the 'ReferenceInDoc'** if it exists. 
   If multiple references appear, include them all (e.g., "References: ...").
2) Output your final answer in an ordered list, in Markdown format.
If there's insufficient info, say "No more info available."

User's question:
${userQuery}
  `;

  // =============== 6. 调用 langchain 的 RetrievalQAChain =============== //
  const model = new ChatOpenAI({
    modelName: process.env.OPENAI_MODEL,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
  // const model = new ChatHuggingFace({
  //   apiKey: process.env.HUGGINGFACE_API_KEY,
  //   model: process.env.HUGGINGFACE_MODEL,
  //   // temperature: 0.7,
  // });

  const chain = RetrievalQAChain.fromLLM(model, store.asRetriever(), {
    prompt: PromptTemplate.fromTemplate(template),
  });

  const response = await chain.call({ query: combinedQuery });
  const answer = response.text;

  // 用以在前端查看最终 prompt
  const usedPrompt = template;

  // 返回给前端
  return {
    answer,
    usedPrompt,
    // graphData,
    docs, // 把 LLM 找到的 docs 传回前端
  };
}

/**
 * 2) 新增: proRAGQueryCoT (带Chain of Thought倾向的 RAG)
 *   - 相比 proRAGQuery，多加“让模型先显示推理过程”之类的提示。
 *   - 注意：模型可能并不真的显式打印全部思维链，也可能写在答案里。你可再做structured output处理
 */
export async function proRAGQueryCoT(
  dependencyData,
  userQuery,
  fileKey,
  language = 'en',
  customFields = []
) {
  const store = proRAGStores.vectorStoreMap[fileKey];
  if (!store) {
    throw new Error(`No store found for fileKey="${fileKey}"`);
  }

  // 跟 proRAGQuery 类似地收集 dep/ref/str
  let depTexts = [];
  let refTexts = [];
  let strTexts = [];

  function distribute(obj) {
    if (!obj || !obj.values) return;
    const { values, type } = obj;
    switch (type) {
      case 'dependency':
        depTexts.push(...values);
        break;
      case 'reference':
        refTexts.push(...values);
        break;
      case 'strategy':
        strTexts.push(...values);
        break;
      default:
        break;
    }
  }

  distribute(dependencyData.climateRisks);
  distribute(dependencyData.regulations);
  distribute(dependencyData.projectTypes);
  distribute(dependencyData.environment);
  distribute(dependencyData.scale);

  const additionalText = dependencyData.additional || '';

  customFields.forEach((cf) => {
    switch (cf.fieldType) {
      case 'dependency':
        depTexts.push(`${cf.fieldName}: ${cf.fieldValue}`);
        break;
      case 'reference':
        refTexts.push(`${cf.fieldName}: ${cf.fieldValue}`);
        break;
      case 'strategy':
        strTexts.push(`${cf.fieldName}: ${cf.fieldValue}`);
        break;
      default:
        break;
    }
  });

  const combinedQuery = `
[Chain of Thought Mode]

User Dependencies: ${depTexts.join(', ')}
User References: ${refTexts.join(', ')}
User Strategies: ${strTexts.join(', ')}
Additional Info: ${additionalText}

User's question: ${userQuery}
`.trim();

  const docs = await store.similaritySearch(combinedQuery, 10);

  const context = docs
    .map(
      (d, idx) => `
---- Document #${idx + 1} ----
Strategy (pageContent):
${d.pageContent}
DependencyInDoc: ${d.metadata.dependency}
ReferenceInDoc : ${d.metadata.reference}
`
    )
    .join('\n');

  let langPrompt = '';
  if (language === 'zh') langPrompt = 'You must answer in Chinese 中文.';
  else if (language === 'en') langPrompt = 'You must answer in English.';
  else if (language === 'es')
    langPrompt = 'You must answer in Spanish Espanol.';
  else {
    langPrompt = `Answer in ${language}.`;
  }

  // 这里我们加了一个"先写推理过程，再给最终答案"的指令
  const template = `
You are an expert consultant. 
We want to see a chain of thought: 
   1) Analyze the context step by step 
   2) Summarize the references 
   3) Provide the final short answer

${langPrompt}
Please respond in Markdown format. 
If there's insufficient info, say "No more info available."

=== Documents / Context ===
${context}

=== Chain of Thought ===
First, reason it out step by step. Then, produce the final answer.

User's question: ${userQuery}
  `;

  const model = new ChatOpenAI({
    modelName: process.env.OPENAI_MODEL,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
  // const model = new ChatHuggingFace({
  //   apiKey: process.env.HUGGINGFACE_API_KEY,
  //   model: process.env.HUGGINGFACE_MODEL,
  //   // temperature: 0.7,
  // });
  const chain = RetrievalQAChain.fromLLM(model, store.asRetriever(), {
    prompt: PromptTemplate.fromTemplate(template),
  });

  const response = await chain.call({ query: combinedQuery });
  const answer = response.text;

  return {
    answer,
    usedPrompt: template,
  };
}
