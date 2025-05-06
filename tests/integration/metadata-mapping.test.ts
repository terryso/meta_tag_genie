/**
 * 元数据字段映射验证 - 集成测试
 * 
 * 此测试专门验证应用程序将不同类型的元数据写入到适当的标准EXIF/IPTC/XMP字段的准确性,
 * 确保映射方案在所有支持的图片格式(JPG, PNG, HEIC)上行为一致。
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { MetadataWriterService } from '../../src/core/metadata-writer';
import { ExifTool, Tags } from 'exiftool-vendored';

// 测试超时设置 (更长,以适应真实文件I/O)
const TEST_TIMEOUT = 15000;

// 支持的图片格式列表
const IMAGE_FORMATS = ['jpg', 'png', 'heic'] as const;
type ImageFormat = typeof IMAGE_FORMATS[number];

// 为ExifTool创建一个简单的模拟类型,用于测试
interface MockExifTool {
  write: jest.Mock;
  read: jest.Mock;
  end: jest.Mock;
}

// 辅助函数: 为测试创建临时图片
async function createTestImageFile(tempDir: string, format: ImageFormat): Promise<string> {
  const filePath = path.join(tempDir, `test.${format}`);
  
  // 检查是否有测试样例图片可以复制
  const sampleImagePath = path.join(__dirname, '..', 'fixtures', 'images', `sample.${format}`);
  
  if (fs.existsSync(sampleImagePath)) {
    // 如果有样例图片,复制它
    fs.copyFileSync(sampleImagePath, filePath);
  } else {
    // 否则创建一个空文件 (注意: 这不是有效的图片文件,只用于mock测试)
    fs.writeFileSync(filePath, Buffer.from(''));
    console.warn(`⚠️ 警告: 没有找到${format.toUpperCase()}测试图片样例,使用空文件(仅用于mock测试)`);
  }
  
  return filePath;
}

// 辅助函数: 直接读取原始元数据标签
async function rawExiftoolRead(filePath: string): Promise<Tags> {
  const exiftool = new ExifTool();
  try {
    return await exiftool.read(filePath);
  } finally {
    await exiftool.end();
  }
}

// 主测试套件
describe('元数据字段映射验证测试', () => {
  let tempDir: string;
  let writer: MetadataWriterService;
  
  // 每个测试前的设置
  beforeAll(async () => {
    // 创建临时目录
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metadata-mapping-test-'));
    // 实例化MetadataWriterService
    writer = new MetadataWriterService();
  });
  
  // 每个测试后的清理
  afterAll(async () => {
    // 关闭MetadataWriterService
    await writer.end();
    
    // 清理临时文件和目录
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
  
  // 为每种图片格式创建一个测试套件
  for (const format of IMAGE_FORMATS) {
    describe(`${format.toUpperCase()} 格式元数据字段映射测试`, () => {
      let testImagePath: string;
      
      // 准备特定格式的测试图片
      beforeEach(async () => {
        testImagePath = await createTestImageFile(tempDir, format);
      });
      
      // 1. 标签 (Tags) 和人物 (People) 元数据映射测试
      it(`应将标签和人物正确写入${format.toUpperCase()}图片的IPTC:Keywords和XMP:dc:subject字段`, async () => {
        // 若无真实样例图片,使用mock测试
        if (!fs.existsSync(path.join(__dirname, '..', 'fixtures', 'images', `sample.${format}`))) {
          // Mock写入和读取方法
          const originalExiftool = writer['exiftool'];
          const mockExiftool: MockExifTool = {
            write: jest.fn().mockResolvedValue(undefined),
            read: jest.fn().mockResolvedValue({
              Keywords: ['风景', '节日', '张三', '李四'],
              Subject: ['风景', '节日', '张三', '李四']
            }),
            end: jest.fn().mockResolvedValue(undefined)
          };
          
          // 替换为mock
          writer['exiftool'] = mockExiftool as unknown as ExifTool;
          
          try {
            // 测试元数据
            const testMetadata = {
              tags: ['风景', '节日'],
              people: ['张三', '李四']
            };
            
            // 写入元数据
            await writer.writeMetadataForImage(testImagePath, testMetadata);
            
            // 验证write方法的调用
            expect(mockExiftool.write).toHaveBeenCalledWith(
              testImagePath,
              expect.objectContaining({
                Keywords: ['风景', '节日', '张三', '李四'],
                Subject: ['风景', '节日', '张三', '李四']
              }),
              ['-overwrite_original']
            );
            
            // 读取并验证元数据
            const tags = await writer.readMetadataForImage(testImagePath);
            expect(tags).toEqual({
              tags: ['风景', '节日', '张三', '李四']
            });
          } finally {
            // 恢复原始ExifTool
            writer['exiftool'] = originalExiftool;
          }
          return;
        }
        
        // 真实文件测试
        const testMetadata = {
          tags: ['自然', '旅行'],
          people: ['小明', '小红']
        };
        
        // 写入元数据
        await writer.writeMetadataForImage(testImagePath, testMetadata);
        
        // 使用exiftool直接读取标签值进行验证
        const tags = await rawExiftoolRead(testImagePath);
        
        // 验证IPTC:Keywords
        expect(Array.isArray(tags.Keywords) ? tags.Keywords : [tags.Keywords])
          .toEqual(expect.arrayContaining(['自然', '旅行', '小明', '小红']));
          
        // 验证XMP:dc:subject
        expect(Array.isArray(tags.Subject) ? tags.Subject : [tags.Subject])
          .toEqual(expect.arrayContaining(['自然', '旅行', '小明', '小红']));
      }, TEST_TIMEOUT);
      
      // 2. 描述 (Description) 元数据映射测试
      it(`应将描述正确写入${format.toUpperCase()}图片的EXIF:ImageDescription, IPTC:Caption-Abstract和XMP:dc:description字段`, async () => {
        // 若无真实样例图片,使用mock测试
        if (!fs.existsSync(path.join(__dirname, '..', 'fixtures', 'images', `sample.${format}`))) {
          // Mock写入和读取方法
          const originalExiftool = writer['exiftool'];
          const mockExiftool: MockExifTool = {
            write: jest.fn().mockResolvedValue(undefined),
            read: jest.fn().mockResolvedValue({
              ImageDescription: '测试描述',
              "Caption-Abstract": '测试描述',
              Description: '测试描述'
            }),
            end: jest.fn().mockResolvedValue(undefined)
          };
          
          // 替换为mock
          writer['exiftool'] = mockExiftool as unknown as ExifTool;
          
          try {
            // 测试元数据
            const testMetadata = {
              description: '测试描述'
            };
            
            // 写入元数据
            await writer.writeMetadataForImage(testImagePath, testMetadata);
            
            // 验证write方法的调用
            expect(mockExiftool.write).toHaveBeenCalledWith(
              testImagePath,
              expect.objectContaining({
                ImageDescription: '测试描述',
                "Caption-Abstract": '测试描述',
                Description: '测试描述'
              }),
              ['-overwrite_original']
            );
            
            // 读取并验证元数据
            const tags = await writer.readMetadataForImage(testImagePath);
            expect(tags).toEqual({
              description: '测试描述'
            });
          } finally {
            // 恢复原始ExifTool
            writer['exiftool'] = originalExiftool;
          }
          return;
        }
        
        // 真实文件测试
        const testDescription = '这是一段包含特殊字符的描述: & < > ñäöü.';
        
        // 写入元数据
        await writer.writeMetadataForImage(testImagePath, {
          description: testDescription
        });
        
        // 使用exiftool直接读取标签值进行验证
        const tags = await rawExiftoolRead(testImagePath);
        
        // 验证EXIF:ImageDescription
        expect(tags.ImageDescription).toBe(testDescription);
        
        // 验证IPTC:Caption-Abstract
        expect(tags["Caption-Abstract"]).toBe(testDescription);
        
        // 验证XMP:dc:description
        expect(tags.Description).toBe(testDescription);
      }, TEST_TIMEOUT);
      
      // 3. 地点 (Location) 元数据映射测试
      it(`应将地点正确写入${format.toUpperCase()}图片的XMP:photoshop:Location字段`, async () => {
        // 若无真实样例图片,使用mock测试
        if (!fs.existsSync(path.join(__dirname, '..', 'fixtures', 'images', `sample.${format}`))) {
          // Mock写入和读取方法
          const originalExiftool = writer['exiftool'];
          const mockExiftool: MockExifTool = {
            write: jest.fn().mockResolvedValue(undefined),
            read: jest.fn().mockResolvedValue({
              Location: '测试地点',
              "XMP-photoshop:Location": '测试地点'
            }),
            end: jest.fn().mockResolvedValue(undefined)
          };
          
          // 替换为mock
          writer['exiftool'] = mockExiftool as unknown as ExifTool;
          
          try {
            // 测试元数据
            const testMetadata = {
              location: '测试地点'
            };
            
            // 写入元数据
            await writer.writeMetadataForImage(testImagePath, testMetadata);
            
            // 验证write方法的调用
            expect(mockExiftool.write).toHaveBeenCalledWith(
              testImagePath,
              expect.objectContaining({
                Location: '测试地点',
                "XMP-photoshop:Location": '测试地点'
              }),
              ['-overwrite_original']
            );
            
            // 读取并验证元数据
            const tags = await writer.readMetadataForImage(testImagePath);
            expect(tags).toEqual({
              location: '测试地点'
            });
          } finally {
            // 恢复原始ExifTool
            writer['exiftool'] = originalExiftool;
          }
          return;
        }
        
        // 真实文件测试
        const testLocation = '北京市，中国';
        
        // 写入元数据
        await writer.writeMetadataForImage(testImagePath, {
          location: testLocation
        });
        
        // 使用exiftool直接读取标签值进行验证
        const tags = await rawExiftoolRead(testImagePath);
        
        // 验证简写形式
        if (tags.Location) {
          expect(tags.Location).toBe(testLocation);
        }
        
        // 验证完整形式
        expect(tags["XMP-photoshop:Location"]).toBe(testLocation);
      }, TEST_TIMEOUT);
      
      // 4. 全部元数据类型组合测试
      it(`应将所有类型的元数据正确写入${format.toUpperCase()}图片的对应字段`, async () => {
        // 若无真实样例图片,使用mock测试
        if (!fs.existsSync(path.join(__dirname, '..', 'fixtures', 'images', `sample.${format}`))) {
          // Mock写入和读取方法
          const originalExiftool = writer['exiftool'];
          const mockExiftool: MockExifTool = {
            write: jest.fn().mockResolvedValue(undefined),
            read: jest.fn().mockResolvedValue({
              Keywords: ['自然', '城市', '小明', '小红'],
              Subject: ['自然', '城市', '小明', '小红'],
              ImageDescription: '综合测试描述',
              "Caption-Abstract": '综合测试描述',
              Description: '综合测试描述',
              Location: '综合测试地点',
              "XMP-photoshop:Location": '综合测试地点'
            }),
            end: jest.fn().mockResolvedValue(undefined)
          };
          
          // 替换为mock
          writer['exiftool'] = mockExiftool as unknown as ExifTool;
          
          try {
            // 测试元数据
            const testMetadata = {
              tags: ['自然', '城市'],
              description: '综合测试描述',
              people: ['小明', '小红'],
              location: '综合测试地点'
            };
            
            // 写入元数据
            await writer.writeMetadataForImage(testImagePath, testMetadata);
            
            // 验证write方法的调用
            expect(mockExiftool.write).toHaveBeenCalledWith(
              testImagePath,
              {
                Keywords: ['自然', '城市', '小明', '小红'],
                Subject: ['自然', '城市', '小明', '小红'],
                ImageDescription: '综合测试描述',
                "Caption-Abstract": '综合测试描述',
                Description: '综合测试描述',
                Location: '综合测试地点',
                "XMP-photoshop:Location": '综合测试地点'
              },
              ['-overwrite_original']
            );
            
            // 读取并验证元数据
            const tags = await writer.readMetadataForImage(testImagePath);
            expect(tags).toEqual({
              tags: ['自然', '城市', '小明', '小红'],
              description: '综合测试描述',
              location: '综合测试地点'
            });
          } finally {
            // 恢复原始ExifTool
            writer['exiftool'] = originalExiftool;
          }
          return;
        }
        
        // 真实文件测试
        const testMetadata = {
          tags: ['自然', '城市'],
          description: '这是一个完整的测试,包含所有元数据类型',
          people: ['小明', '小红'],
          location: '上海市,中国'
        };
        
        // 写入元数据
        await writer.writeMetadataForImage(testImagePath, testMetadata);
        
        // 使用exiftool直接读取标签值进行验证
        const tags = await rawExiftoolRead(testImagePath);
        
        // 验证关键词(标签和人物)
        const keywords = Array.isArray(tags.Keywords) ? tags.Keywords : [tags.Keywords];
        const subjects = Array.isArray(tags.Subject) ? tags.Subject : [tags.Subject];
        
        expect(keywords).toEqual(expect.arrayContaining(['自然', '城市', '小明', '小红']));
        expect(subjects).toEqual(expect.arrayContaining(['自然', '城市', '小明', '小红']));
        
        // 验证描述
        expect(tags.ImageDescription).toBe(testMetadata.description);
        expect(tags["Caption-Abstract"]).toBe(testMetadata.description);
        expect(tags.Description).toBe(testMetadata.description);
        
        // 验证地点
        expect(tags["XMP-photoshop:Location"]).toBe(testMetadata.location);
      }, TEST_TIMEOUT);
    });
  }
  
  // 元数据读取优先级测试
  describe('元数据读取优先级测试', () => {
    let testImagePath: string;
    
    beforeEach(async () => {
      // 使用JPG格式进行此测试
      testImagePath = await createTestImageFile(tempDir, 'jpg');
    });
    
    it('描述字段应按照正确的优先级读取', async () => {
      // 若无真实样例图片,使用mock测试
      const originalExiftool = writer['exiftool'];
      const mockExiftool: MockExifTool = {
        write: jest.fn().mockResolvedValue(undefined),
        // 模拟三个描述字段都有不同的值
        read: jest.fn().mockResolvedValue({
          Description: '描述1-XMP',
          "Caption-Abstract": '描述2-IPTC',
          ImageDescription: '描述3-EXIF'
        }),
        end: jest.fn().mockResolvedValue(undefined)
      };
      
      // 替换为mock
      writer['exiftool'] = mockExiftool as unknown as ExifTool;
      
      try {
        // 读取元数据
        const result = await writer.readMetadataForImage(testImagePath);
        
        // 验证读取到的是XMP描述(最高优先级)
        expect(result.description).toBe('描述1-XMP');
        
        // 修改mock,移除XMP描述
        mockExiftool.read = jest.fn().mockResolvedValue({
          "Caption-Abstract": '描述2-IPTC',
          ImageDescription: '描述3-EXIF'
        });
        
        // 再次读取
        const result2 = await writer.readMetadataForImage(testImagePath);
        
        // 验证读取到的是IPTC描述(第二优先级)
        expect(result2.description).toBe('描述2-IPTC');
        
        // 修改mock,只保留EXIF描述
        mockExiftool.read = jest.fn().mockResolvedValue({
          ImageDescription: '描述3-EXIF'
        });
        
        // 再次读取
        const result3 = await writer.readMetadataForImage(testImagePath);
        
        // 验证读取到的是EXIF描述(最低优先级)
        expect(result3.description).toBe('描述3-EXIF');
      } finally {
        // 恢复原始ExifTool
        writer['exiftool'] = originalExiftool;
      }
    });
    
    it('地点字段应按照正确的优先级读取', async () => {
      // 若无真实样例图片,使用mock测试
      const originalExiftool = writer['exiftool'];
      const mockExiftool: MockExifTool = {
        write: jest.fn().mockResolvedValue(undefined),
        // 模拟两种地点字段格式都有值
        read: jest.fn().mockResolvedValue({
          Location: '地点1-简写',
          "XMP-photoshop:Location": '地点2-完整'
        }),
        end: jest.fn().mockResolvedValue(undefined)
      };
      
      // 替换为mock
      writer['exiftool'] = mockExiftool as unknown as ExifTool;
      
      try {
        // 读取元数据
        const result = await writer.readMetadataForImage(testImagePath);
        
        // 验证读取到的是简写形式(更高优先级)
        expect(result.location).toBe('地点1-简写');
        
        // 修改mock,移除简写形式
        mockExiftool.read = jest.fn().mockResolvedValue({
          "XMP-photoshop:Location": '地点2-完整'
        });
        
        // 再次读取
        const result2 = await writer.readMetadataForImage(testImagePath);
        
        // 验证读取到的是完整形式
        expect(result2.location).toBe('地点2-完整');
      } finally {
        // 恢复原始ExifTool
        writer['exiftool'] = originalExiftool;
      }
    });
  });
}); 