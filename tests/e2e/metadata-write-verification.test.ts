/**
 * 元数据写入验证 - 端到端测试
 * 
 * 此测试验证通过MCP服务的writeImageMetadata工具写入的标签、描述、人物和地点元数据
 * 能否正确写入到图片文件中，以确保后续可被macOS Spotlight索引。
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { MetadataWriterService } from '../../src/core/metadata-writer';
import { ImageMetadataArgs } from '../../src/core/metadata-writer';
// 使用 dynamic import 以支持在 TS 环境中使用 ESM 模块
import('../../src/tools/utils/mcp-client.mjs').then(module => {
  // 将 McpClient 类保存到全局变量，以便后续使用
  global.McpClient = module.default;
});

// 测试超时设置（较长，以适应MCP服务启动和文件I/O）
const TEST_TIMEOUT = 30000;

// 支持的图片格式列表
const IMAGE_FORMATS = ['jpg', 'png', 'heic'] as const;
type ImageFormat = typeof IMAGE_FORMATS[number];

// 测试用例定义
interface TestCase {
  name: string;
  tags?: string[];
  description?: string;
  people?: string[];
  location?: string;
}

// 测试用例组
const TEST_CASES: TestCase[] = [
  {
    name: '基本标签和描述',
    tags: ['Vacation', 'Trip', 'Summer2025'],
    description: 'A beautiful sunset view during vacation.'
  },
  {
    name: '中文标签和描述',
    tags: ['度假', '旅行', '夏季2025'],
    description: '度假期间美丽的日落景色。'
  },
  {
    name: '特殊字符',
    tags: ['Beach & Sea', 'Mountains@Sunrise', 'New-York_City'],
    description: 'Special characters test: & < > " \' / \\ ? = + %'
  },
  {
    name: '仅标签',
    tags: ['OnlyTags', 'NoDescription', 'TestTag']
  },
  {
    name: '仅描述',
    description: 'This image has description but no tags.'
  },
  // 新增: 人物测试用例
  {
    name: '单个人物',
    people: ['Alice Wonderland']
  },
  {
    name: '多个人物',
    people: ['Bob The Builder', 'Charles Xavier']
  },
  {
    name: '包含特殊字符的人物名',
    people: ['Dr. Strange (Stephen)']
  },
  {
    name: '中文人物名',
    people: ['孙悟空', '猪八戒']
  },
  // 新增: 地点测试用例
  {
    name: '简单地点',
    location: 'London, UK'
  },
  {
    name: '更具体的地点',
    location: 'Eiffel Tower, Paris, France'
  },
  {
    name: '包含特殊字符的地点',
    location: 'Baker Street 221B & The Pub Nearby'
  },
  {
    name: '中文地点',
    location: '中国北京故宫博物院'
  },
  // 新增: 组合测试用例
  {
    name: '人物和地点',
    people: ['Tony Stark', 'Peter Parker'],
    location: 'Stark Tower, New York'
  },
  {
    name: '所有元数据类型',
    tags: ['Holiday', 'Friends'],
    description: 'A wonderful day with friends',
    people: ['Bruce Wayne', 'Clark Kent'],
    location: 'Gotham City Central Park'
  }
];

/**
 * 辅助函数：创建临时测试图片文件
 */
async function createTestImageFile(tempDir: string, format: ImageFormat): Promise<string> {
  let sourcePath = path.join(__dirname, '..', 'fixtures', 'images', `test-image.${format}`);
  if (!fs.existsSync(sourcePath)) {
    sourcePath = path.join(__dirname, '..', 'fixtures', 'images', `WechatIMG247964.jpg`);
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`没有找到${format}格式的测试图片文件`);
    }
  }
  const dest = path.join(tempDir, `test-verification-${Date.now()}.${format}`);
  fs.copyFileSync(sourcePath, dest);
  return dest;
}

/**
 * 主测试套件
 */
describe('元数据写入验证 - E2E测试', () => {
  let tempDir: string;
  let mcpClient: any; // 当导入完成后，将被正确赋值
  let metadataWriter: MetadataWriterService;
  
  // 在所有测试前启动 MCP 服务
  beforeAll(async () => {
    // 创建临时目录
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-e2e-test-'));
    
    // 创建 MCP 客户端
    // @ts-ignore - 动态导入的类型问题
    mcpClient = new global.McpClient({
      clientName: "E2ETestClient",
      clientVersion: "0.0.1"
    });
    
    // 连接到服务
    try {
      await mcpClient.connect();
      console.log('MCP 服务连接成功');
    } catch (error) {
      console.error('MCP 服务连接失败:', error);
      throw error;
    }
    
    // 创建 MetadataWriterService 实例（用于读取验证）
    metadataWriter = new MetadataWriterService();
  }, TEST_TIMEOUT);
  
  // 在所有测试后清理资源
  afterAll(async () => {
    // 关闭 MCP 客户端
    if (mcpClient) {
      try {
        await mcpClient.close();
      } catch (e) {
        // 忽略关闭错误
      }
    }
    
    // 关闭 MetadataWriterService
    if (metadataWriter) {
      await metadataWriter.end();
    }
    
    // 清理临时文件和目录
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }, TEST_TIMEOUT);
  
  // 为每种图片格式创建测试套件
  for (const format of IMAGE_FORMATS) {
    describe(`${format.toUpperCase()}格式元数据写入验证`, () => {
      // 为每个测试用例创建测试
      for (const testCase of TEST_CASES) {
        it(`应正确写入并回读"${testCase.name}"场景的元数据`, async () => {
          // 创建测试图片副本
          let testImagePath: string;
          try {
            testImagePath = await createTestImageFile(tempDir, format);
          } catch (error) {
            // console.warn(`无法创建${format}格式的测试图片, 跳过此测试:`, (error as Error).message);
            return;
          }
          
          // 构造元数据对象
          const metadata: Partial<ImageMetadataArgs> = {};
          if (testCase.tags) metadata.tags = testCase.tags;
          if (testCase.description) metadata.description = testCase.description;
          if (testCase.people) metadata.people = testCase.people;
          if (testCase.location) metadata.location = testCase.location;
          
          // 调用 WriteImageMetadata 工具
          try {
            await mcpClient.writeImageMetadata(testImagePath, metadata);
            
            // 使用 MetadataWriterService 读取写入的元数据以验证
            const readMetadata = await metadataWriter.readMetadataForImage(testImagePath);
            
            // 断言标签
            if (testCase.tags) {
              expect(readMetadata.tags).toBeDefined();
              // 因为标签和人物都存储在相同字段，我们检查所有预期标签是否都存在
              for (const tag of testCase.tags) {
                expect(readMetadata.tags).toContain(tag);
              }
            }
            
            // 断言描述
            if (testCase.description) {
              expect(readMetadata.description).toBeDefined();
              expect(readMetadata.description).toBe(testCase.description);
            }
            
            // 断言人物（作为关键词）
            if (testCase.people) {
              expect(readMetadata.tags).toBeDefined();
              // 由于人物被保存为标签/关键词，我们检查所有的人物名称是否都存在于标签中
              for (const person of testCase.people) {
                expect(readMetadata.tags).toContain(person);
              }
            }
            
            // 断言地点
            if (testCase.location) {
              expect(readMetadata.location).toBeDefined();
              expect(readMetadata.location).toBe(testCase.location);
            }
            
          } catch (error) {
            console.error(`测试失败:`, error);
            throw error;
          }
        }, TEST_TIMEOUT);
      }
    });
  }
}); 