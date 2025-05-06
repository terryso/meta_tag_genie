/**
 * Spotlight 搜索辅助脚本
 * 
 * 使用方法：
 * node helper-mdfind.js <图片路径> "搜索查询"
 * 
 * 示例:
 * node helper-mdfind.js ~/Desktop/spotlight-test-images/test1.jpg "kMDItemKeywords == 'Vacation'"
 * node helper-mdfind.js ~/Desktop/spotlight-test-images "kMDItemTextContent == '*sunset*'"
 */

import { exec } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

// 检查命令行参数
const filePath = process.argv[2];
const searchTerm = process.argv[3];

if (!filePath || !searchTerm) {
  console.error("用法: node helper-mdfind.js <filePath> \"<mdfindQueryTerm>\"");
  console.error("\n示例查询:");
  console.error("  - 搜索标签: kMDItemKeywords == 'Vacation'");
  console.error("  - 搜索描述: kMDItemTextContent == '*sunset*'");
  console.error("  - 组合搜索: kMDItemKeywords == 'Vacation' && kMDItemTextContent == '*sunset*'");
  process.exit(1);
}

// 检查路径是否存在
if (!fs.existsSync(filePath)) {
  console.error(`错误: 路径不存在: ${filePath}`);
  process.exit(1);
}

// 判断是文件还是目录
const stats = fs.statSync(filePath);
let searchCommand;

if (stats.isFile()) {
  // 如果是文件，搜索该文件
  searchCommand = `mdfind -onlyin "${path.dirname(filePath)}" "${searchTerm} && kMDItemFSName == '${path.basename(filePath)}'"`;
} else if (stats.isDirectory()) {
  // 如果是目录，搜索整个目录
  searchCommand = `mdfind -onlyin "${filePath}" "${searchTerm}"`;
} else {
  console.error(`错误: ${filePath} 既不是文件也不是目录`);
  process.exit(1);
}

console.log(`执行命令: ${searchCommand}`);

// 执行mdfind命令
exec(searchCommand, (error, stdout, stderr) => {
  if (error) {
    console.error(`执行错误: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`mdfind错误输出: ${stderr}`);
  }
  
  const results = stdout.trim().split('\n').filter(line => line.trim());
  
  if (results.length === 0) {
    console.log('没有找到匹配的文件');
  } else {
    console.log(`找到 ${results.length} 个匹配的文件:`);
    results.forEach((file, index) => {
      console.log(`${index + 1}. ${file}`);
    });
  }
}); 