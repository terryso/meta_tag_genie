/**
 * writeImageMetadata Tool Handler
 *
 * 处理写入图片元数据请求的MCP Tool
 */

import { 
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
    // 如果已经是JsonRpcError类型，获取其信息
    if (error instanceof JsonRpcError) {
      return {
        success: false,
        filePath: params.filePath,
        message: error.message
      };
    }
    
    // 将捕获的错误映射到合适的错误信息
    if (error instanceof FileNotFoundError) {
      return {
        success: false,
        filePath: error.filePath,
        message: `文件未找到: ${error.message}`
      };
    }
    if (error instanceof FileAccessError) {
      const operation = error.operation === 'write' ? '写入' : '读取';
      return {
        success: false,
        filePath: error.filePath,
        message: `文件${operation}权限错误: ${error.message}`
      };
    }
    if (error instanceof UnsupportedFileFormatError) {
      return {
        success: false,
        filePath: error.filePath,
        message: `不支持的文件格式: ${error.format} - ${error.message}`
      };
    }
    if (error instanceof RelativePathError) {
      return {
        success: false,
        filePath: error.filePath,
        message: `不允许使用相对路径: ${error.message}`
      };
    }
    if (error instanceof ExifToolTimeoutError) {
      return {
        success: false,
        filePath: error.filePath,
        message: `ExifTool执行超时: ${error.message}`
      };
    }
    if (error instanceof ExifToolProcessError) {
      return {
        success: false,
        filePath: params.filePath,
        message: `ExifTool处理错误: ${error.message}`
      };
    }
    if (error instanceof MetadataWriteError) {
      return {
        success: false,
        filePath: error.filePath,
        message: `元数据写入失败: ${error.message}`
      };
    }
    if (error instanceof InvalidMetadataFormatError) {
      return {
        success: false,
        filePath: params.filePath,
        message: `无效的元数据格式: ${error.message}`
      };
    }
    
    // 其他未知错误
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      filePath: params.filePath,
      message: `写入元数据时发生内部错误: ${errorMessage}`
    };
  }
}

/**
 * 验证元数据参数的额外业务逻辑
 */
function validateMetadataParams(params: WriteImageMetadataParams): void {
  // 常量定义
  const MAX_DESCRIPTION_LENGTH = 10000;
  const MAX_LOCATION_LENGTH = 1000;
  const MAX_TAG_LENGTH = 100;
  const MAX_PERSON_NAME_LENGTH = 100;
  const MAX_TAGS_COUNT = 50;
  const MAX_PEOPLE_COUNT = 50;

  // 检查标签数组中是否有空字符串或过长的标签
  if (params.metadata?.tags) {
    // 检查标签数量是否过多
    if (params.metadata.tags.length > MAX_TAGS_COUNT) {
      throw new InvalidMetadataFormatError(
        `标签数量过多，最多允许${MAX_TAGS_COUNT}个标签`
      );
    }
    
    // 检查每个标签
    const invalidTags = params.metadata.tags.filter(tag => tag.trim() === '');
    if (invalidTags.length > 0) {
      throw new InvalidMetadataFormatError(
        '标签不能为空字符串'
      );
    }
    
    // 检查标签长度
    const longTags = params.metadata.tags.filter(tag => tag.length > MAX_TAG_LENGTH);
    if (longTags.length > 0) {
      throw new InvalidMetadataFormatError(
        `标签长度不能超过${MAX_TAG_LENGTH}个字符`
      );
    }
  }
  
  // 检查人物数组中是否有空字符串或过长的名称
  if (params.metadata?.people) {
    // 检查人物数量是否过多
    if (params.metadata.people.length > MAX_PEOPLE_COUNT) {
      throw new InvalidMetadataFormatError(
        `人物数量过多，最多允许${MAX_PEOPLE_COUNT}个人物`
      );
    }
    
    // 检查每个人物名称
    const invalidPeople = params.metadata.people.filter(person => person.trim() === '');
    if (invalidPeople.length > 0) {
      throw new InvalidMetadataFormatError(
        '人物名称不能为空字符串'
      );
    }
    
    // 检查人物名称长度
    const longNames = params.metadata.people.filter(person => person.length > MAX_PERSON_NAME_LENGTH);
    if (longNames.length > 0) {
      throw new InvalidMetadataFormatError(
        `人物名称长度不能超过${MAX_PERSON_NAME_LENGTH}个字符`
      );
    }
  }
  
  // 检查描述长度是否过长
  if (params.metadata?.description) {
    if (params.metadata.description.length > MAX_DESCRIPTION_LENGTH) {
      throw new InvalidMetadataFormatError(
        `描述文本过长，最大允许${MAX_DESCRIPTION_LENGTH}个字符`
      );
    }
  }
  
  // 检查地点文本长度是否过长
  if (params.metadata?.location) {
    if (params.metadata.location.length > MAX_LOCATION_LENGTH) {
      throw new InvalidMetadataFormatError(
        `地点文本过长，最大允许${MAX_LOCATION_LENGTH}个字符`
      );
    }
  }
} 