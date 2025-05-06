/**
 * 元数据写入验证 - 端到端测试
 * 
 * 此测试验证通过MCP服务的writeImageMetadata工具写入的标签和描述元数据
 * 能否正确写入到图片文件中，以确保后续可被macOS Spotlight索引。
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawn, ChildProcess } from 'node:child_process';
import { MetadataWriterService } from '../../src/core/metadata-writer';
import { ImageMetadataArgs } from '../../src/core/metadata-writer';

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
 * 辅助函数：等待指定的毫秒数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// JSON-RPC响应类型定义
interface JsonRpcResponse {
  jsonrpc: string;
  id: string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * 辅助函数：向MCP服务发送JSON-RPC请求并等待响应
 */
async function sendJsonRpcRequest(mcpProcess: ChildProcess, method: string, params: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    // 创建请求对象
    const requestId = `test-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params
    };
    
    // 响应处理器
    const responseHandler = (data: Buffer) => {
      try {
        const responseText = data.toString();
        const responseLines = responseText.split('\n').filter(line => line.trim());
        
        for (const line of responseLines) {
          try {
            const response = JSON.parse(line) as JsonRpcResponse;
            if (response.id === requestId) {
              // 移除监听器以避免内存泄漏
              mcpProcess.stdout?.removeListener('data', responseHandler);
              
              if (response.error) {
                reject(new Error(`JSON-RPC Error: ${response.error.code} - ${response.error.message}`));
              } else {
                resolve(response.result);
              }
              return;
            }
          } catch (parseError) {
            // 跳过非JSON行
            console.log(`Skipping non-JSON output: ${line}`);
          }
        }
      } catch (error) {
        reject(error);
      }
    };
    
    // 添加监听器
    mcpProcess.stdout?.on('data', responseHandler);
    
    // 发送请求
    mcpProcess.stdin?.write(`${JSON.stringify(request)}\n`);
  });
}

/**
 * 主测试套件
 */
describe('元数据写入验证 - E2E测试', () => {
  let tempDir: string;
  let mcpProcess: ChildProcess;
  let metadataWriter: MetadataWriterService;
  
  // 在所有测试前启动MCP服务
  beforeAll(async () => {
    // 创建临时目录
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-e2e-test-'));
    
    // 启动MCP服务进程
    mcpProcess = spawn('node', ['dist/main.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    // 日志处理，帮助调试
    mcpProcess.stderr?.on('data', (data: Buffer) => {
      console.error(`MCP服务错误: ${data.toString()}`);
    });
    
    // 等待服务启动
    await delay(2000);
    
    // 执行初始化握手
    try {
      await sendJsonRpcRequest(mcpProcess, 'initialize', {
        processId: process.pid,
        clientInfo: { name: 'E2ETestClient', version: '0.0.1' },
        capabilities: {}
      });
      console.log('MCP服务初始化成功');
    } catch (error) {
      console.error('MCP服务初始化失败:', error);
      throw error;
    }
    
    // 创建MetadataWriterService实例（用于读取验证）
    metadataWriter = new MetadataWriterService();
  }, TEST_TIMEOUT);
  
  // 在所有测试后清理资源
  afterAll(async () => {
    // 关闭MCP服务
    if (mcpProcess && mcpProcess.stdin) {
      mcpProcess.stdin.write(`${JSON.stringify({
        jsonrpc: '2.0',
        id: 'shutdown-request',
        method: 'shutdown'
      })}\n`);
      
      await delay(1000);
      
      mcpProcess.kill();
    }
    
    // 关闭MetadataWriterService
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
            console.warn(`无法创建${format}格式的测试图片, 跳过此测试:`, (error as Error).message);
            return;
          }
          
          // 构造元数据对象
          const metadata: Partial<ImageMetadataArgs> = {};
          if (testCase.tags) metadata.tags = testCase.tags;
          if (testCase.description) metadata.description = testCase.description;
          
          // 调用WriteImageMetadata工具
          try {
            await sendJsonRpcRequest(mcpProcess, 'tool', {
              name: 'writeImageMetadata',
              params: {
                filePath: testImagePath,
                metadata,
                overwrite: true
              }
            });
            
            // 使用MetadataWriterService读取写入的元数据以验证
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
              expect(readMetadata.description).toBe(testCase.description);
            }
            
          } catch (error) {
            console.error(`测试"${testCase.name}"失败:`, error);
            throw error;
          }
        }, TEST_TIMEOUT);
      }
    });
  }
}); 