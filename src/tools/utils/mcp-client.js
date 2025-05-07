/**
 * MetaTag Genie MCP 客户端工具 (CommonJS 版本)
 * 
 * 提供与 MetaTag Genie MCP 服务交互的简化接口
 */

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

class McpClient {
  /**
   * 创建 MCP 客户端实例
   * @param {Object} options 选项
   * @param {string} options.clientName 客户端名称
   * @param {string} options.clientVersion 客户端版本
   * @param {string} options.serverPath 服务器路径
   * @param {Array<string>} options.serverArgs 服务器参数
   */
  constructor(options = {}) {
    this.clientName = options.clientName || "MetaTagGenie_ToolClient";
    this.clientVersion = options.clientVersion || "1.0.0";
    this.serverPath = options.serverPath || "dist/main.js";
    this.serverArgs = options.serverArgs || [];
    
    // 创建传输层
    this.transport = new StdioClientTransport({
      command: "node",
      args: [this.serverPath, ...this.serverArgs]
    });

    // 创建 MCP 客户端
    this.client = new Client({
      name: this.clientName,
      version: this.clientVersion
    });
    
    this.isConnected = false;
  }

  /**
   * 连接到 MCP 服务
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.isConnected) return;
    
    await this.client.connect(this.transport);
    this.isConnected = true;
  }

  /**
   * 关闭 MCP 客户端连接
   * @returns {Promise<void>}
   */
  async close() {
    if (!this.isConnected) return;
    
    try {
      await this.client.close();
    } finally {
      this.isConnected = false;
    }
  }

  /**
   * 调用 MCP 工具
   * @param {string} toolName 工具名称
   * @param {Object} params 工具参数
   * @returns {Promise<any>} 工具执行结果
   */
  async callTool(toolName, params) {
    if (!this.isConnected) {
      await this.connect();
    }
    
    return this.client.callTool({
      name: toolName,
      arguments: params
    });
  }

  /**
   * 获取可用工具列表
   * @returns {Promise<Array>} 工具列表
   */
  async listTools() {
    if (!this.isConnected) {
      await this.connect();
    }
    
    try {
      return await this.client.listTools();
    } catch (error) {
      console.warn(`获取工具列表失败: ${error.message}`);
      return { tools: [] };
    }
  }
  
  /**
   * 写入图片元数据的便捷方法
   * @param {string} filePath 图片路径
   * @param {Object} metadata 元数据对象
   * @param {boolean} overwrite 是否覆盖
   * @returns {Promise<any>} 执行结果
   */
  async writeImageMetadata(filePath, metadata, overwrite = true) {
    return this.callTool("writeImageMetadata", {
      filePath,
      metadata,
      overwrite
    });
  }
}

module.exports = McpClient; 