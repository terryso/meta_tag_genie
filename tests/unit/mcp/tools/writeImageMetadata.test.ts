import { jest } from '@jest/globals';
import { writeImageMetadataHandler, WriteImageMetadataParams } from '../../../../src/mcp/tools/writeImageMetadata';
import { 
  FileNotFoundError, 
  MetadataWriteError,
  FileAccessError,
  UnsupportedFileFormatError,
  ExifToolTimeoutError,
  ExifToolProcessError
} from '../../../../src/common/errors';
import type { MetadataWriterService } from '../../../../src/core/metadata-writer';
import type { ImageMetadataArgs } from '../../../../src/core/metadata-writer';

// 创建模拟的MetadataWriterService
const mockWriteMetadataForImage = jest.fn<Promise<void>, [string, ImageMetadataArgs, boolean]>();
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

// 有效的测试参数
const validParams: WriteImageMetadataParams = {
  filePath: '/absolute/path/to/test.jpg',
  metadata: {
    tags: ['TestTag1', 'TestTag2'],
    description: 'Test description',
    people: ['Person1', 'Person2'],
    location: 'Test Location'
  },
  overwrite: true
};

describe('writeImageMetadataHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('调用MetadataWriterService处理标签元数据写入', async () => {
    // 模拟成功写入
    mockWriteMetadataForImage.mockResolvedValue(undefined);

    const params = {
      filePath: '/absolute/path/to/test.jpg',
      metadata: {
        tags: ['TestTag1', 'TestTag2'],
      },
      overwrite: true,
    };

    const result = await writeImageMetadataHandler(params, mockContext);

    // 验证调用
    expect(mockWriteMetadataForImage).toHaveBeenCalledWith(
      '/absolute/path/to/test.jpg',
      { tags: ['TestTag1', 'TestTag2'] },
      true
    );
    
    // 验证返回值
    expect(result).toEqual({
      success: true,
      filePath: '/absolute/path/to/test.jpg',
      message: '元数据已成功写入JPG图片。',
    });
  });

  it('处理描述元数据写入', async () => {
    mockWriteMetadataForImage.mockResolvedValue(undefined);

    const params = {
      filePath: '/absolute/path/to/test.jpg',
      metadata: {
        description: 'Test description'
      },
      overwrite: true,
    };

    const result = await writeImageMetadataHandler(params, mockContext);

    // 验证调用
    expect(mockWriteMetadataForImage).toHaveBeenCalledWith(
      '/absolute/path/to/test.jpg',
      { description: 'Test description' },
      true
    );
    
    // 验证返回值
    expect(result).toEqual({
      success: true,
      filePath: '/absolute/path/to/test.jpg',
      message: '元数据已成功写入JPG图片。',
    });
  });

  it('处理人物元数据写入', async () => {
    mockWriteMetadataForImage.mockResolvedValue(undefined);

    const params = {
      filePath: '/absolute/path/to/test.jpg',
      metadata: {
        people: ['Person1', 'Person2']
      },
      overwrite: true,
    };

    const result = await writeImageMetadataHandler(params, mockContext);

    // 验证调用
    expect(mockWriteMetadataForImage).toHaveBeenCalledWith(
      '/absolute/path/to/test.jpg',
      { people: ['Person1', 'Person2'] },
      true
    );
    
    // 验证返回值
    expect(result).toEqual({
      success: true,
      filePath: '/absolute/path/to/test.jpg',
      message: '元数据已成功写入JPG图片。',
    });
  });

  it('处理地点元数据写入', async () => {
    mockWriteMetadataForImage.mockResolvedValue(undefined);

    const params = {
      filePath: '/absolute/path/to/test.jpg',
      metadata: {
        location: 'Test Location'
      },
      overwrite: true,
    };

    const result = await writeImageMetadataHandler(params, mockContext);

    // 验证调用
    expect(mockWriteMetadataForImage).toHaveBeenCalledWith(
      '/absolute/path/to/test.jpg',
      { location: 'Test Location' },
      true
    );
    
    // 验证返回值
    expect(result).toEqual({
      success: true,
      filePath: '/absolute/path/to/test.jpg',
      message: '元数据已成功写入JPG图片。',
    });
  });

  it('处理所有类型的元数据写入', async () => {
    mockWriteMetadataForImage.mockResolvedValue(undefined);

    const result = await writeImageMetadataHandler(validParams, mockContext);

    // 验证调用
    expect(mockWriteMetadataForImage).toHaveBeenCalledWith(
      '/absolute/path/to/test.jpg',
      validParams.metadata,
      true
    );
    
    // 验证返回值
    expect(result).toEqual({
      success: true,
      filePath: '/absolute/path/to/test.jpg',
      message: '元数据已成功写入JPG图片。',
    });
  });

  it('处理空元数据对象', async () => {
    mockWriteMetadataForImage.mockResolvedValue(undefined);

    const params = {
      filePath: '/absolute/path/to/test.jpg',
      metadata: {},
      overwrite: true,
    };

    await writeImageMetadataHandler(params, mockContext);

    // 验证调用，元数据为空对象
    expect(mockWriteMetadataForImage).toHaveBeenCalledWith(
      '/absolute/path/to/test.jpg',
      {},
      true
    );
  });

  it('根据文件扩展名返回不同的成功消息', async () => {
    mockWriteMetadataForImage.mockResolvedValue(undefined);

    // PNG文件
    const pngParams = {
      filePath: '/absolute/path/to/test.png',
      metadata: { tags: ['TestTag1'] },
      overwrite: true,
    };
    const pngResult = await writeImageMetadataHandler(pngParams, mockContext);
    expect(pngResult.message).toBe('元数据已成功写入PNG图片。');

    // HEIC文件
    const heicParams = {
      filePath: '/absolute/path/to/test.HEIC',
      metadata: { tags: ['TestTag1'] },
      overwrite: true,
    };
    const heicResult = await writeImageMetadataHandler(heicParams, mockContext);
    expect(heicResult.message).toBe('元数据已成功写入HEIC图片。');

    // 其他未明确处理的扩展名
    const otherParams = {
      filePath: '/absolute/path/to/test.gif',
      metadata: { tags: ['TestTag1'] },
      overwrite: true,
    };
    const otherResult = await writeImageMetadataHandler(otherParams, mockContext);
    expect(otherResult.message).toBe('元数据已成功写入图片。');
  });

  // 参数验证测试：标签不能为空字符串
  it('当标签包含空字符串时返回错误响应', async () => {
    // 带有空字符串的无效标签
    const paramsWithEmptyTag = {
      ...validParams,
      metadata: {
        ...validParams.metadata,
        tags: ['ValidTag', '   ', 'AnotherTag']
      }
    };

    // 执行方法
    const result = await writeImageMetadataHandler(paramsWithEmptyTag, mockContext);
    
    // 验证返回错误响应
    expect(result.success).toBe(false);
    expect(result.message).toContain('标签不能为空字符串');
  });

  it('返回的成功响应结构完全符合规范', async () => {
    // 模拟成功写入
    mockWriteMetadataForImage.mockResolvedValue(undefined);

    const result = await writeImageMetadataHandler(validParams, mockContext);

    // 验证返回值的类型和结构完全符合docs/mcp-tools-definition.md中的定义
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    
    // 验证必需字段是否存在且类型正确
    expect(result.success).toBe(true);
    expect(typeof result.success).toBe('boolean');
    
    expect(result.filePath).toBe(validParams.filePath);
    expect(typeof result.filePath).toBe('string');
    
    expect(result.message).toBeTruthy();
    expect(typeof result.message).toBe('string');
    
    // 验证没有额外的属性 (Schema规定了 additionalProperties: false)
    const resultKeys = Object.keys(result);
    expect(resultKeys).toHaveLength(3); // 只有success, filePath, message三个属性
    expect(resultKeys.sort()).toEqual(['success', 'filePath', 'message'].sort());
  });

  // 参数验证测试：人物不能为空字符串
  it('当人物名称包含空字符串时返回错误响应', async () => {
    // 带有空字符串的无效人物名
    const paramsWithEmptyPerson = {
      ...validParams,
      metadata: {
        ...validParams.metadata,
        people: ['ValidPerson', '  ', 'AnotherPerson']
      }
    };

    // 执行方法
    const result = await writeImageMetadataHandler(paramsWithEmptyPerson, mockContext);
    
    // 验证返回错误响应
    expect(result.success).toBe(false);
    expect(result.message).toContain('人物名称不能为空字符串');
  });

  // 参数验证测试：描述长度限制
  it('当描述文本过长时返回错误响应', async () => {
    // 生成超长描述文本
    const longDescription = 'a'.repeat(20000); // 生成超过MAX_DESCRIPTION_LENGTH的文本
    
    const paramsWithLongDesc = {
      ...validParams,
      metadata: {
        ...validParams.metadata,
        description: longDescription
      }
    };

    // 执行方法
    const result = await writeImageMetadataHandler(paramsWithLongDesc, mockContext);
    
    // 验证返回错误响应
    expect(result.success).toBe(false);
    expect(result.message).toContain('描述文本过长');
  });

  // 错误处理测试：文件不存在
  it('当文件不存在时返回正确的错误信息', async () => {
    // 设置模拟错误
    mockWriteMetadataForImage.mockRejectedValue(
      new FileNotFoundError('/path/to/nonexistent.jpg')
    );

    const params = { ...validParams };

    // 执行测试
    const result = await writeImageMetadataHandler(params, mockContext);
    
    // 验证错误响应
    expect(result.success).toBe(false);
    expect(result.message).toContain('文件未找到');
  });

  // 错误处理测试：文件无写入权限
  it('当文件无写入权限时返回正确的错误信息', async () => {
    // 设置模拟错误
    mockWriteMetadataForImage.mockRejectedValue(
      new FileAccessError('/path/to/readonly.jpg', 'write')
    );

    const params = { ...validParams };

    // 执行测试
    const result = await writeImageMetadataHandler(params, mockContext);
    
    // 验证错误响应
    expect(result.success).toBe(false);
    expect(result.message).toContain('文件写入权限错误');
  });

  // 错误处理测试：不支持的文件格式
  it('当文件格式不支持时返回正确的错误信息', async () => {
    // 设置模拟错误
    mockWriteMetadataForImage.mockRejectedValue(
      new UnsupportedFileFormatError('/path/to/file.xyz', 'xyz')
    );

    const params = { ...validParams };

    // 执行测试
    const result = await writeImageMetadataHandler(params, mockContext);
    
    // 验证错误响应
    expect(result.success).toBe(false);
    expect(result.message).toContain('不支持的文件格式');
  });

  // 错误处理测试：元数据写入失败
  it('当元数据写入失败时返回正确的错误信息', async () => {
    // 设置模拟错误
    mockWriteMetadataForImage.mockRejectedValue(
      new MetadataWriteError('/path/to/file.jpg', '写入元数据失败' as unknown as Error)
    );

    const params = { ...validParams };

    // 执行测试
    const result = await writeImageMetadataHandler(params, mockContext);
    
    // 验证错误响应
    expect(result.success).toBe(false);
    expect(result.message).toContain('元数据写入失败');
  });

  // 错误处理测试：ExifTool超时
  it('当ExifTool操作超时时返回正确的错误信息', async () => {
    // 设置模拟错误
    mockWriteMetadataForImage.mockRejectedValue(
      new ExifToolTimeoutError('/path/to/file.jpg', 'write', 5000)
    );

    const params = { ...validParams };

    // 执行测试
    const result = await writeImageMetadataHandler(params, mockContext);
    
    // 验证错误响应
    expect(result.success).toBe(false);
    expect(result.message).toContain('ExifTool执行超时');
  });

  // 错误处理测试：ExifTool进程错误
  it('当ExifTool进程错误时返回正确的错误信息', async () => {
    // 设置模拟错误
    mockWriteMetadataForImage.mockRejectedValue(
      new ExifToolProcessError(1, 'exiftool process error')
    );

    const params = { ...validParams };

    // 执行测试
    const result = await writeImageMetadataHandler(params, mockContext);
    
    // 验证错误响应
    expect(result.success).toBe(false);
    expect(result.message).toContain('ExifTool处理错误');
  });

  // 错误处理测试：未识别错误
  it('当遇到未识别的错误时返回内部错误信息', async () => {
    // 设置模拟错误 - 使用一般的Error对象
    mockWriteMetadataForImage.mockRejectedValue(
      new Error('未知错误')
    );

    const params = { ...validParams };

    // 执行测试
    const result = await writeImageMetadataHandler(params, mockContext);
    
    // 验证错误响应
    expect(result.success).toBe(false);
    expect(result.message).toContain('写入元数据时发生内部错误');
  });

  // 错误处理测试：相对路径
  it('当使用相对路径时返回正确的错误信息', async () => {
    const params = {
      ...validParams,
      filePath: 'relative/path/to/file.jpg' // 使用相对路径
    };

    // 执行测试
    const result = await writeImageMetadataHandler(params, mockContext);
    
    // 验证错误响应
    expect(result.success).toBe(false);
    expect(result.message).toContain('不允许使用相对路径');
  });

  // 参数验证测试：标签长度限制
  it('当标签长度超过限制时返回错误响应', async () => {
    // 生成超长标签
    const longTag = 'a'.repeat(150); // 超过MAX_TAG_LENGTH的标签
    
    const paramsWithLongTag = {
      ...validParams,
      metadata: {
        ...validParams.metadata,
        tags: ['ValidTag', longTag, 'AnotherTag']
      }
    };

    // 执行方法
    const result = await writeImageMetadataHandler(paramsWithLongTag, mockContext);
    
    // 验证返回错误响应
    expect(result.success).toBe(false);
    expect(result.message).toContain('标签长度不能超过');
  });

  // 参数验证测试：人物名称长度限制
  it('当人物名称长度超过限制时返回错误响应', async () => {
    // 生成超长人物名
    const longName = 'a'.repeat(150); // 超过MAX_PERSON_NAME_LENGTH的名称
    
    const paramsWithLongName = {
      ...validParams,
      metadata: {
        ...validParams.metadata,
        people: ['ValidPerson', longName, 'AnotherPerson']
      }
    };

    // 执行方法
    const result = await writeImageMetadataHandler(paramsWithLongName, mockContext);
    
    // 验证返回错误响应
    expect(result.success).toBe(false);
    expect(result.message).toContain('人物名称长度不能超过');
  });

  // 参数验证测试：标签数量限制
  it('当标签数量超过限制时返回错误响应', async () => {
    // 生成大量标签
    const tooManyTags = Array(60).fill(0).map((_, i) => `Tag${i}`); // 超过MAX_TAGS_COUNT的标签数量
    
    const paramsWithTooManyTags = {
      ...validParams,
      metadata: {
        ...validParams.metadata,
        tags: tooManyTags
      }
    };

    // 执行方法
    const result = await writeImageMetadataHandler(paramsWithTooManyTags, mockContext);
    
    // 验证返回错误响应
    expect(result.success).toBe(false);
    expect(result.message).toContain('标签数量过多');
  });

  // 参数验证测试：人物数量限制
  it('当人物数量超过限制时返回错误响应', async () => {
    // 生成大量人物名称
    const tooManyPeople = Array(60).fill(0).map((_, i) => `Person${i}`); // 超过MAX_PEOPLE_COUNT的人物数量
    
    const paramsWithTooManyPeople = {
      ...validParams,
      metadata: {
        ...validParams.metadata,
        people: tooManyPeople
      }
    };

    // 执行方法
    const result = await writeImageMetadataHandler(paramsWithTooManyPeople, mockContext);
    
    // 验证返回错误响应
    expect(result.success).toBe(false);
    expect(result.message).toContain('人物数量过多');
  });

  // 参数验证成功测试：验证所有有效参数能通过校验
  it('合法的参数应该通过所有业务校验', async () => {
    // 设置有效但接近边界的参数
    const validTagsAtLimit = Array.from({ length: 50 }, (_, i) => `ValidTag${i + 1}`);
    const validPeopleAtLimit = Array.from({ length: 50 }, (_, i) => `ValidPerson${i + 1}`);
    const validLongDescription = 'D'.repeat(10000); // 正好10000字符
    const validLongLocation = 'L'.repeat(1000); // 正好1000字符
    const validLongTag = 'T'.repeat(100); // 正好100字符
    const validLongPerson = 'P'.repeat(100); // 正好100字符
    
    const paramsAtValidLimits = {
      filePath: '/absolute/path/to/test.jpg',
      metadata: {
        tags: [...validTagsAtLimit.slice(0, 49), validLongTag], // 包含一个边界长度标签
        people: [...validPeopleAtLimit.slice(0, 49), validLongPerson], // 包含一个边界长度人物名称
        description: validLongDescription,
        location: validLongLocation
      },
      overwrite: true
    };
    
    // 设置模拟成功
    mockWriteMetadataForImage.mockResolvedValue(undefined);
    
    // 验证不会抛出错误
    await expect(writeImageMetadataHandler(paramsAtValidLimits, mockContext)).resolves.not.toThrow();
    
    // 验证元数据服务被调用，参数正确传递
    expect(mockWriteMetadataForImage).toHaveBeenCalledWith(
      paramsAtValidLimits.filePath,
      paramsAtValidLimits.metadata,
      paramsAtValidLimits.overwrite
    );
  });
}); 