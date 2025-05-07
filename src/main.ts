#!/usr/bin/env node
/**
 * MetaTag Genie - 主入口文件
 *
 * 该文件将负责初始化 MCP 服务并处理与客户端的通信
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from 'zod'; // 用于定义 Tool Schema
import { MetadataWriterService } from './core/metadata-writer'; // 我们在 Story 1.2 创建的服务
import { initializeGracefulShutdown } from './common/graceful-shutdown'; // 一个新的辅助函数
import { writeImageMetadataHandler } from './mcp/tools/writeImageMetadata'; // 导入Tool处理函数
import { JsonRpcError } from './common/errors'; // 导入自定义JSON-RPC错误类

// 处理命令行参数
if (process.argv.includes('--version') || process.argv.includes('-v')) {
  console.log('MetaTag Genie v0.1.0');
  process.exit(0);
}

console.log('MetaTag Genie 服务正在启动...');

// 监听标准输入/输出流的错误事件
process.stdin.on('error', (error) => {
  console.error('标准输入流错误:', error);
});

process.stdout.on('error', (error) => {
  console.error('标准输出流错误:', error);
});

process.stderr.on('error', (error) => {
  console.error('标准错误流错误:', error);
});

// 实例化 MetadataWriterService
const metadataWriter = new MetadataWriterService();

// 创建和配置 McpServer 实例
const server = new McpServer({
  name: 'MetaTagGenie',
  version: '0.1.0', // 或者从 package.json 读取
});

// 定义 writeImageMetadata Tool 的参数结构
const writeImageMetadataParams = {
  filePath: z.string().min(1, "filePath is required."),
  metadata: z.object({
    tags: z.array(z.string()).optional(),
    description: z.string().optional(),
    people: z.array(z.string()).optional(),
    location: z.string().optional(),
  }),
  overwrite: z.boolean().default(true),
};

// 设置全局上下文，使工具处理函数可以访问元数据服务
const appContext = { metadataWriter };

// 注册 writeImageMetadata Tool
server.tool(
  'writeImageMetadata', // 工具名称
  'Writes metadata (tags, description, people, location) to an image file.', // 工具描述
  writeImageMetadataParams, // 参数 schema
  async (params, _extra) => {
    try {
      // 在调用处理函数时传入参数和上下文
      const result = await writeImageMetadataHandler(params, { app: appContext });
      
      // 返回完整的结果作为JSON字符串
      return {
        content: [{ 
          type: 'text', 
          text: JSON.stringify(result)
        }]
      };
    } catch (error) {
      // 处理JsonRpcError，将其转换为正确的响应格式
      if (error instanceof JsonRpcError) {
        // 使用SDK的错误处理机制传递自定义错误
        throw {
          code: error.code,
          message: error.message,
          data: error.data
        };
      }
      
      // 对于其他未处理的错误，返回通用内部错误
      console.error('Tool执行时发生未捕获错误:', error);
      throw {
        code: -32603, // JSON-RPC标准内部错误码
        message: '内部服务器错误',
        data: { errorMessage: error instanceof Error ? error.message : String(error) }
      };
    }
  }
);

// 主函数，启动服务
async function main() {
  // 创建StdioServerTransport（不接受参数）
  const transport = new StdioServerTransport();

  // 设置优雅关闭，传入 server 和 metadataWriter 实例
  initializeGracefulShutdown(server, metadataWriter, transport);

  try {
    console.log('正在连接 MCP 服务器与 Stdio 传输...');
    await server.connect(transport);
    console.log('MetaTag Genie MCP Server 已成功在 Stdio 上启动并监听。');
    console.log('服务器信息: 名称=%s, 版本=%s', 'MetaTagGenie', '0.1.0');
    console.log('等待 MCP 客户端通过 Stdio 发送请求...');
  } catch (error) {
    console.error('启动 MetaTag Genie MCP Server 失败:', error);
    await metadataWriter.end(); // 确保 exiftool 关闭
    process.exit(1);
  }
}

main();
