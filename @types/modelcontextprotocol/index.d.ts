/**
 * @modelcontextprotocol/sdk 类型声明文件
 * 用于解决类型导入问题
 */
declare module '@modelcontextprotocol/sdk' {
  export interface JsonRpcError {
    code: number;
    message: string;
    data?: Record<string, unknown>;
  }
}

declare module '@modelcontextprotocol/sdk/server' {
  export enum LogLevel {
    TRACE,
    DEBUG,
    INFO,
    WARN,
    ERROR,
    FATAL,
    SILENT
  }

  export interface McpServerOptions {
    name: string;
    version: string;
    logger?: Console;
    logLevel?: LogLevel;
    // 支持额外的字段，如app
    app?: Record<string, unknown>;
    [key: string]: unknown;
  }

  export interface ToolDefinition {
    description: string;
    inputSchema?: unknown;
    outputSchema?: unknown;
    [key: string]: unknown;
  }

  export type ToolHandler<T = unknown, R = unknown> = (params: T, context: unknown) => Promise<R>;

  export class McpServer {
    constructor(options: McpServerOptions);
    connect(transport: StdioServerTransport): Promise<void>;
    disconnect(): Promise<void>;
    tool<T = unknown, R = unknown>(
      name: string, 
      definition: ToolDefinition, 
      handler: ToolHandler<T, R>
    ): void;
  }

  export class StdioServerTransport {
    constructor();
    // 可能有其他方法，但目前未用到
  }
} 