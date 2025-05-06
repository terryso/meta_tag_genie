/**
 * writeImageMetadata Tool Handler
 *
 * 处理写入图片元数据请求的MCP Tool
 */

import { ERROR_CODES } from '../../common/errors';
import type { ImageMetadataArgs, MetadataWriterService } from '../../core/metadata-writer';

// 输入参数类型定义
export interface WriteImageMetadataParams {
  filePath: string;
  metadata: ImageMetadataArgs;
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
    
    // 调用核心服务写入所有元数据（包括标签、描述、人物、地点）
    await metadataWriter.writeMetadataForImage(
      params.filePath,
      params.metadata,
      params.overwrite
    );
    
    // 获取文件扩展名（小写）
    const fileExt = params.filePath.toLowerCase().split('.').pop() || '';
    // 根据文件扩展名构建适当的成功消息
    let successMessage = 'Metadata successfully written to image.';
    
    // 针对特定文件类型自定义消息
    if (fileExt === 'jpg' || fileExt === 'jpeg') {
      successMessage = 'Metadata successfully written to JPG image.';
    } else if (fileExt === 'png') {
      successMessage = 'Metadata successfully written to PNG image.';
    } else if (fileExt === 'heic') {
      successMessage = 'Metadata successfully written to HEIC image.';
    }
    
    // 返回成功响应
    return {
      success: true,
      filePath: params.filePath,
      message: successMessage,
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