import { jest } from '@jest/globals';
import { writeImageMetadataHandler } from '../../../../src/mcp/tools/writeImageMetadata';
import { ERROR_CODES, FileNotFoundError, MetadataWriteError } from '../../../../src/common/errors';
import type { MetadataWriterService } from '../../../../src/core/metadata-writer';

// 创建模拟的MetadataWriterService
const mockWriteMetadataForImage = jest.fn();
const mockMetadataWriter = {
  writeMetadataForImage: mockWriteMetadataForImage,
  readRawMetadata: jest.fn(),
  readMetadataForImage: jest.fn(),
  end: jest.fn(),
  exiftool: {},
  defaultTaskTimeoutMs: 30000 // 添加默认超时属性
} as unknown as MetadataWriterService;

// Mock context
const mockContext = {
  app: {
    metadataWriter: mockMetadataWriter,
  },
};

describe('writeImageMetadataHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('调用MetadataWriterService处理标签元数据写入', async () => {
    // 模拟成功写入
    mockWriteMetadataForImage.mockResolvedValue(undefined);

    const params = {
      filePath: 'test.jpg',
      metadata: {
        tags: ['tag1', 'tag2'],
      },
      overwrite: true,
    };

    const result = await writeImageMetadataHandler(params, mockContext);

    // 验证调用
    expect(mockWriteMetadataForImage).toHaveBeenCalledWith(
      'test.jpg',
      { tags: ['tag1', 'tag2'] },
      true
    );
    
    // 验证返回值
    expect(result).toEqual({
      success: true,
      filePath: 'test.jpg',
      message: '标签元数据已成功写入到JPG图片。',
    });
  });

  it('处理空标签列表', async () => {
    mockWriteMetadataForImage.mockResolvedValue(undefined);

    const params = {
      filePath: 'test.jpg',
      metadata: {},
      overwrite: true,
    };

    await writeImageMetadataHandler(params, mockContext);

    // 验证调用，标签为undefined
    expect(mockWriteMetadataForImage).toHaveBeenCalledWith(
      'test.jpg',
      {},
      true
    );
  });

  it('当MetadataWriterService抛出FileNotFoundError时正确处理', async () => {
    // 模拟FileNotFoundError
    const error = new FileNotFoundError('test.jpg');
    mockWriteMetadataForImage.mockRejectedValue(error);

    const params = {
      filePath: 'test.jpg',
      metadata: { tags: ['tag'] },
      overwrite: true,
    };

    // 期望返回错误结果对象
    const result = await writeImageMetadataHandler(params, mockContext);
    expect(result).toEqual({
      success: false,
      filePath: 'test.jpg',
      message: expect.stringContaining('文件不存在'),
      errorCode: ERROR_CODES.FILE_NOT_FOUND,
      errorData: { filePath: 'test.jpg' },
    });
  });

  it('当MetadataWriterService抛出MetadataWriteError时正确处理', async () => {
    // 模拟MetadataWriteError
    const error = new MetadataWriteError('test.jpg', new Error('写入失败'));
    mockWriteMetadataForImage.mockRejectedValue(error);

    const params = {
      filePath: 'test.jpg',
      metadata: { tags: ['tag'] },
      overwrite: true,
    };

    // 期望返回错误结果对象
    const result = await writeImageMetadataHandler(params, mockContext);
    expect(result).toEqual({
      success: false,
      filePath: 'test.jpg',
      message: expect.stringContaining('写入元数据失败'),
      errorCode: ERROR_CODES.METADATA_WRITE_FAILED,
      errorData: { filePath: 'test.jpg' },
    });
  });

  it('处理包含"file not found"消息的通用错误', async () => {
    // 模拟带有file not found消息的Error
    const error = new Error('Exiftool says: file not found');
    mockWriteMetadataForImage.mockRejectedValue(error);

    const params = {
      filePath: 'test.jpg',
      metadata: { tags: ['tag'] },
      overwrite: true,
    };

    // 期望返回错误结果对象
    const result = await writeImageMetadataHandler(params, mockContext);
    expect(result).toEqual({
      success: false,
      filePath: 'test.jpg',
      message: expect.stringContaining('ExifTool未找到文件'),
      errorCode: ERROR_CODES.FILE_NOT_FOUND,
      errorData: { filePath: 'test.jpg' },
    });
  });

  it('处理未知类型的错误', async () => {
    // 模拟未知类型错误
    const error = new Error('Unknown error');
    mockWriteMetadataForImage.mockRejectedValue(error);

    const params = {
      filePath: 'test.jpg',
      metadata: { tags: ['tag'] },
      overwrite: true,
    };

    // 期望返回通用错误结果对象
    const result = await writeImageMetadataHandler(params, mockContext);
    expect(result).toEqual({
      success: false,
      filePath: 'test.jpg',
      message: expect.stringContaining('内部错误'),
      errorCode: ERROR_CODES.INTERNAL_ERROR,
      errorData: { filePath: 'test.jpg' },
    });
  });
}); 