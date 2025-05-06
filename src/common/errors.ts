/**
 * 应用程序中使用的自定义错误类型定义
 */

// 错误码映射，用于 MCP JSON-RPC 错误响应
export const ERROR_CODES = {
  FILE_NOT_FOUND: -32001,
  UNSUPPORTED_FILE_FORMAT: -32002,
  METADATA_READ_FAILED: -32003,
  METADATA_WRITE_FAILED: -32004,
  INVALID_METADATA_FORMAT: -32005,
  EXIFTOOL_TIMEOUT: -32006,
  EXIFTOOL_PROCESS_ERROR: -32007,
  INTERNAL_ERROR: -32603, // JSON-RPC 默认内部错误码
};

// 基础自定义错误类
export class BaseError extends Error {
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
    super(`File not found: ${filePath}`);
    this.filePath = filePath;
  }
}

// 不支持的文件格式错误
export class UnsupportedFileFormatError extends BaseError {
  filePath: string;
  format: string;
  
  constructor(filePath: string, format: string) {
    super(`Unsupported file format: ${format} for file: ${filePath}`);
    this.filePath = filePath;
    this.format = format;
  }
}

// 元数据读取错误
export class MetadataReadError extends BaseError {
  filePath: string;
  
  constructor(filePath: string, cause?: Error) {
    const message = cause ? 
      `Failed to read metadata from ${filePath}: ${cause.message}` : 
      `Failed to read metadata from ${filePath}`;
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
      `Failed to write metadata to ${filePath}: ${cause.message}` : 
      `Failed to write metadata to ${filePath}`;
    super(message);
    this.filePath = filePath;
    this.cause = cause;
  }
}

// 无效的元数据格式错误
export class InvalidMetadataFormatError extends BaseError {
  constructor(message: string) {
    super(`Invalid metadata format: ${message}`);
  }
}

// ExifTool超时错误
export class ExifToolTimeoutError extends BaseError {
  filePath: string;
  operation: string;
  timeoutMs: number;
  
  constructor(filePath: string, operation: string, timeoutMs: number, cause?: Error) {
    const message = `ExifTool operation '${operation}' timed out after ${timeoutMs}ms on file: ${filePath}`;
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
      ? `${message}. ExifTool stderr: ${stderr}` 
      : message;
    super(fullMessage);
    this.exitCode = exitCode;
    this.stderr = stderr;
    this.cause = cause;
  }
} 