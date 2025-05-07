/**
 * MetaTag Genie 元数据写入工具
 * 
 * 使用方法：
 * node tools/write-metadata.js <filePath> <metadata-type>
 * 
 * 支持的元数据类型：
 * - tags-desc: 写入标签和描述
 * - people: 写入人物名称
 * - location: 写入地点
 * - all: 写入所有类型的元数据
 * 
 * 示例：
 * node tools/write-metadata.js ~/Desktop/test.jpg tags-desc
 * node tools/write-metadata.js ~/Desktop/test.jpg people
 */

import { spawn } from 'child_process';
import fs from 'fs';

// 检查命令行参数
const filePath = process.argv[2];
const metadataType = process.argv[3]; // 'tags-desc', 'people', 'location', 'all'

if (!filePath || !metadataType) {
  console.error("\n用法: node tools/write-metadata.js <filePath> <metadata-type>");
  console.error("\n支持的元数据类型:");
  console.error("  - tags-desc: 写入标签和描述");
  console.error("  - people: 写入人物名称");
  console.error("  - location: 写入地点");
  console.error("  - all: 写入所有类型的元数据");
  console.error("\n示例:");
  console.error("  node tools/write-metadata.js ~/Desktop/test.jpg tags-desc");
  console.error("  node tools/write-metadata.js ~/Desktop/test.jpg people\n");
  process.exit(1);
}

// 检查文件是否存在
const resolvedPath = filePath.replace(/^~/, process.env.HOME);
if (!fs.existsSync(resolvedPath)) {
  console.error(`错误: 文件不存在: ${filePath}`);
  process.exit(1);
}

// 根据类型构建元数据
let metadata = {};
switch(metadataType) {
  case 'tags-desc':
    metadata = {
      tags: ["SpotlightTest", "Vacation"],
      description: "A beautiful sunset view during vacation."
    };
    break;
  case 'people':
    metadata = {
      people: ["Alice Wonderland", "Bob The Builder"]
    };
    break;
  case 'location':
    metadata = {
      location: "Eiffel Tower, Paris, France"
    };
    break;
  case 'all':
    metadata = {
      tags: ["Holiday", "Friends"],
      description: "A wonderful day with friends",
      people: ["Bruce Wayne", "Clark Kent"],
      location: "Gotham City Central Park"
    };
    break;
  default:
    console.error(`错误: 不支持的元数据类型: ${metadataType}`);
    process.exit(1);
}

console.log(`\n开始处理: ${filePath}`);
console.log(`元数据类型: ${metadataType}`);
console.log(`元数据内容: ${JSON.stringify(metadata, null, 2)}\n`);

// 启动服务并发送请求
console.log("启动 MetaTag Genie 服务...");
const mcpProcess = spawn('node', ['dist/main.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// 定义收集响应的变量
let responseData = '';
let initialized = false;
let toolResponded = false;

// 响应处理
mcpProcess.stdout.on('data', (data) => {
  const dataStr = data.toString();
  responseData += dataStr;
  
  // 处理每一行JSON-RPC响应
  const lines = dataStr.split('\n').filter(line => line.trim());
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      
      // 检查是否为初始化响应
      if (!initialized && response.id && response.id === 'init-request') {
        initialized = true;
        console.log("服务初始化成功，发送元数据写入请求...");
        
        // 发送工具请求
        const request = {
          jsonrpc: '2.0',
          id: 'test-request',
          method: 'tool',
          params: {
            name: 'writeImageMetadata',
            params: {
              filePath: filePath,
              metadata: metadata,
              overwrite: true
            }
          }
        };
        
        mcpProcess.stdin.write(`${JSON.stringify(request)}\n`);
      }
      
      // 检查是否为工具响应
      if (!toolResponded && response.id && response.id === 'test-request') {
        toolResponded = true;
        
        if (response.error) {
          console.error(`元数据写入失败: ${response.error.message}`);
        } else {
          console.log(`元数据写入成功: ${response.result?.message || '操作完成'}`);
        }
        
        // 1秒后结束进程
        setTimeout(() => {
          mcpProcess.kill();
          console.log("\n服务已关闭，操作完成。");
          
          // 提示下一步操作
          console.log("\n您可以通过以下命令验证元数据是否被正确写入:");
          console.log(`node tests/helper-mdfind.js "${filePath}"`);
          
          if (metadataType === 'tags-desc' || metadataType === 'all') {
            console.log(`node tests/helper-mdfind.js "${filePath}" "Vacation" tags`);
          }
          if (metadataType === 'people' || metadataType === 'all') {
            console.log(`node tests/helper-mdfind.js "${filePath}" "Alice" people`);
          }
          if (metadataType === 'location' || metadataType === 'all') {
            console.log(`node tests/helper-mdfind.js "${filePath}" "Paris" location`);
          }
          console.log("");
        }, 1000);
      }
    } catch (e) {
      // 跳过非JSON行或解析错误
    }
  }
});

// 错误处理
mcpProcess.stderr.on('data', (data) => {
  console.error(`服务错误: ${data.toString()}`);
});

// 进程结束处理
mcpProcess.on('close', (code) => {
  if (code !== 0 && !toolResponded) {
    console.error(`服务异常退出，退出码: ${code}`);
    console.error("可能的原因:");
    console.error("1. 服务启动失败 - 请检查服务是否已正确构建 (npm run build)");
    console.error("2. 服务超时 - 请检查是否有其他实例正在运行");
    console.error("3. 参数错误 - 请检查文件路径是否正确");
    
    if (responseData) {
      console.error("\n服务输出:");
      console.error(responseData);
    }
  }
});

// 发送初始化请求
console.log("初始化MCP协议...");
const initRequest = {
  jsonrpc: '2.0',
  id: 'init-request',
  method: 'initialize',
  params: {
    processId: process.pid,
    clientInfo: { name: 'MetaTagWriterClient', version: '1.0.0' },
    capabilities: {},
    protocolVersion: '0.1.0'
  }
};

mcpProcess.stdin.write(`${JSON.stringify(initRequest)}\n`);

// 设置超时处理
setTimeout(() => {
  if (!toolResponded) {
    console.error("操作超时，服务可能未响应");
    mcpProcess.kill();
    process.exit(1);
  }
}, 30000); // 30秒超时 