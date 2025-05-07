import { jest } from '@jest/globals';
import { writeImageMetadataHandler, WriteImageMetadataParams } from '../../../../src/mcp/tools/writeImageMetadata';
import { 
  ERROR_CODES, 
  FileNotFoundError, 
  MetadataWriteError,
  FileAccessError,
  UnsupportedFileFormatError,
  ExifToolTimeoutError,
  ExifToolProcessError,
  JsonRpcError
} from '../../../../src/common/errors';
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
  it('当标签包含空字符串时抛出JsonRpcError', async () => {
    // 带有空字符串的无效标签
    const paramsWithEmptyTag = {
      ...validParams,
      metadata: {
        ...validParams.metadata,
        tags: ['ValidTag', '   ', 'AnotherTag']
      }
    };

    // 验证抛出错误
    await expect(async () => {
      // 在这个测试中不需要mock，因为参数验证发生在调用服务之前
      // 所以这里不设置mockWriteMetadataForImage的返回值
      await writeImageMetadataHandler(paramsWithEmptyTag, mockContext);
    }).rejects.toThrow(JsonRpcError);

    try {
      await writeImageMetadataHandler(paramsWithEmptyTag, mockContext);
    } catch (error) {
      const jsonRpcError = error as JsonRpcError;
      // 验证错误代码和消息
      expect(jsonRpcError.code).toBe(ERROR_CODES.INVALID_METADATA_STRUCTURE);
      expect(jsonRpcError.message).toContain('标签');
      expect(jsonRpcError.data).toHaveProperty('invalidTags');
      // 确保data.invalidTags包含空字符串标签
      expect(jsonRpcError.data.invalidTags).toContain('   ');
    }
  });

  // 参数验证测试：人物名称不能为空字符串
  it('当人物名称包含空字符串时抛出JsonRpcError', async () => {
    // 带有空字符串的无效人物名称
    const paramsWithEmptyPerson = {
      ...validParams,
      metadata: {
        ...validParams.metadata,
        people: ['ValidPerson', '', 'AnotherPerson']
      }
    };

    // 验证抛出错误
    await expect(async () => {
      await writeImageMetadataHandler(paramsWithEmptyPerson, mockContext);
    }).rejects.toThrow(JsonRpcError);

    try {
      await writeImageMetadataHandler(paramsWithEmptyPerson, mockContext);
    } catch (error) {
      const jsonRpcError = error as JsonRpcError;
      // 验证错误代码和消息
      expect(jsonRpcError.code).toBe(ERROR_CODES.INVALID_METADATA_STRUCTURE);
      expect(jsonRpcError.message).toContain('人物');
      expect(jsonRpcError.data).toHaveProperty('invalidPeople');
      // 确保data.invalidPeople包含空字符串人物
      expect(jsonRpcError.data.invalidPeople).toContain('');
    }
  });

  // 参数验证测试：描述不能过长
  it('当描述文本过长时抛出JsonRpcError', async () => {
    // 生成一个超长描述
    const longDescription = 'A'.repeat(11000); // 超过10000字符
    
    const paramsWithLongDesc = {
      ...validParams,
      metadata: {
        ...validParams.metadata,
        description: longDescription
      }
    };

    // 验证抛出错误
    await expect(async () => {
      await writeImageMetadataHandler(paramsWithLongDesc, mockContext);
    }).rejects.toThrow(JsonRpcError);

    try {
      await writeImageMetadataHandler(paramsWithLongDesc, mockContext);
    } catch (error) {
      const jsonRpcError = error as JsonRpcError;
      // 验证错误代码和消息
      expect(jsonRpcError.code).toBe(ERROR_CODES.INVALID_METADATA_STRUCTURE);
      expect(jsonRpcError.message).toContain('描述');
      expect(jsonRpcError.message).toContain('过长');
      expect(jsonRpcError.data).toHaveProperty('descriptionLength');
      expect(jsonRpcError.data).toHaveProperty('maxLength');
      // 确保长度值正确
      expect(jsonRpcError.data.descriptionLength).toBe(11000);
      expect(jsonRpcError.data.maxLength).toBe(10000);
    }
  });

  // 错误处理测试 - FileNotFoundError
  it('当文件不存在时正确映射到FILE_NOT_FOUND JsonRpcError', async () => {
    // 安排mock抛出FileNotFoundError
    const errorFilePath = '/path/to/nonexistent/image.jpg';
    mockWriteMetadataForImage.mockRejectedValueOnce(
      new FileNotFoundError(errorFilePath)
    );

    // 准备测试参数
    const params = {
      ...validParams,
      filePath: errorFilePath
    };

    // 执行测试
    await expect(async () => {
      await writeImageMetadataHandler(params, mockContext);
    }).rejects.toThrow(JsonRpcError);
    
    try {
      await writeImageMetadataHandler(params, mockContext);
    } catch (error) {
      const jsonRpcError = error as JsonRpcError;
      expect(jsonRpcError.code).toBe(ERROR_CODES.FILE_NOT_FOUND);
      expect(jsonRpcError.message).toContain('文件未找到');
      expect(jsonRpcError.data).toHaveProperty('filePath', errorFilePath);
    }
  });

  // 错误处理测试 - FileAccessError (写入权限)
  it('当文件无写入权限时正确映射到FILE_NOT_WRITABLE JsonRpcError', async () => {
    // 安排mock抛出FileAccessError (写入)
    const errorFilePath = '/path/to/readonly/image.jpg';
    mockWriteMetadataForImage.mockRejectedValueOnce(
      new FileAccessError(errorFilePath, 'write')
    );

    // 准备测试参数
    const params = {
      ...validParams,
      filePath: errorFilePath
    };

    // 执行测试
    await expect(async () => {
      await writeImageMetadataHandler(params, mockContext);
    }).rejects.toThrow(JsonRpcError);
    
    try {
      await writeImageMetadataHandler(params, mockContext);
    } catch (error) {
      const jsonRpcError = error as JsonRpcError;
      expect(jsonRpcError.code).toBe(ERROR_CODES.FILE_NOT_WRITABLE);
      expect(jsonRpcError.message).toContain('写入');
      expect(jsonRpcError.data).toHaveProperty('filePath', errorFilePath);
      expect(jsonRpcError.data).toHaveProperty('operation', 'write');
    }
  });

  // 错误处理测试 - UnsupportedFileFormatError
  it('当文件格式不支持时正确映射到UNSUPPORTED_FILE_FORMAT JsonRpcError', async () => {
    // 安排mock抛出UnsupportedFileFormatError
    const errorFilePath = '/path/to/textfile.txt';
    const format = 'txt';
    mockWriteMetadataForImage.mockRejectedValueOnce(
      new UnsupportedFileFormatError(errorFilePath, format)
    );

    // 准备测试参数
    const params = {
      ...validParams,
      filePath: errorFilePath
    };

    // 执行测试
    await expect(async () => {
      await writeImageMetadataHandler(params, mockContext);
    }).rejects.toThrow(JsonRpcError);
    
    try {
      await writeImageMetadataHandler(params, mockContext);
    } catch (error) {
      const jsonRpcError = error as JsonRpcError;
      expect(jsonRpcError.code).toBe(ERROR_CODES.UNSUPPORTED_FILE_FORMAT);
      expect(jsonRpcError.message).toContain('不支持的文件格式');
      expect(jsonRpcError.data).toHaveProperty('filePath', errorFilePath);
      expect(jsonRpcError.data).toHaveProperty('format', format);
    }
  });

  // 错误处理测试 - MetadataWriteError
  it('当元数据写入失败时正确映射到METADATA_WRITE_FAILED JsonRpcError', async () => {
    // 安排mock抛出MetadataWriteError
    const errorFilePath = '/path/to/problematic/image.jpg';
    mockWriteMetadataForImage.mockRejectedValueOnce(
      new MetadataWriteError(errorFilePath, new Error('磁盘空间不足'))
    );

    // 准备测试参数
    const params = {
      ...validParams,
      filePath: errorFilePath
    };

    // 执行测试
    await expect(async () => {
      await writeImageMetadataHandler(params, mockContext);
    }).rejects.toThrow(JsonRpcError);
    
    try {
      await writeImageMetadataHandler(params, mockContext);
    } catch (error) {
      const jsonRpcError = error as JsonRpcError;
      expect(jsonRpcError.code).toBe(ERROR_CODES.METADATA_WRITE_FAILED);
      expect(jsonRpcError.message).toContain('写入元数据失败');
      expect(jsonRpcError.data).toHaveProperty('filePath', errorFilePath);
    }
  });

  // 错误处理测试 - ExifToolTimeoutError
  it('当ExifTool操作超时时正确映射到EXIFTOOL_TIMEOUT JsonRpcError', async () => {
    // 安排mock抛出ExifToolTimeoutError
    const errorFilePath = '/path/to/large/image.jpg';
    const operation = 'write';
    const timeoutMs = 5000;
    mockWriteMetadataForImage.mockRejectedValueOnce(
      new ExifToolTimeoutError(errorFilePath, operation, timeoutMs)
    );

    // 准备测试参数
    const params = {
      ...validParams,
      filePath: errorFilePath
    };

    // 执行测试
    await expect(async () => {
      await writeImageMetadataHandler(params, mockContext);
    }).rejects.toThrow(JsonRpcError);
    
    try {
      await writeImageMetadataHandler(params, mockContext);
    } catch (error) {
      const jsonRpcError = error as JsonRpcError;
      expect(jsonRpcError.code).toBe(ERROR_CODES.EXIFTOOL_TIMEOUT);
      expect(jsonRpcError.message).toContain('超时');
      expect(jsonRpcError.data).toHaveProperty('filePath', errorFilePath);
      expect(jsonRpcError.data).toHaveProperty('operation', operation);
      expect(jsonRpcError.data).toHaveProperty('timeoutMs', timeoutMs);
    }
  });

  // 错误处理测试 - ExifToolProcessError
  it('当ExifTool进程错误时正确映射到EXIFTOOL_PROCESS_ERROR JsonRpcError', async () => {
    // 安排mock抛出ExifToolProcessError
    const exitCode = 1;
    const stderr = 'ExifTool error message';
    mockWriteMetadataForImage.mockRejectedValueOnce(
      new ExifToolProcessError('ExifTool进程错误', exitCode, stderr)
    );

    // 准备测试参数
    const params = {
      ...validParams
    };

    // 执行测试
    await expect(async () => {
      await writeImageMetadataHandler(params, mockContext);
    }).rejects.toThrow(JsonRpcError);
    
    try {
      await writeImageMetadataHandler(params, mockContext);
    } catch (error) {
      const jsonRpcError = error as JsonRpcError;
      expect(jsonRpcError.code).toBe(ERROR_CODES.EXIFTOOL_PROCESS_ERROR);
      expect(jsonRpcError.message).toContain('ExifTool进程错误');
      expect(jsonRpcError.data).toHaveProperty('exitCode', exitCode);
    }
  });

  // 错误处理测试 - 未知错误
  it('当遇到未识别的错误时映射到JSON_RPC_INTERNAL_ERROR', async () => {
    // 安排mock抛出一个普通的Error
    mockWriteMetadataForImage.mockRejectedValueOnce(
      new Error('未知的内部错误')
    );

    // 准备测试参数
    const params = {
      ...validParams
    };

    // 执行测试
    await expect(async () => {
      await writeImageMetadataHandler(params, mockContext);
    }).rejects.toThrow(JsonRpcError);
    
    try {
      await writeImageMetadataHandler(params, mockContext);
    } catch (error) {
      const jsonRpcError = error as JsonRpcError;
      expect(jsonRpcError.code).toBe(ERROR_CODES.JSON_RPC_INTERNAL_ERROR);
      expect(jsonRpcError.message).toContain('内部服务器错误');
      expect(jsonRpcError.data).toHaveProperty('errorMessage', '未知的内部错误');
    }
  });

  // 错误处理测试 - RelativePathError
  it('当使用相对路径时正确映射到RELATIVE_PATH_NOT_ALLOWED JsonRpcError', async () => {
    // 准备测试参数 - 使用相对路径
    const relativeFilePath = 'relative/path/to/image.jpg';
    const params = {
      ...validParams,
      filePath: relativeFilePath
    };

    // 执行测试
    await expect(async () => {
      await writeImageMetadataHandler(params, mockContext);
    }).rejects.toThrow(JsonRpcError);
    
    try {
      await writeImageMetadataHandler(params, mockContext);
    } catch (error) {
      const jsonRpcError = error as JsonRpcError;
      expect(jsonRpcError.code).toBe(ERROR_CODES.RELATIVE_PATH_NOT_ALLOWED);
      expect(jsonRpcError.message).toContain('相对路径');
      expect(jsonRpcError.data).toHaveProperty('filePath', relativeFilePath);
    }
  });
}); 