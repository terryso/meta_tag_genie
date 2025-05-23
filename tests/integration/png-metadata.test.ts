/**
 * PNG图片元数据写入集成测试
 * 
 * 此测试验证writeImageMetadata工具对PNG图片格式的支持关键逻辑
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { MetadataWriterService } from '../../src/core/metadata-writer';

// 测试超时设置
const TEST_TIMEOUT = 10000;

// 确保测试目录存在
const _ensureTestFixturesDir = () => {
  const fixturesDir = path.join(__dirname, '..', 'fixtures');
  const imagesDir = path.join(fixturesDir, 'images');
  
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir);
  }
  
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir);
  }
  
  return imagesDir;
};

// 执行测试
describe('PNG图片元数据写入测试', () => {
  // 测试上下文
  let tempDir: string;
  let tempPngPath: string;
  let writer: MetadataWriterService;
  
  // 测试前准备
  beforeAll(async () => {
    // 创建临时目录
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'png-metadata-test-'));
    tempPngPath = path.join(tempDir, 'test.png');
    
    // 创建一个空的PNG文件用于测试
    fs.writeFileSync(tempPngPath, Buffer.from(''));
    
    // 实例化MetadataWriterService
    writer = new MetadataWriterService();
  });
  
  // 测试后清理
  afterAll(async () => {
    // 关闭MetadataWriterService
    await writer.end();
    
    // 清理临时文件和目录
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
  
  // 测试用例：验证PNG图片元数据处理核心逻辑
  it('应能正确处理PNG格式相关的逻辑', async () => {
    // 模拟的元数据
    const testMetadata = {
      tags: ['风景', '建筑', 'test'],
      description: 'PNG格式测试',
      people: ['张三', '李四'],
      location: '北京，中国'
    };
    
    // Mock ExifTool
    const originalExiftool = writer['exiftool'];
    // 替换为mock
    writer['exiftool'] = {
      write: jest.fn().mockResolvedValue(undefined),
      read: jest.fn().mockResolvedValue({
        Keywords: ['风景', '建筑', '张三', '李四', 'test'],
        Description: 'PNG格式测试',
        Location: '北京，中国',
        'XMP-photoshop:Location': '北京，中国'
      }),
      end: jest.fn().mockResolvedValue(undefined)
    } as any;
    
    try {
      // 调用写入方法
      await writer.writeMetadataForImage(tempPngPath, testMetadata);
      
      // 验证write方法的调用
      expect(writer['exiftool'].write).toHaveBeenCalledWith(
        tempPngPath,
        {
          Keywords: ['风景', '建筑', 'test', '张三', '李四'],
          Subject: ['风景', '建筑', 'test', '张三', '李四'],
          ImageDescription: 'PNG格式测试',
          'Caption-Abstract': 'PNG格式测试',
          Description: 'PNG格式测试',
          Location: '北京，中国',
          'XMP-photoshop:Location': '北京，中国'
        },
        ['-overwrite_original']
      );
      
      // 调用读取方法
      const result = await writer.readMetadataForImage(tempPngPath);
      
      // 验证读取结果
      expect(result).toEqual({
        tags: ['风景', '建筑', '张三', '李四', 'test'],
        description: 'PNG格式测试',
        location: '北京，中国'
      });
      
      // 验证read方法的调用
      expect(writer['exiftool'].read).toHaveBeenCalledWith(tempPngPath);
    } finally {
      // 恢复原始ExifTool
      writer['exiftool'] = originalExiftool;
    }
  }, TEST_TIMEOUT);
  
  // 新增场景1: 只写入people元数据
  it('只提供people元数据时应将其正确作为关键词写入PNG图片', async () => {
    // 只包含people的元数据
    const peopleOnlyMetadata = {
      people: ['人物A', '人物B']
    };
    
    // Mock ExifTool
    const originalExiftool = writer['exiftool'];
    // 替换为mock
    writer['exiftool'] = {
      write: jest.fn().mockResolvedValue(undefined),
      read: jest.fn().mockResolvedValue({
        Keywords: ['人物A', '人物B'],
        Subject: ['人物A', '人物B']
      }),
      end: jest.fn().mockResolvedValue(undefined)
    } as any;
    
    try {
      // 调用写入方法
      await writer.writeMetadataForImage(tempPngPath, peopleOnlyMetadata);
      
      // 验证write方法的调用 - people应作为Keywords和Subject写入
      expect(writer['exiftool'].write).toHaveBeenCalledWith(
        tempPngPath,
        {
          Keywords: ['人物A', '人物B'],
          Subject: ['人物A', '人物B']
        },
        ['-overwrite_original']
      );
      
      // 调用读取方法
      const result = await writer.readMetadataForImage(tempPngPath);
      
      // 验证读取结果 - people作为tags返回
      expect(result).toEqual({
        tags: ['人物A', '人物B']
      });
      
    } finally {
      // 恢复原始ExifTool
      writer['exiftool'] = originalExiftool;
    }
  }, TEST_TIMEOUT);
  
  // 新增场景2: 同时写入tags和people元数据
  it('同时提供tags和people元数据时应将两者合并为关键词写入PNG图片', async () => {
    // 同时包含tags和people的元数据
    const combinedMetadata = {
      tags: ['活动', '假日'],
      people: ['人物C']
    };
    
    // Mock ExifTool
    const originalExiftool = writer['exiftool'];
    // 替换为mock
    writer['exiftool'] = {
      write: jest.fn().mockResolvedValue(undefined),
      read: jest.fn().mockResolvedValue({
        Keywords: ['活动', '假日', '人物C'],
        Subject: ['活动', '假日', '人物C']
      }),
      end: jest.fn().mockResolvedValue(undefined)
    } as any;
    
    try {
      // 调用写入方法
      await writer.writeMetadataForImage(tempPngPath, combinedMetadata);
      
      // 验证write方法的调用 - tags和people应合并为Keywords和Subject写入
      expect(writer['exiftool'].write).toHaveBeenCalledWith(
        tempPngPath,
        {
          Keywords: ['活动', '假日', '人物C'],
          Subject: ['活动', '假日', '人物C']
        },
        ['-overwrite_original']
      );
      
      // 调用读取方法
      const result = await writer.readMetadataForImage(tempPngPath);
      
      // 验证读取结果 - 合并后的关键词作为tags返回
      expect(result).toEqual({
        tags: ['活动', '假日', '人物C']
      });
      
    } finally {
      // 恢复原始ExifTool
      writer['exiftool'] = originalExiftool;
    }
  }, TEST_TIMEOUT);
  
  // 新增场景3: people为空数组的情况
  it('当people为空数组时不应影响其他元数据的写入', async () => {
    // people为空数组的元数据
    const emptyPeopleMetadata = {
      tags: ['标签A', '标签B'],
      description: '测试描述',
      people: [],
      location: '测试地点'
    };
    
    // Mock ExifTool
    const originalExiftool = writer['exiftool'];
    // 替换为mock
    writer['exiftool'] = {
      write: jest.fn().mockResolvedValue(undefined),
      read: jest.fn().mockResolvedValue({
        Keywords: ['标签A', '标签B'],
        Subject: ['标签A', '标签B'],
        Description: '测试描述',
        Location: '测试地点',
        'XMP-photoshop:Location': '测试地点'
      }),
      end: jest.fn().mockResolvedValue(undefined)
    } as any;
    
    try {
      // 调用写入方法
      await writer.writeMetadataForImage(tempPngPath, emptyPeopleMetadata);
      
      // 验证write方法的调用 - 不应包含来自people的关键词
      expect(writer['exiftool'].write).toHaveBeenCalledWith(
        tempPngPath,
        {
          Keywords: ['标签A', '标签B'],
          Subject: ['标签A', '标签B'],
          ImageDescription: '测试描述',
          'Caption-Abstract': '测试描述',
          Description: '测试描述',
          Location: '测试地点',
          'XMP-photoshop:Location': '测试地点'
        },
        ['-overwrite_original']
      );
      
      // 调用读取方法
      const result = await writer.readMetadataForImage(tempPngPath);
      
      // 验证读取结果
      expect(result).toEqual({
        tags: ['标签A', '标签B'],
        description: '测试描述',
        location: '测试地点'
      });
      
    } finally {
      // 恢复原始ExifTool
      writer['exiftool'] = originalExiftool;
    }
  }, TEST_TIMEOUT);
  
  // 模拟非覆盖模式的合并测试
  it('在非覆盖模式下应能正确处理PNG中的元数据合并', async () => {
    // 模拟的已有元数据和新元数据
    const _existingMetadata = {
      Keywords: ['风景', '建筑', 'test', '张三', '李四'],
      Subject: ['风景', '建筑', 'test', '张三', '李四'],
      ImageDescription: 'PNG格式测试',
      'Caption-Abstract': 'PNG格式测试',
      Description: 'PNG格式测试',
      Location: '北京，中国'
    };
    
    const newMetadata = {
      tags: ['新标签1', '新标签2'],
      people: ['新人物1']
    };
    
    // Mock ExifTool
    const originalExiftool = writer['exiftool'];
    // 替换为mock
    writer['exiftool'] = {
      write: jest.fn().mockResolvedValue(undefined),
      read: jest.fn().mockResolvedValue({
        Keywords: ['旧标签1', '旧标签2'],
        Description: '旧描述',
        Location: '旧地点',
        'XMP-photoshop:Location': '旧地点'
      }),
      end: jest.fn().mockResolvedValue(undefined)
    } as any;
    
    try {
      // 调用写入方法(非覆盖模式)
      await writer.writeMetadataForImage(tempPngPath, newMetadata, false);
      
      // 验证写入调用
      expect(writer['exiftool'].write).toHaveBeenCalledWith(
        tempPngPath,
        {
          Keywords: expect.arrayContaining(['旧标签1', '旧标签2', '新标签1', '新标签2', '新人物1']),
          Subject: expect.arrayContaining(['旧标签1', '旧标签2', '新标签1', '新标签2', '新人物1']),
          ImageDescription: '旧描述',
          'Caption-Abstract': '旧描述',
          Description: '旧描述',
          Location: '旧地点',
          'XMP-photoshop:Location': '旧地点'
        },
        ['-overwrite_original']
      );
    } finally {
      // 恢复原始ExifTool
      writer['exiftool'] = originalExiftool;
    }
  }, TEST_TIMEOUT);
}); 