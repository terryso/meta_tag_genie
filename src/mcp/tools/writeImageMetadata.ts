/**
 * writeImageMetadata Tool Handler
 *
 * 处理写入图片元数据请求的MCP Tool
 */

import { ERROR_CODES } from '../../common/errors';
import type { MetadataWriterService } from '../../core/metadata-writer';

// 输入参数类型定义
export interface WriteImageMetadataParams {
  filePath: string;
  metadata: {
    tags?: string[];
    description?: string;
    people?: string[];
    location?: string;
  };
  overwrite: boolean;
}

// 错误数据接口
export interface ErrorData {
  filePath: string;
  [key: string]: unknown;
}

// 成功响应类型定义
export interface WriteImageMetadataResult {
  success: boolean;
  filePath: string;
  message: string;
  errorCode?: number;
  errorData?: ErrorData;
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
    console.log('Processing writeImageMetadata request for file:', params.filePath);
    
    // 从上下文中获取MetadataWriterService实例
    const { metadataWriter } = context.app;
    
    // 提取当前Story 1.4重点关注的标签元数据
    const metadataToPass: { tags?: string[] } = {};
    if (params.metadata.tags) {
      metadataToPass.tags = params.metadata.tags;
    }
    
    // 调用核心服务写入元数据
    await metadataWriter.writeMetadataForImage(
      params.filePath,
      metadataToPass,
      params.overwrite
    );
    
    // 返回成功响应
    return {
      success: true,
      filePath: params.filePath,
      message: '标签元数据已成功写入到JPG图片。',
    };
  } catch (error) {
    console.error('Error in writeImageMetadata tool handler:', error);
    
    // 根据错误类型返回适当的错误结果对象
    if (error instanceof Error) {
      // 检查是否是FileNotFoundError
      if (error.name === 'FileNotFoundError') {
        return {
          success: false,
          filePath: params.filePath,
          message: `文件不存在: ${params.filePath}`,
          errorCode: ERROR_CODES.FILE_NOT_FOUND,
          errorData: { filePath: params.filePath }
        };
      }
      
      // 检查是否是MetadataWriteError
      if (error.name === 'MetadataWriteError') {
        return {
          success: false,
          filePath: params.filePath,
          message: `写入元数据失败: ${error.message}`,
          errorCode: ERROR_CODES.METADATA_WRITE_FAILED,
          errorData: { filePath: params.filePath }
        };
      }
      
      // 检查错误消息是否包含'file not found'
      if (error.message?.toLowerCase().includes('file not found')) {
        return {
          success: false,
          filePath: params.filePath,
          message: `ExifTool未找到文件: ${params.filePath}`,
          errorCode: ERROR_CODES.FILE_NOT_FOUND,
          errorData: { filePath: params.filePath }
        };
      }
    }
    
    // 通用内部错误
    return {
      success: false,
      filePath: params.filePath,
      message: `处理文件时发生内部错误: ${error instanceof Error ? error.message : String(error)}`,
      errorCode: ERROR_CODES.INTERNAL_ERROR,
      errorData: { filePath: params.filePath }
    };
  }
} 