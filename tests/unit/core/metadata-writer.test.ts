import { MetadataWriterService } from '../../../src/core/metadata-writer';
import { ExifTool } from 'exiftool-vendored';
import { jest } from '@jest/globals';
import { FileNotFoundError, MetadataWriteError, ExifToolTimeoutError, ExifToolProcessError } from '../../../src/common/errors';
import * as fs from 'node:fs';

// Mock ExifTool
jest.mock('exiftool-vendored', () => {
  return {
    ExifTool: jest.fn().mockImplementation(() => {
      return {
        read: jest.fn(),
        write: jest.fn(),
        end: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

// Mock fs
jest.mock('node:fs', () => {
  return {
    existsSync: jest.fn(),
  };
});

describe('MetadataWriterService', () => {
  let service: MetadataWriterService;
  let mockExifTool: unknown;
  
  beforeEach(() => {
    // 清除所有mock的调用记录
    jest.clearAllMocks();
    
    // 重置 fs.existsSync 默认返回值为true（文件存在）
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    
    // 创建服务实例
    service = new MetadataWriterService();
    
    // 获取被mock的ExifTool实例，用于验证方法调用
    mockExifTool = (ExifTool as unknown as jest.Mock).mock.results[0].value;
  });
  
  describe('constructor', () => {
    it('应使用默认超时时间(5000ms)初始化ExifTool', () => {
      // 测试构造函数
      expect(ExifTool).toHaveBeenCalledWith({ taskTimeoutMillis: 5000 });
    });
    
    it('应使用自定义超时时间初始化ExifTool', () => {
      // 创建新实例前清除mock调用记录
      jest.clearAllMocks();
      
      // 调用构造函数
      new MetadataWriterService(10000);
      
      // 验证调用
      expect(ExifTool).toHaveBeenCalledWith({ taskTimeoutMillis: 10000 });
    });
  });
  
  describe('readRawMetadata', () => {
    it('调用ExifTool.read读取元数据', async () => {
      const mockTags = { Keywords: ['tag1', 'tag2'] };
      (mockExifTool as any).read.mockResolvedValueOnce(mockTags);
      
      const result = await service.readRawMetadata('test.jpg');
      
      expect((mockExifTool as any).read).toHaveBeenCalledWith('test.jpg');
      expect(result).toEqual(mockTags);
    });
    
    it('当文件不存在时抛出FileNotFoundError', async () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);
      
      await expect(service.readRawMetadata('nonexistent.jpg')).rejects.toThrow(FileNotFoundError);
      expect((mockExifTool as any).read).not.toHaveBeenCalled();
    });
    
    it('当ExifTool.read失败时正确处理错误', async () => {
      const mockError = new Error('ExifTool error');
      (mockExifTool as any).read.mockRejectedValueOnce(mockError);
      
      await expect(service.readRawMetadata('test.jpg')).rejects.toThrow();
      expect((mockExifTool as any).read).toHaveBeenCalledWith('test.jpg');
    });
    
    it('当ExifTool超时时抛出ExifToolTimeoutError', async () => {
      const timeoutError = new Error('Operation timed out after 5000ms');
      (mockExifTool as any).read.mockRejectedValueOnce(timeoutError);
      
      await expect(service.readRawMetadata('test.jpg')).rejects.toThrow(ExifToolTimeoutError);
      
      try {
        await service.readRawMetadata('test.jpg');
      } catch (error) {
        expect(error).toBeInstanceOf(ExifToolTimeoutError);
        expect((error as ExifToolTimeoutError).operation).toBe('read');
        expect((error as ExifToolTimeoutError).timeoutMs).toBe(5000);
        expect((error as ExifToolTimeoutError).filePath).toBe('test.jpg');
      }
    });
    
    it('当ExifTool进程错误时抛出ExifToolProcessError', async () => {
      const processError = new Error('ExifTool process exited with status 1, stderr: \'Unknown file type\'');
      (mockExifTool as any).read.mockRejectedValueOnce(processError);
      
      await expect(service.readRawMetadata('test.jpg')).rejects.toThrow(ExifToolProcessError);
      
      try {
        await service.readRawMetadata('test.jpg');
      } catch (error) {
        expect(error).toBeInstanceOf(ExifToolProcessError);
        expect((error as ExifToolProcessError).exitCode).toBe(1);
        expect((error as ExifToolProcessError).stderr).toBe('Unknown file type');
      }
    });
  });
  
  describe('readMetadataForImage', () => {
    it('从Keywords中提取标签', async () => {
      const mockTags = { Keywords: ['tag1', 'tag2'] };
      (mockExifTool as any).read.mockResolvedValueOnce(mockTags);
      
      const result = await service.readMetadataForImage('test.jpg');
      
      expect(result).toEqual({ tags: ['tag1', 'tag2'] });
    });
    
    it('如果Keywords是字符串而非数组，则正确转换', async () => {
      const mockTags = { Keywords: 'single-tag' };
      (mockExifTool as any).read.mockResolvedValueOnce(mockTags);
      
      const result = await service.readMetadataForImage('test.jpg');
      
      expect(result).toEqual({ tags: ['single-tag'] });
    });
    
    it('如果没有Keywords但有Subject，则从Subject提取标签', async () => {
      const mockTags = { Subject: ['tag1', 'tag2'] };
      (mockExifTool as any).read.mockResolvedValueOnce(mockTags);
      
      const result = await service.readMetadataForImage('test.jpg');
      
      expect(result).toEqual({ tags: ['tag1', 'tag2'] });
    });
    
    it('如果既没有Keywords也没有Subject，则返回空对象', async () => {
      const mockTags = { OtherField: 'value' };
      (mockExifTool as any).read.mockResolvedValueOnce(mockTags);
      
      const result = await service.readMetadataForImage('test.jpg');
      
      expect(result).toEqual({});
    });

    it('应正确读取描述信息', async () => {
      const mockTags = { Description: '这是一张照片的描述' };
      (mockExifTool as any).read.mockResolvedValueOnce(mockTags);
      
      const result = await service.readMetadataForImage('test.jpg');
      
      expect(result).toEqual({ description: '这是一张照片的描述' });
    });
    
    it('应从不同的描述字段中按优先级读取', async () => {
      const mockTags = { 
        'Caption-Abstract': '标题描述', 
        ImageDescription: '图片描述' 
      };
      (mockExifTool as any).read.mockResolvedValueOnce(mockTags);
      
      const result = await service.readMetadataForImage('test.jpg');
      
      // 按代码中定义的优先级，应该读取 Caption-Abstract
      expect(result).toEqual({ description: '标题描述' });
    });
    
    it('应正确读取地点信息', async () => {
      const mockTags = { Location: '北京，中国' };
      (mockExifTool as any).read.mockResolvedValueOnce(mockTags);
      
      const result = await service.readMetadataForImage('test.jpg');
      
      expect(result).toEqual({ location: '北京，中国' });
    });
    
    it('应能同时读取所有类型的元数据', async () => {
      const mockTags = { 
        Keywords: ['风景', '旅行'],
        Description: '2023年夏天的旅行照片',
        Location: '上海，中国'
      };
      (mockExifTool as any).read.mockResolvedValueOnce(mockTags);
      
      const result = await service.readMetadataForImage('test.jpg');
      
      expect(result).toEqual({
        tags: ['风景', '旅行'],
        description: '2023年夏天的旅行照片',
        location: '上海，中国'
      });
    });

    it('应能从PNG格式图片读取所有类型的元数据', async () => {
      const mockTags = { 
        Keywords: ['自然', 'PNG测试'],
        Description: 'PNG格式的测试图片',
        Location: '上海，中国'
      };
      (mockExifTool as any).read.mockResolvedValueOnce(mockTags);
      
      const result = await service.readMetadataForImage('test.png');
      
      expect(result).toEqual({
        tags: ['自然', 'PNG测试'],
        description: 'PNG格式的测试图片',
        location: '上海，中国'
      });
      expect((mockExifTool as any).read).toHaveBeenCalledWith('test.png');
    });
  });
  
  describe('writeMetadataForImage', () => {
    it('调用ExifTool.write写入标签元数据', async () => {
      await service.writeMetadataForImage('test.jpg', { tags: ['tag1', 'tag2'] });
      
      expect((mockExifTool as any).write).toHaveBeenCalledWith(
        'test.jpg',
        { Keywords: ['tag1', 'tag2'], Subject: ['tag1', 'tag2'] },
        ['-overwrite_original']
      );
    });
    
    it('调用ExifTool.write写入描述元数据', async () => {
      await service.writeMetadataForImage('test.jpg', { 
        description: '这是一张测试照片'
      });
      
      expect((mockExifTool as any).write).toHaveBeenCalledWith(
        'test.jpg',
        { 
          ImageDescription: '这是一张测试照片',
          'Caption-Abstract': '这是一张测试照片',
          Description: '这是一张测试照片'
        },
        ['-overwrite_original']
      );
    });
    
    it('调用ExifTool.write写入人物元数据', async () => {
      await service.writeMetadataForImage('test.jpg', { 
        people: ['张三', '李四']
      });
      
      expect((mockExifTool as any).write).toHaveBeenCalledWith(
        'test.jpg',
        { 
          Keywords: ['张三', '李四'],
          Subject: ['张三', '李四']
        },
        ['-overwrite_original']
      );
    });
    
    it('调用ExifTool.write写入地点元数据', async () => {
      await service.writeMetadataForImage('test.jpg', { 
        location: '杭州，中国'
      });
      
      expect((mockExifTool as any).write).toHaveBeenCalledWith(
        'test.jpg',
        { Location: '杭州，中国' },
        ['-overwrite_original']
      );
    });
    
    it('调用ExifTool.write写入所有类型的元数据', async () => {
      await service.writeMetadataForImage('test.jpg', { 
        tags: ['风景', '建筑'],
        description: '杭州西湖风景',
        people: ['张三', '李四'],
        location: '杭州，中国'
      });
      
      expect((mockExifTool as any).write).toHaveBeenCalledWith(
        'test.jpg',
        { 
          Keywords: ['风景', '建筑', '张三', '李四'],
          Subject: ['风景', '建筑', '张三', '李四'],
          ImageDescription: '杭州西湖风景',
          'Caption-Abstract': '杭州西湖风景',
          Description: '杭州西湖风景',
          Location: '杭州，中国'
        },
        ['-overwrite_original']
      );
    });
    
    it('当没有要写入的元数据时不调用ExifTool.write', async () => {
      await service.writeMetadataForImage('test.jpg', {});
      
      expect(mockExifTool.write).not.toHaveBeenCalled();
    });
    
    it('当文件不存在时抛出FileNotFoundError', async () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);
      
      await expect(service.writeMetadataForImage('nonexistent.jpg', { tags: ['tag'] }))
        .rejects.toThrow(FileNotFoundError);
      expect(mockExifTool.write).not.toHaveBeenCalled();
    });
    
    it('当ExifTool.write失败时正确处理错误', async () => {
      const mockError = new Error('ExifTool write error');
      mockExifTool.write.mockRejectedValueOnce(mockError);
      
      await expect(service.writeMetadataForImage('test.jpg', { tags: ['tag'] }))
        .rejects.toThrow(MetadataWriteError);
      expect(mockExifTool.write).toHaveBeenCalled();
    });
    
    it('当overwrite为false时，应合并现有标签', async () => {
      // 模拟读取现有标签
      mockExifTool.read.mockResolvedValueOnce({ Keywords: ['existing1', 'existing2'] });
      
      await service.writeMetadataForImage('test.jpg', { tags: ['new1', 'existing1'] }, false);
      
      // 验证写入的是合并后的不重复标签
      expect(mockExifTool.write).toHaveBeenCalledWith(
        'test.jpg',
        { Keywords: ['existing1', 'existing2', 'new1'], Subject: ['existing1', 'existing2', 'new1'] },
        ['-overwrite_original']
      );
    });

    it('当overwrite为false时，应保留现有描述和地点', async () => {
      // 模拟读取现有元数据
      mockExifTool.read.mockResolvedValueOnce({
        Description: '原始描述',
        Location: '原始地点'
      });
      
      // 只提供标签，不提供描述和地点
      await service.writeMetadataForImage('test.jpg', { tags: ['new-tag'] }, false);
      
      // 验证写入内容包含了保留的描述和地点
      expect(mockExifTool.write).toHaveBeenCalledWith(
        'test.jpg',
        { 
          Keywords: ['new-tag'], 
          Subject: ['new-tag'],
          ImageDescription: '原始描述',
          'Caption-Abstract': '原始描述',
          Description: '原始描述',
          Location: '原始地点'
        },
        ['-overwrite_original']
      );
    });

    it('当ExifTool.write超时时抛出ExifToolTimeoutError', async () => {
      const timeoutError = new Error('Operation timed out after 5000ms');
      mockExifTool.write.mockRejectedValueOnce(timeoutError);
      
      await expect(service.writeMetadataForImage('test.jpg', { tags: ['tag'] }))
        .rejects.toThrow(ExifToolTimeoutError);
      
      try {
        await service.writeMetadataForImage('test.jpg', { tags: ['tag'] });
      } catch (error) {
        expect(error).toBeInstanceOf(ExifToolTimeoutError);
        expect((error as ExifToolTimeoutError).operation).toBe('write');
        expect((error as ExifToolTimeoutError).timeoutMs).toBe(5000);
        expect((error as ExifToolTimeoutError).filePath).toBe('test.jpg');
      }
    });
    
    it('当ExifTool.write进程错误时抛出ExifToolProcessError', async () => {
      const processError = new Error('ExifTool process exited with status 2, stderr: \'Read-only file system\'');
      mockExifTool.write.mockRejectedValueOnce(processError);
      
      await expect(service.writeMetadataForImage('test.jpg', { tags: ['tag'] }))
        .rejects.toThrow(ExifToolProcessError);
      
      try {
        await service.writeMetadataForImage('test.jpg', { tags: ['tag'] });
      } catch (error) {
        expect(error).toBeInstanceOf(ExifToolProcessError);
        expect((error as ExifToolProcessError).exitCode).toBe(2);
        expect((error as ExifToolProcessError).stderr).toBe('Read-only file system');
      }
    });

    // PNG文件相关测试用例
    it('调用ExifTool.write写入PNG格式图片的标签元数据', async () => {
      await service.writeMetadataForImage('test.png', { tags: ['tag1', 'tag2'] });
      
      expect((mockExifTool as any).write).toHaveBeenCalledWith(
        'test.png',
        { Keywords: ['tag1', 'tag2'], Subject: ['tag1', 'tag2'] },
        ['-overwrite_original']
      );
    });
    
    it('调用ExifTool.write写入PNG格式图片的描述元数据', async () => {
      await service.writeMetadataForImage('test.png', { 
        description: '这是一张PNG测试图片'
      });
      
      expect((mockExifTool as any).write).toHaveBeenCalledWith(
        'test.png',
        { 
          ImageDescription: '这是一张PNG测试图片',
          'Caption-Abstract': '这是一张PNG测试图片',
          Description: '这是一张PNG测试图片'
        },
        ['-overwrite_original']
      );
    });
    
    it('调用ExifTool.write写入PNG格式图片的所有MVP元数据类型', async () => {
      await service.writeMetadataForImage('test.png', { 
        tags: ['风景', '建筑'],
        description: '北京故宫风景',
        people: ['张三', '李四'],
        location: '北京，中国'
      });
      
      expect((mockExifTool as any).write).toHaveBeenCalledWith(
        'test.png',
        { 
          Keywords: ['风景', '建筑', '张三', '李四'],
          Subject: ['风景', '建筑', '张三', '李四'],
          ImageDescription: '北京故宫风景',
          'Caption-Abstract': '北京故宫风景',
          Description: '北京故宫风景',
          Location: '北京，中国'
        },
        ['-overwrite_original']
      );
    });
    
    it('PNG格式图片写入失败时应抛出MetadataWriteError', async () => {
      const mockError = new Error('ExifTool write error for PNG');
      mockExifTool.write.mockRejectedValueOnce(mockError);
      
      await expect(service.writeMetadataForImage('test.png', { tags: ['tag'] }))
        .rejects.toThrow(MetadataWriteError);
    });

    // HEIC文件相关测试用例
    it('调用ExifTool.write写入HEIC格式图片的标签元数据', async () => {
      await service.writeMetadataForImage('test.heic', { tags: ['tag1', 'tag2'] });
      
      expect((mockExifTool as any).write).toHaveBeenCalledWith(
        'test.heic',
        { Keywords: ['tag1', 'tag2'], Subject: ['tag1', 'tag2'] },
        ['-overwrite_original']
      );
    });
    
    it('调用ExifTool.write写入HEIC格式图片的描述元数据', async () => {
      await service.writeMetadataForImage('test.heic', { 
        description: '这是一张HEIC测试图片'
      });
      
      expect((mockExifTool as any).write).toHaveBeenCalledWith(
        'test.heic',
        { 
          ImageDescription: '这是一张HEIC测试图片',
          'Caption-Abstract': '这是一张HEIC测试图片',
          Description: '这是一张HEIC测试图片'
        },
        ['-overwrite_original']
      );
    });
    
    it('调用ExifTool.write写入HEIC格式图片的所有MVP元数据类型', async () => {
      await service.writeMetadataForImage('test.heic', { 
        tags: ['风景', '建筑'],
        description: '上海东方明珠风景',
        people: ['张三', '李四'],
        location: '上海，中国'
      });
      
      expect((mockExifTool as any).write).toHaveBeenCalledWith(
        'test.heic',
        { 
          Keywords: ['风景', '建筑', '张三', '李四'],
          Subject: ['风景', '建筑', '张三', '李四'],
          ImageDescription: '上海东方明珠风景',
          'Caption-Abstract': '上海东方明珠风景',
          Description: '上海东方明珠风景',
          Location: '上海，中国'
        },
        ['-overwrite_original']
      );
    });
    
    it('HEIC格式图片写入失败时应抛出MetadataWriteError', async () => {
      const mockError = new Error('ExifTool write error for HEIC');
      mockExifTool.write.mockRejectedValueOnce(mockError);
      
      await expect(service.writeMetadataForImage('test.heic', { tags: ['tag'] }))
        .rejects.toThrow(MetadataWriteError);
    });
    
    it('应能从HEIC格式图片读取所有类型的元数据', async () => {
      const mockTags = { 
        Keywords: ['自然', 'HEIC测试'],
        Description: 'HEIC格式的测试图片',
        Location: '上海，中国'
      };
      (mockExifTool as any).read.mockResolvedValueOnce(mockTags);
      
      const result = await service.readMetadataForImage('test.heic');
      
      expect(result).toEqual({
        tags: ['自然', 'HEIC测试'],
        description: 'HEIC格式的测试图片',
        location: '上海，中国'
      });
      expect((mockExifTool as any).read).toHaveBeenCalledWith('test.heic');
    });
  });
  
  describe('end', () => {
    it('安全地终止ExifTool进程', async () => {
      await service.end();
      
      expect(mockExifTool.end).toHaveBeenCalled();
    });
    
    it('当ExifTool.end失败时捕获错误但不抛出', async () => {
      mockExifTool.end.mockRejectedValueOnce(new Error('End error'));
      
      // 不应抛出错误
      await expect(service.end()).resolves.not.toThrow();
      expect(mockExifTool.end).toHaveBeenCalled();
    });
  });
}); 