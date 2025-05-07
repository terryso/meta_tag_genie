/**
 * writeImageMetadata Tool Handler
 *
 * 处理写入图片元数据请求的MCP Tool
 */

import { 
  ERROR_CODES, 
  JsonRpcError,
  FileNotFoundError,
  FileAccessError,
  UnsupportedFileFormatError,
  MetadataWriteError,
  ExifToolTimeoutError,
  ExifToolProcessError,
  InvalidMetadataFormatError,
  RelativePathError
} from '../../common/errors';
import type { ImageMetadataArgs, MetadataWriterService } from '../../core/metadata-writer';
import * as path from 'node:path';

// 输入参数类型定义
export interface WriteImageMetadataParams {
  filePath: string;
  metadata: ImageMetadataArgs;
  overwrite: boolean;
}

// 输出结果类型定义
export interface WriteImageMetadataResult {
  success: boolean;
  filePath: string;
  message: string;
}

/**
 * 检查路径是否为相对路径
 * @param filePath 文件路径
 * @returns boolean 是否为相对路径
 */
function isRelativePath(filePath: string): boolean {
  // 检查路径是否为绝对路径
  return !path.isAbsolute(filePath);
}

/**
 * writeImageMetadata Tool的主处理函数
 * @param params 客户端传递的参数
 * @param context 包含应用程序上下文的对象，包括MetadataWriterService实例
 */
export async function writeImageMetadataHandler(
  params: WriteImageMetadataParams,
  context: { app: { metadataWriter: MetadataWriterService } }
): Promise<WriteImageMetadataResult> {
  try {
    console.log('处理writeImageMetadata请求，文件:', params.filePath);
    
    // 检查是否为相对路径
    if (isRelativePath(params.filePath)) {
      throw new RelativePathError(params.filePath);
    }
    
    // 检查参数有效性（额外业务逻辑校验）
    validateMetadataParams(params);
    
    // 从上下文中获取MetadataWriterService实例
    const { metadataWriter } = context.app;
    
    // 调用核心服务写入所有元数据（包括标签、描述、人物、地点）
    await metadataWriter.writeMetadataForImage(
      params.filePath,
      params.metadata,
      params.overwrite
    );
    
    // 获取文件扩展名（小写）
    const fileExt = params.filePath.toLowerCase().split('.').pop() || '';
    // 根据文件扩展名构建适当的成功消息
    let successMessage = '元数据已成功写入图片。';
    
    // 针对特定文件类型自定义消息
    if (fileExt === 'jpg' || fileExt === 'jpeg') {
      successMessage = '元数据已成功写入JPG图片。';
    } else if (fileExt === 'png') {
      successMessage = '元数据已成功写入PNG图片。';
    } else if (fileExt === 'heic') {
      successMessage = '元数据已成功写入HEIC图片。';
    }
    
    // 返回成功响应
    return {
      success: true,
      filePath: params.filePath,
      message: successMessage,
    };
  } catch (error) {
    console.error('writeImageMetadata工具处理器出错:', error);
    
    // 如果已经是JsonRpcError类型，直接向上抛出
    if (error instanceof JsonRpcError) {
      throw error;
    }
    
    // 将捕获的错误映射到适当的JsonRpcError
    if (error instanceof FileNotFoundError) {
      throw new JsonRpcError(
        ERROR_CODES.FILE_NOT_FOUND, 
        error.message, 
        { filePath: error.filePath }
      );
    }
    if (error instanceof FileAccessError) {
      const code = error.operation === 'write' 
        ? ERROR_CODES.FILE_NOT_WRITABLE 
        : ERROR_CODES.FILE_NOT_READABLE;
      throw new JsonRpcError(
        code, 
        error.message, 
        { filePath: error.filePath, operation: error.operation }
      );
    }
    if (error instanceof UnsupportedFileFormatError) {
      throw new JsonRpcError(
        ERROR_CODES.UNSUPPORTED_FILE_FORMAT, 
        error.message, 
        { filePath: error.filePath, format: error.format }
      );
    }
    if (error instanceof RelativePathError) {
      throw new JsonRpcError(
        ERROR_CODES.RELATIVE_PATH_NOT_ALLOWED,
        error.message,
        { filePath: error.filePath }
      );
    }
    if (error instanceof ExifToolTimeoutError) {
      throw new JsonRpcError(
        ERROR_CODES.EXIFTOOL_TIMEOUT, 
        error.message, 
        { 
          filePath: error.filePath,
          operation: error.operation,
          timeoutMs: error.timeoutMs
        }
      );
    }
    if (error instanceof ExifToolProcessError) {
      throw new JsonRpcError(
        ERROR_CODES.EXIFTOOL_PROCESS_ERROR, 
        error.message, 
        { 
          exitCode: error.exitCode,
          stderr: error.stderr 
        }
      );
    }
    if (error instanceof MetadataWriteError) {
      throw new JsonRpcError(
        ERROR_CODES.METADATA_WRITE_FAILED, 
        error.message, 
        { filePath: error.filePath }
      );
    }
    if (error instanceof InvalidMetadataFormatError) {
      throw new JsonRpcError(
        ERROR_CODES.INVALID_METADATA_STRUCTURE, 
        error.message
      );
    }
    
    // 其他未知错误转换为通用内部错误
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new JsonRpcError(
      ERROR_CODES.JSON_RPC_INTERNAL_ERROR, 
      `写入元数据时发生内部错误: ${errorMessage}`
    );
  }
}

/**
 * 验证元数据参数的额外业务逻辑
 */
function validateMetadataParams(params: WriteImageMetadataParams): void {
  // 检查标签数组中是否有空字符串
  if (params.metadata?.tags?.some(tag => tag.trim() === '')) {
    throw new JsonRpcError(
      ERROR_CODES.INVALID_METADATA_STRUCTURE, 
      '标签不能为空字符串', 
      { invalidTags: params.metadata.tags.filter(tag => tag.trim() === '') }
    );
  }
  
  // 检查人物数组中是否有空字符串
  if (params.metadata?.people?.some(person => person.trim() === '')) {
    throw new JsonRpcError(
      ERROR_CODES.INVALID_METADATA_STRUCTURE, 
      '人物名称不能为空字符串', 
      { invalidPeople: params.metadata.people.filter(person => person.trim() === '') }
    );
  }
  
  // 检查描述长度是否过长
  if (params.metadata?.description && params.metadata.description.length > 10000) {
    throw new JsonRpcError(
      ERROR_CODES.INVALID_METADATA_STRUCTURE, 
      '描述文本过长，最大允许10000个字符', 
      { 
        descriptionLength: params.metadata.description.length,
        maxLength: 10000 
      }
    );
  }
  
  // 检查地点文本长度是否过长
  if (params.metadata?.location && params.metadata.location.length > 1000) {
    throw new JsonRpcError(
      ERROR_CODES.INVALID_METADATA_STRUCTURE, 
      '地点文本过长，最大允许1000个字符', 
      { 
        locationLength: params.metadata.location.length,
        maxLength: 1000 
      }
    );
  }
} 