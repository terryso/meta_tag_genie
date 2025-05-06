import { ExifTool, type Tags } from 'exiftool-vendored';
import { FileNotFoundError, MetadataReadError, MetadataWriteError, ExifToolTimeoutError, ExifToolProcessError } from '../common/errors';
import * as fs from 'node:fs';

// 定义图片元数据参数接口
export interface ImageMetadataArgs {
  tags?: string[];
  description?: string;
  people?: string[];
  location?: string;
}

export class MetadataWriterService {
  private exiftool: ExifTool;
  // 默认ExifTool任务超时时间，单位毫秒
  private readonly defaultTaskTimeoutMs: number = 5000;

  constructor(taskTimeoutMs?: number) {
    // 使用提供的超时时间或默认超时时间
    this.exiftool = new ExifTool({ 
      taskTimeoutMillis: taskTimeoutMs || this.defaultTaskTimeoutMs 
    });
    console.log(`ExifTool实例已创建，任务超时设置为: ${taskTimeoutMs || this.defaultTaskTimeoutMs}ms`);
  }

  /**
   * 读取图片的原始元数据
   * @param filePath 图片文件路径
   * @returns Promise<Tags> 包含图片所有元数据标签的对象
   */
  async readRawMetadata(filePath: string): Promise<Tags> {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        throw new FileNotFoundError(filePath);
      }
      
      console.log(`Reading metadata for: ${filePath}`); // 临时日志
      const tags = await this.exiftool.read(filePath);
      return tags;
    } catch (error) {
      console.error(`Error reading metadata for ${filePath}:`, error);
      
      // 如果已经是自定义错误则直接抛出
      if (error instanceof FileNotFoundError) {
        throw error;
      }
      
      // 区分不同类型的ExifTool错误
      if (error instanceof Error) {
        // 检查是否为超时错误
        if (error.message.includes('timed out') || error.message.includes('timeout')) {
          throw new ExifToolTimeoutError(
            filePath, 
            'read', 
            this.defaultTaskTimeoutMs, 
            error
          );
        }
        
        // 检查是否为进程错误
        if (error.message.includes('exited with status') || 
            error.message.includes('stderr') || 
            error.message.includes('ExifTool process')) {
          
          // 尝试从错误消息中提取stderr和退出码
          let stderr: string | undefined;
          let exitCode: number | undefined;
          
          const stderrMatch = /stderr: '([^']*)'/.exec(error.message);
          if (stderrMatch?.[1]) {
            stderr = stderrMatch[1];
          }
          
          const exitCodeMatch = /exited with status (\d+)/.exec(error.message);
          if (exitCodeMatch?.[1]) {
            exitCode = Number.parseInt(exitCodeMatch[1], 10);
          }
          
          throw new ExifToolProcessError(
            `ExifTool process error while reading metadata from ${filePath}`,
            exitCode,
            stderr,
            error
          );
        }
      }
      
      // 转换为自定义错误
      throw new MetadataReadError(filePath, error as Error);
    }
  }

  /**
   * 读取图片的所有元数据（标签、描述、人物、地点）
   * @param filePath 图片文件路径
   * @returns Promise<Partial<ImageMetadataArgs>> 包含图片所有元数据的对象
   */
  async readMetadataForImage(filePath: string): Promise<Partial<ImageMetadataArgs>> {
    try {
      // 获取文件扩展名（小写）用于日志记录
      const fileExt = filePath.toLowerCase().split('.').pop() || '';
      console.log(`处理${fileExt.toUpperCase()}图片格式的元数据读取: ${filePath}`);
      
      const tagsFromFile = await this.readRawMetadata(filePath);
      const result: Partial<ImageMetadataArgs> = {};
      
      // 读取标签和人物 (Keywords/Subject)
      let allKeywords: string[] = [];
      if (tagsFromFile.Keywords) { // IPTC
        allKeywords = allKeywords.concat(Array.isArray(tagsFromFile.Keywords) 
          ? tagsFromFile.Keywords 
          : [tagsFromFile.Keywords as string]);
      }
      if (tagsFromFile.Subject) { // XMP
        const subjectKeywords = Array.isArray(tagsFromFile.Subject) 
          ? tagsFromFile.Subject 
          : [tagsFromFile.Subject as string];
        allKeywords = allKeywords.concat(subjectKeywords);
      }
      
      // 去重并赋值 (为简化，此处不区分标签和人物)
      if (allKeywords.length > 0) {
        result.tags = [...new Set(allKeywords)];
      }
      
      // 读取描述 (按优先级顺序尝试不同字段)
      if (tagsFromFile.Description) {
        result.description = tagsFromFile.Description as string;
      } else if (tagsFromFile['Caption-Abstract']) {
        result.description = tagsFromFile['Caption-Abstract'] as string;
      } else if (tagsFromFile.ImageDescription) {
        result.description = tagsFromFile.ImageDescription as string;
      }
      
      // 读取地点
      if (tagsFromFile.Location) {
        result.location = tagsFromFile.Location as string;
      }
      
      return result;
    } catch (error) {
      console.error(`Error reading metadata from ${filePath}:`, error);
      // 向上抛出错误，保持错误类型
      throw error;
    }
  }

  /**
   * 将元数据写入图片文件
   * @param filePath 图片文件路径
   * @param metadata 要写入的元数据对象，支持所有MVP元数据类型
   * @param overwrite 是否覆盖现有元数据，默认为true
   */
  async writeMetadataForImage(
    filePath: string, 
    metadata: ImageMetadataArgs, 
    overwrite = true
  ): Promise<void> {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        throw new FileNotFoundError(filePath);
      }

      // 获取文件扩展名（小写）用于日志记录
      const fileExt = filePath.toLowerCase().split('.').pop() || '';
      console.log(`处理${fileExt.toUpperCase()}图片格式的元数据写入: ${filePath}`);

      // 构建传递给exiftool的参数对象
      const exiftoolArgs: Record<string, unknown> = {};
      
      // 处理标签和人物 (合并为关键词数组)
      const allKeywords = [
        ...(metadata.tags || []), 
        ...(metadata.people || [])
      ];
      
      if (allKeywords.length > 0) {
        exiftoolArgs.Keywords = allKeywords; // IPTC:Keywords
        exiftoolArgs.Subject = allKeywords;  // XMP-dc:Subject
      }
      
      // 处理描述 (写入多个常用字段以确保兼容性)
      if (metadata.description) {
        exiftoolArgs.ImageDescription = metadata.description;  // EXIF
        exiftoolArgs['Caption-Abstract'] = metadata.description; // IPTC
        exiftoolArgs.Description = metadata.description;   // XMP
      }
      
      // 处理地点
      if (metadata.location) {
        exiftoolArgs.Location = metadata.location;
      }
      
      // 如果没有实际需要写入的元数据，则提前返回
      if (Object.keys(exiftoolArgs).length === 0) {
        console.log(`No metadata to write for ${filePath}`);
        return;
      }

      // 确定exiftool选项
      const exiftoolOptions = ['-overwrite_original'];
      
      // 如果不覆盖现有元数据，则需要合并
      if (!overwrite) {
        try {
          const existingMetadata = await this.readMetadataForImage(filePath);
          
          // 合并标签和人物
          const existingKeywords = [
            ...(existingMetadata.tags || []),
            ...(existingMetadata.people || [])
          ];
          
          if (existingKeywords.length > 0 && allKeywords.length > 0) {
            // 创建合并后的不重复关键词集合
            const mergedKeywords = [...new Set([...existingKeywords, ...allKeywords])];
            exiftoolArgs.Keywords = mergedKeywords;
            exiftoolArgs.Subject = mergedKeywords;
          }
          
          // 如果没有新的描述但存在旧的描述，保留旧的
          if (!metadata.description && existingMetadata.description) {
            exiftoolArgs.ImageDescription = existingMetadata.description;
            exiftoolArgs['Caption-Abstract'] = existingMetadata.description;
            exiftoolArgs.Description = existingMetadata.description;
          }
          
          // 如果没有新的地点但存在旧的地点，保留旧的
          if (!metadata.location && existingMetadata.location) {
            exiftoolArgs.Location = existingMetadata.location;
          }
          
        } catch (error) {
          // 如果读取失败但不是因为文件不存在，记录错误但继续尝试写入
          if (!(error instanceof FileNotFoundError)) {
            console.warn(`Failed to read existing metadata for non-overwrite mode: ${error}`);
          }
        }
      }

      // 执行写入操作
      console.log(`Writing metadata to ${filePath} with args:`, exiftoolArgs);
      await this.exiftool.write(filePath, exiftoolArgs, exiftoolOptions);
      
    } catch (error) {
      console.error(`Error writing metadata to ${filePath}:`, error);
      
      // 如果已经是自定义错误则直接抛出
      if (error instanceof FileNotFoundError) {
        throw error;
      }
      
      // 区分不同类型的ExifTool错误
      if (error instanceof Error) {
        // 检查是否为超时错误
        if (error.message.includes('timed out') || error.message.includes('timeout')) {
          throw new ExifToolTimeoutError(
            filePath, 
            'write', 
            this.defaultTaskTimeoutMs, 
            error
          );
        }
        
        // 检查是否为进程错误
        if (error.message.includes('exited with status') || 
            error.message.includes('stderr') || 
            error.message.includes('ExifTool process')) {
          
          // 尝试从错误消息中提取stderr和退出码
          let stderr: string | undefined;
          let exitCode: number | undefined;
          
          const stderrMatch = /stderr: '([^']*)'/.exec(error.message);
          if (stderrMatch?.[1]) {
            stderr = stderrMatch[1];
          }
          
          const exitCodeMatch = /exited with status (\d+)/.exec(error.message);
          if (exitCodeMatch?.[1]) {
            exitCode = Number.parseInt(exitCodeMatch[1], 10);
          }
          
          throw new ExifToolProcessError(
            `ExifTool process error while writing metadata to ${filePath}`,
            exitCode,
            stderr,
            error
          );
        }
      }
      
      // 转换为自定义错误
      throw new MetadataWriteError(filePath, error as Error);
    }
  }

  /**
   * 安全地终止ExifTool进程
   * 应在应用关闭前调用以释放资源
   */
  async end(): Promise<void> {
    try {
      await this.exiftool.end();
      console.log('ExifTool process terminated successfully.'); // 临时日志
    } catch (error) {
      console.error('Error terminating ExifTool process:', error);
      // 因为是在关闭流程中，所以不需要向上抛出错误
    }
  }
} 