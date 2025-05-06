import { ExifTool, type Tags } from 'exiftool-vendored';
import { FileNotFoundError, MetadataReadError, MetadataWriteError, ExifToolTimeoutError, ExifToolProcessError } from '../common/errors';
import * as fs from 'node:fs';

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
   * 读取图片的标签元数据
   * @param filePath 图片文件路径
   * @returns Promise<{ tags?: string[] }> 包含图片标签的对象
   */
  async readMetadataForImage(filePath: string): Promise<{ tags?: string[] }> {
    try {
      const tagsFromFile = await this.readRawMetadata(filePath);
      
      let extractedTags: string[] | undefined = undefined;
      
      // 优先从IPTC Keywords中读取标签
      if (tagsFromFile.Keywords) {
        extractedTags = Array.isArray(tagsFromFile.Keywords) 
          ? tagsFromFile.Keywords 
          : [tagsFromFile.Keywords as string];
      } 
      // 其次从XMP Subject中读取标签
      else if (tagsFromFile.Subject) {
        extractedTags = Array.isArray(tagsFromFile.Subject) 
          ? tagsFromFile.Subject 
          : [tagsFromFile.Subject as string];
      }
      
      return { tags: extractedTags };
    } catch (error) {
      console.error(`Error reading tags metadata from ${filePath}:`, error);
      // 向上抛出错误，保持错误类型
      throw error;
    }
  }

  /**
   * 将元数据写入图片文件
   * @param filePath 图片文件路径
   * @param metadata 要写入的元数据对象，目前支持 {tags?: string[]}
   * @param overwrite 是否覆盖现有元数据，默认为 true
   */
  async writeMetadataForImage(
    filePath: string, 
    metadata: { tags?: string[] }, 
    overwrite = true
  ): Promise<void> {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        throw new FileNotFoundError(filePath);
      }

      // 构建传递给 exiftool 的参数对象
      const exiftoolArgs: Record<string, unknown> = {};
      
      // 处理标签 (同时写入IPTC Keywords和XMP Subject)
      if (metadata.tags && metadata.tags.length > 0) {
        exiftoolArgs.Keywords = metadata.tags; // IPTC:Keywords
        exiftoolArgs.Subject = metadata.tags;  // XMP-dc:Subject
      }
      
      // 如果需要其他类型的元数据，可以在这里添加

      // 如果没有实际需要写入的元数据，则提前返回
      if (Object.keys(exiftoolArgs).length === 0) {
        console.log(`No metadata to write for ${filePath}`);
        return;
      }

      // 确定 exiftool 选项
      const exiftoolOptions = ['-overwrite_original'];
      
      // 如果不覆盖现有元数据，则需要添加更精细的控制
      // 注意：exiftool本身没有"仅添加缺失字段"的选项，所以这里可能需要更复杂的逻辑
      // 目前简单处理，如果不覆盖，我们先读取现有元数据，然后合并
      if (!overwrite) {
        try {
          const existingMetadata = await this.readMetadataForImage(filePath);
          
          // 合并标签 (如果已有标签)
          if (existingMetadata.tags && metadata.tags) {
            // 创建合并后的不重复标签集合
            const mergedTags = [...new Set([...existingMetadata.tags, ...metadata.tags])];
            exiftoolArgs.Keywords = mergedTags;
            exiftoolArgs.Subject = mergedTags;
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
   * 安全地终止 ExifTool 进程
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