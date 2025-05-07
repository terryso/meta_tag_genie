/**
 * MetaTag Genie 元数据写入工具
 * 
 * 使用方法：
 * node src/tools/write-metadata.js <filePath> <metadata-type>
 * 
 * 支持的元数据类型：
 * - tags-desc: 写入标签和描述
 * - people: 写入人物名称
 * - location: 写入地点
 * - all: 写入所有类型的元数据
 * 
 * 示例：
 * node src/tools/write-metadata.js ~/Desktop/test.jpg tags-desc
 * node src/tools/write-metadata.js ~/Desktop/test.jpg people
 */

const McpClient = require('./utils/mcp-client');
const fs = require('fs');

// 检查命令行参数
const filePath = process.argv[2];
const metadataType = process.argv[3]; // 'tags-desc', 'people', 'location', 'all'

if (!filePath || !metadataType) {
  console.error("\n用法: node src/tools/write-metadata.js <filePath> <metadata-type>");
  console.error("\n支持的元数据类型:");
  console.error("  - tags-desc: 写入标签和描述");
  console.error("  - people: 写入人物名称");
  console.error("  - location: 写入地点");
  console.error("  - all: 写入所有类型的元数据");
  console.error("\n示例:");
  console.error("  node src/tools/write-metadata.js ~/Desktop/test.jpg tags-desc");
  console.error("  node src/tools/write-metadata.js ~/Desktop/test.jpg people\n");
  process.exit(1);
}

// 检查文件是否存在
const resolvedPath = filePath.replace(/^~/, process.env.HOME || '');
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

// 主函数，使用 MCP 客户端
async function main() {
  console.log("启动 MetaTag Genie 服务...");
  
  // 创建 MCP 客户端
  const mcpClient = new McpClient({
    clientName: "MetaTagWriterClient",
    clientVersion: "1.0.0"
  });

  try {
    // 连接到服务
    await mcpClient.connect();
    console.log("服务初始化成功，发送元数据写入请求...");
    
    // 调用写入元数据工具
    const result = await mcpClient.writeImageMetadata(filePath, metadata);
    
    // 处理结果
    if (result) {
      try {
        // 尝试解析 JSON 结果
        const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
        console.log(`元数据写入成功: ${parsedResult.message || '操作完成'}`);
      } catch (e) {
        // 如果无法解析，直接显示结果
        console.log(`元数据写入成功: ${result}`);
      }
    } else {
      console.log("元数据写入成功");
    }
    
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
    
  } catch (error) {
    console.error(`元数据写入失败: ${error.message}`);
    process.exit(1);
  } finally {
    // 关闭连接
    try {
      await mcpClient.close();
      console.log("服务已关闭，操作完成。");
    } catch (e) {
      // 忽略关闭时的错误
    }
  }
}

// 运行主函数
main().catch(error => {
  console.error("执行错误:", error);
  process.exit(1);
}); 