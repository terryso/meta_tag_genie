#!/usr/bin/env node
/**
 * MetaTag Genie MCP工具列表查询脚本
 * 
 * 该脚本使用MCP SDK查询MetaTag Genie服务支持的工具列表。
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// 主函数 - 使用async/await处理异步操作
async function main() {
  console.log("\n=== MetaTag Genie MCP工具列表 ===\n");
  console.log("正在连接MetaTag Genie服务...");

  // 创建传输层 - 连接到本地服务
  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/main.js"]
  });

  // 创建MCP客户端
  const client = new Client({
    name: "ToolListClient",
    version: "1.0.0"
  });

  try {
    // 连接到服务
    await client.connect(transport);
    console.log("成功连接到MetaTag Genie服务！");

    // 显示已知工具信息
    await displayTools(client);
    
  } catch (error) {
    console.error(`连接或查询服务时出错: ${error.message}`);
  } finally {
    // 关闭连接
    try {
      await client.close();
    } catch (e) {
      // 忽略关闭时的错误
    }
  }
}

/**
 * 显示工具信息并尝试列出工具
 */
async function displayTools(client) {
  // 尝试使用SDK的listTools方法获取工具列表
  let toolsFound = false;
  
  try {
    console.log("尝试获取工具列表...");
    const response = await client.listTools();
    
    // 处理响应格式 { tools: [...] }
    const tools = response?.tools || [];
    
    if (tools && tools.length > 0) {
      toolsFound = true;
      console.log(`成功获取到 ${tools.length} 个工具！`);
      
      // 显示从服务获取的工具列表
      console.log("\n=== MetaTag Genie可用工具 ===\n");
      tools.forEach((tool, index) => {
        console.log(`${index + 1}. ${tool.name}`);
        if (tool.description) {
          console.log(`   描述: ${tool.description}`);
        }
        
        // 如果工具是writeImageMetadata，显示使用示例
        if (tool.name === 'writeImageMetadata') {
          console.log("   示例:");
          console.log("   $ node tools/write-metadata.js ~/Desktop/test.jpg tags-desc");
          console.log("   $ node tools/write-metadata.js ~/Desktop/test.jpg people");
          console.log("   $ node tools/write-metadata.js ~/Desktop/test.jpg location");
          console.log("   $ node tools/write-metadata.js ~/Desktop/test.jpg all");
        }
        
        console.log("");
      });
      
      // 显示批量处理工具信息
      console.log("批量处理工具:");
      console.log("- Spotlight测试批量准备:");
      console.log("  $ node tools/spotlight-test-setup.js ~/Desktop/spotlight-test-images");
      console.log("\n更多使用说明请参考: tools/README.md\n");
      
      // 提示如何验证
      console.log("提示: 写入元数据后可使用以下命令验证:");
      console.log("$ mdls <图片路径>              # 查看所有元数据");
      console.log("$ mdfind -name <图片名称>       # 使用文件名搜索");
      console.log("$ mdfind \"kMDItemKeywords=*测试*\" # 使用标签搜索");
      console.log("$ mdfind \"kMDItemAuthors=*Alice*\" # 使用人物搜索");
      console.log("\n祝使用愉快! 🔍✨\n");
      
      return;
    }
  } catch (e) {
    console.log(`无法使用SDK方法获取工具列表: ${e.message}`);
  }
  
  // 如果无法获取动态工具列表，显示静态列表
  if (!toolsFound) {
    // 静态工具列表
    const availableTools = [
      {
        name: "writeImageMetadata",
        description: "写入图片元数据，包括标签、描述、人物和地点信息",
        examples: [
          "node tools/write-metadata.js ~/Desktop/test.jpg tags-desc",
          "node tools/write-metadata.js ~/Desktop/test.jpg people",
          "node tools/write-metadata.js ~/Desktop/test.jpg location",
          "node tools/write-metadata.js ~/Desktop/test.jpg all"
        ]
      }
    ];
    
    console.log("回退到静态工具列表...");
    console.log("\n=== MetaTag Genie可用工具 ===\n");
    
    // 显示每个工具的信息
    availableTools.forEach((tool, index) => {
      console.log(`${index + 1}. ${tool.name}`);
      console.log(`   描述: ${tool.description}`);
      
      if (tool.examples && tool.examples.length > 0) {
        console.log("   示例:");
        tool.examples.forEach(example => {
          console.log(`   $ ${example}`);
        });
      }
      
      console.log("");
    });
    
    // 显示批量处理工具信息
    console.log("批量处理工具:");
    console.log("- Spotlight测试批量准备:");
    console.log("  $ node tools/spotlight-test-setup.js ~/Desktop/spotlight-test-images");
    console.log("\n更多使用说明请参考: tools/README.md\n");
    
    // 提示如何验证
    console.log("提示: 写入元数据后可使用以下命令验证:");
    console.log("$ mdls <图片路径>              # 查看所有元数据");
    console.log("$ mdfind -name <图片名称>       # 使用文件名搜索");
    console.log("$ mdfind \"kMDItemKeywords=*测试*\" # 使用标签搜索");
    console.log("$ mdfind \"kMDItemAuthors=*Alice*\" # 使用人物搜索");
    console.log("\n祝使用愉快! 🔍✨\n");
  }
}

// 执行主函数
main().catch(error => {
  console.error("执行出错:", error);
  process.exit(1);
});

