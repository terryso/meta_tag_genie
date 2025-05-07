/**
 * 应用程序中使用的自定义错误类型定义
 */

// 错误码映射，用于 MCP JSON-RPC 错误响应
export const ERROR_CODES = {
  // 使用-32000到-32099范围的标准预留码
  FILE_NOT_FOUND: -32001,
  FILE_NOT_READABLE: -32002,
  FILE_NOT_WRITABLE: -32003,
  UNSUPPORTED_FILE_FORMAT: -32004,
  METADATA_WRITE_FAILED: -32005,
  METADATA_READ_FAILED: -32006,
  INVALID_METADATA_STRUCTURE: -32007,
  EXIFTOOL_TIMEOUT: -32008,
  EXIFTOOL_PROCESS_ERROR: -32009,
  RELATIVE_PATH_NOT_ALLOWED: -32010,
  
  // JSON-RPC 标准错误码
  JSON_RPC_PARSE_ERROR: -32700,
  JSON_RPC_INVALID_REQUEST: -32600,
  JSON_RPC_METHOD_NOT_FOUND: -32601,
  JSON_RPC_INVALID_PARAMS: -32602,
  JSON_RPC_INTERNAL_ERROR: -32603,
};

// 基础自定义错误类
export class BaseError extends Error {
  // 可选的错误原因，用于链式错误
  cause?: Error;
  
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 文件不存在错误
export class FileNotFoundError extends BaseError {
  filePath: string;
  
  constructor(filePath: string) {
    super(`文件未找到: ${filePath}`);
    this.filePath = filePath;
  }
}

// 文件访问错误
export class FileAccessError extends BaseError {
  filePath: string;
  operation: 'read' | 'write';
  
  constructor(filePath: string, operation: 'read' | 'write') {
    super(`对文件 ${filePath} 的${operation === 'read' ? '读取' : '写入'}操作权限被拒绝`);
    this.filePath = filePath;
    this.operation = operation;
  }
}

// 不支持的文件格式错误
export class UnsupportedFileFormatError extends BaseError {
  filePath: string;
  format: string;
  
  constructor(filePath: string, format: string) {
    super(`不支持的文件格式: ${format}，文件: ${filePath}。仅支持JPG、PNG和HEIC格式。`);
    this.filePath = filePath;
    this.format = format;
  }
}

// 元数据读取错误
export class MetadataReadError extends BaseError {
  filePath: string;
  
  constructor(filePath: string, cause?: Error) {
    const message = cause ? 
      `从文件 ${filePath} 读取元数据失败: ${cause.message}` : 
      `从文件 ${filePath} 读取元数据失败`;
    super(message);
    this.filePath = filePath;
    this.cause = cause;
  }
}

// 元数据写入错误
export class MetadataWriteError extends BaseError {
  filePath: string;
  
  constructor(filePath: string, cause?: Error) {
    const message = cause ? 
      `向文件 ${filePath} 写入元数据失败: ${cause.message}` : 
      `向文件 ${filePath} 写入元数据失败`;
    super(message);
    this.filePath = filePath;
    this.cause = cause;
  }
}

// 相对路径错误
export class RelativePathError extends BaseError {
  filePath: string;
  
  constructor(filePath: string) {
    super(`不允许使用相对路径: ${filePath}。请使用绝对路径指定文件位置。`);
    this.filePath = filePath;
  }
}

// 无效的元数据格式错误
export class InvalidMetadataFormatError extends BaseError {
  constructor(message: string) {
    super(`无效的元数据格式: ${message}`);
  }
}

// ExifTool超时错误
export class ExifToolTimeoutError extends BaseError {
  filePath: string;
  operation: string;
  timeoutMs: number;
  
  constructor(filePath: string, operation: string, timeoutMs: number, cause?: Error) {
    const message = `对文件 ${filePath} 的ExifTool操作 '${operation}' 在 ${timeoutMs}ms 后超时`;
    super(message);
    this.filePath = filePath;
    this.operation = operation;
    this.timeoutMs = timeoutMs;
    this.cause = cause;
  }
}

// ExifTool进程错误
export class ExifToolProcessError extends BaseError {
  exitCode?: number;
  stderr?: string;
  
  constructor(message: string, exitCode?: number, stderr?: string, cause?: Error) {
    const fullMessage = stderr 
      ? `${message}. ExifTool错误输出: ${stderr}` 
      : message;
    super(fullMessage);
    this.exitCode = exitCode;
    this.stderr = stderr;
    this.cause = cause;
  }
}

// MCP JSON-RPC 错误类，用于从服务器向客户端返回错误
export class JsonRpcError extends Error {
  code: number;
  data?: unknown;
  
  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = 'JsonRpcError';
    this.code = code;
    this.data = data;
    Error.captureStackTrace(this, this.constructor);
  }
  
  // 创建JSON-RPC错误响应对象
  toResponseObject() {
    return {
      code: this.code,
      message: this.message,
      data: this.data
    };
  }
} 