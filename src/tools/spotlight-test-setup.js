/**
 * MetaTag Genie Spotlight测试准备工具
 * 
 * 该脚本根据docs/manual-spotlight-tests.md文档中的测试用例，
 * 为不同图片格式准备测试数据，方便Spotlight搜索验证。
 * 
 * 使用方法：
 * node src/tools/spotlight-test-setup.js <目标目录>
 * 
 * 示例：
 * node src/tools/spotlight-test-setup.js ~/Desktop/spotlight-test-images
 */

import fs from 'fs';
import path from 'path';
import McpClient from './utils/mcp-client.mjs';

// 检查命令行参数
const targetDir = process.argv[2];

if (!targetDir) {
  console.error("\n用法: node src/tools/spotlight-test-setup.js <目标目录>");
  console.error("\n示例:");
  console.error("  node src/tools/spotlight-test-setup.js ~/Desktop/spotlight-test-images\n");
  process.exit(1);
}

// 解析目录路径
const resolvedDir = targetDir.replace(/^~/, process.env.HOME);

// 检查目录是否存在，不存在则创建
if (!fs.existsSync(resolvedDir)) {
  console.log(`目录 ${targetDir} 不存在，正在创建...`);
  fs.mkdirSync(resolvedDir, { recursive: true });
}

// 测试用例定义
const testCases = [
  // 标签和描述测试用例
  {
    id: 'T1',
    format: 'jpg',
    metadata: {
      tags: ["SpotlightTest", "Vacation"],
      description: "A beautiful sunset view during vacation."
    }
  },
  {
    id: 'T2',
    format: 'jpg',
    metadata: {
      tags: ["假期测试", "中文标签"],
      description: "这是一张测试用的中文描述照片。"
    }
  },
  {
    id: 'T3',
    format: 'jpg',
    metadata: {
      tags: ["Beach&Sea", "Special@Chars"],
      description: "Testing special characters: & < > \" ' / \\ ? = + %"
    }
  },
  {
    id: 'T4',
    format: 'png',
    metadata: {
      tags: ["SpotlightTest", "Mountains"],
      description: "Mountain view from the hiking trail."
    }
  },
  {
    id: 'T5',
    format: 'png',
    metadata: {
      tags: ["OnlyTags", "NoDescription"]
    }
  },
  {
    id: 'T6',
    format: 'heic',
    metadata: {
      tags: ["SpotlightTest", "Portrait"],
      description: "Portrait photo with good lighting."
    }
  },
  {
    id: 'T7',
    format: 'heic',
    metadata: {
      description: "This HEIC image has description only."
    }
  },
  
  // 人物测试用例
  {
    id: 'P1',
    format: 'jpg',
    metadata: {
      people: ["Alice Wonderland"]
    }
  },
  {
    id: 'P2',
    format: 'jpg',
    metadata: {
      people: ["Bob The Builder", "Charles Xavier"]
    }
  },
  {
    id: 'P3',
    format: 'jpg',
    metadata: {
      people: ["Dr. Strange (Stephen)"]
    }
  },
  {
    id: 'P4',
    format: 'png',
    metadata: {
      people: ["孙悟空", "猪八戒"]
    }
  },
  
  // 地点测试用例
  {
    id: 'L1',
    format: 'png',
    metadata: {
      location: "London, UK"
    }
  },
  {
    id: 'L2',
    format: 'png',
    metadata: {
      location: "Eiffel Tower, Paris, France"
    }
  },
  {
    id: 'L3',
    format: 'heic',
    metadata: {
      location: "Baker Street 221B & The Pub Nearby"
    }
  },
  {
    id: 'L4',
    format: 'heic',
    metadata: {
      location: "中国北京故宫博物院"
    }
  },
  
  // 组合测试用例
  {
    id: 'PL1',
    format: 'jpg',
    metadata: {
      people: ["Tony Stark", "Peter Parker"],
      location: "Stark Tower, New York"
    }
  },
  {
    id: 'PL2',
    format: 'png',
    metadata: {
      people: ["Bruce Wayne", "Clark Kent"],
      location: "Gotham City Central Park"
    }
  },
  {
    id: 'ALL1',
    format: 'heic',
    metadata: {
      tags: ["SpotlightTest", "Vacation"],
      description: "A beautiful sunset view during vacation.",
      people: ["Wonder Woman", "Superman"],
      location: "Themyscira Island"
    }
  }
];

// 准备测试图片目录
console.log(`\n=== MetaTag Genie Spotlight测试准备工具 ===`);
console.log(`目标目录: ${targetDir}\n`);

// 查找测试图片资源
const fixturesDir = path.join(process.cwd(), 'tests', 'fixtures', 'images');
console.log(`正在查找测试图片资源: ${fixturesDir}`);

if (!fs.existsSync(fixturesDir)) {
  console.error(`错误: 测试图片目录不存在: ${fixturesDir}`);
  console.error(`请确保项目中存在测试图片资源。`);
  process.exit(1);
}

// 准备测试图片和写入元数据
(async function setupTests() {
  // 先检查测试图片是否存在
  const availableImages = {};
  
  for (const format of ['jpg', 'png', 'heic']) {
    const testImage = path.join(fixturesDir, `test-image.${format}`);
    const fallbackImage = path.join(fixturesDir, 'WechatIMG247964.jpg');
    
    if (fs.existsSync(testImage)) {
      availableImages[format] = testImage;
    } else if (fs.existsSync(fallbackImage) && format === 'jpg') {
      availableImages[format] = fallbackImage;
      console.log(`警告: 未找到 ${format} 格式的测试图片，将使用后备JPG图片`);
    } else {
      console.log(`警告: 未找到 ${format} 格式的测试图片，相关测试将被跳过`);
    }
  }
  
  console.log(`找到的测试图片: ${Object.keys(availableImages).join(', ')}`);
  
  // 创建 MCP 客户端
  const mcpClient = new McpClient({
    clientName: "SpotlightTestSetup",
    clientVersion: "1.0.0"
  });
  
  // 处理每个测试用例
  let processed = 0;
  let skipped = 0;
  
  try {
    // 连接 MCP 服务
    await mcpClient.connect();
    console.log("MCP 服务连接成功");
    
    for (const testCase of testCases) {
      if (!availableImages[testCase.format]) {
        console.log(`跳过测试 ${testCase.id}: 不支持 ${testCase.format} 格式`);
        skipped++;
        continue;
      }
      
      // 创建测试图片
      const targetPath = path.join(resolvedDir, `${testCase.id}.${testCase.format}`);
      fs.copyFileSync(availableImages[testCase.format], targetPath);
      
      console.log(`\n处理测试图片 [${testCase.id}]: ${targetPath}`);
      console.log(`元数据: ${JSON.stringify(testCase.metadata, null, 2)}`);
      
      // 使用MCP服务写入元数据
      try {
        await mcpClient.writeImageMetadata(targetPath, testCase.metadata);
        processed++;
        console.log(`✓ 测试 ${testCase.id} 成功处理`);
      } catch (error) {
        console.error(`✗ 测试 ${testCase.id} 处理失败: ${error.message}`);
      }
    }
  } catch (error) {
    console.error(`MCP 服务错误: ${error.message}`);
  } finally {
    // 关闭 MCP 客户端
    try {
      await mcpClient.close();
    } catch (e) {
      // 忽略关闭时的错误
    }
  }
  
  console.log(`\n=== 处理完成 ===`);
  console.log(`成功处理: ${processed} 个测试用例`);
  console.log(`跳过处理: ${skipped} 个测试用例`);
  console.log(`\n测试图片保存在: ${targetDir}`);
  console.log(`\n提示: 可以使用以下命令强制Spotlight立即索引目录:`);
  console.log(`mdimport ${targetDir}`);
  console.log(`\n然后使用docs/manual-spotlight-tests.md中的搜索测试矩阵进行验证。`);
})(); 