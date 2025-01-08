// server/frameworks/frameworkManager.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 用于获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * frameworksMap：一个简单的 “名字 -> 文件” 映射。
 * 以后你想增加/删除 framework，只需修改这里即可，无需改 proRAG.js
 */
const frameworksMap = {
  AIA: 'AIA Framework for Design Excellence.json',
  // 其他框架: 'xxx.json'
};

/**
 * loadFrameworkData(frameworkName):
 *   - 若 frameworkName 存在于 frameworksMap，则读对应的 JSON 文件并 parse
 *   - 返回一个对象，例如 { "dimensions": [ {id,name,keywords,description}, ... ] }
 *   - 如果找不到则返回 null
 */
export function loadFrameworkData(frameworkName) {
  const fileName = frameworksMap[frameworkName];
  if (!fileName) {
    return null; // 或者 throw new Error('Framework not found');
  }
  // 拼出文件路径
  const filePath = path.join(__dirname, fileName);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw); // 假设你用 JSON
  return data;
}
