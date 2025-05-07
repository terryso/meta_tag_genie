/**
 * Spotlight 搜索辅助脚本
 * 
 * 使用方法：
 * node helper-mdfind.js <图片路径> "搜索查询"
 * 
 * 示例:
 * node helper-mdfind.js ~/Desktop/spotlight-test-images/test1.jpg "kMDItemKeywords == 'Vacation'"
 * node helper-mdfind.js ~/Desktop/spotlight-test-images "kMDItemTextContent == '*sunset*'"
 * node helper-mdfind.js ~/Desktop/spotlight-test-images "kMDItemKeywords == 'Alice Wonderland'" // 搜索人物名称
 * node helper-mdfind.js ~/Desktop/spotlight-test-images "kMDItemTextContent == '*Paris*'" // 搜索地点文本中的关键词
 */

import { exec } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

// 检查命令行参数
const filePath = process.argv[2];
let searchTerm = process.argv[3];
const searchType = process.argv[4]; // 可选: tags, description, people, location

if (!filePath || !searchTerm) {
  console.error("用法: node helper-mdfind.js <filePath> \"<mdfindQueryTerm>\" [searchType]");
  console.error("\n示例查询:");
  console.error("  - 搜索标签: kMDItemKeywords == 'Vacation'");
  console.error("  - 搜索描述: kMDItemTextContent == '*sunset*'");
  console.error("  - 搜索人物: kMDItemKeywords == 'Alice Wonderland'");
  console.error("  - 搜索地点: kMDItemTextContent == '*Paris*'");
  console.error("  - 快捷搜索: node helper-mdfind.js ~/images 'Alice' people");
  console.error("  - 快捷搜索: node helper-mdfind.js ~/images 'Paris' location");
  console.error("  - 组合搜索: kMDItemKeywords == 'Vacation' && kMDItemTextContent == '*sunset*'");
  process.exit(1);
}

// 如果提供了searchType参数，构建适当的查询
if (searchType && !searchTerm.includes('kMDItem')) {
  switch(searchType.toLowerCase()) {
    case 'tags':
    case 'tag':
      searchTerm = `kMDItemKeywords == '${searchTerm}'`;
      break;
    case 'people':
    case 'person':
      searchTerm = `kMDItemKeywords == '${searchTerm}'`;
      break;
    case 'description':
    case 'desc':
      searchTerm = `kMDItemTextContent == '*${searchTerm}*'`;
      break;
    case 'location':
    case 'place':
      searchTerm = `kMDItemTextContent == '*${searchTerm}*'`;
      break;
    default:
      // console.warn(`未知的搜索类型: ${searchType}, 将搜索关键词作为标签`);
      searchTerm = `kMDItemKeywords == '${searchTerm}'`;
  }
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

// 提供更多调试信息：对于单个文件，显示其所有元数据属性
if (stats.isFile()) {
  console.log(`\n获取文件所有Spotlight索引的元数据属性...`);
  exec(`mdls "${filePath}"`, (error, stdout, _stderr) => {
    if (error) {
      console.error(`执行mdls错误: ${error.message}`);
      return;
    }
    
    if (stdout.trim()) {
      const mdlsLines = stdout.trim().split('\n');
      const keywordsLine = mdlsLines.find(line => line.includes('kMDItemKeywords'));
      const textContentLine = mdlsLines.find(line => line.includes('kMDItemTextContent'));
      
      console.log(`\n关键元数据字段 (仅部分显示):`);
      if (keywordsLine) console.log(keywordsLine);
      if (textContentLine) console.log(textContentLine);
      
      console.log(`\n要查看完整元数据, 请运行: mdls "${filePath}"`);
    } else {
      console.log(`文件没有Spotlight元数据属性`);
    }
  });
} 