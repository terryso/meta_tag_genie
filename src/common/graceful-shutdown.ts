import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { MetadataWriterService } from '../core/metadata-writer';

// 关闭操作的最大超时时间(毫秒)
const SHUTDOWN_TIMEOUT_MS = 5000;

export function initializeGracefulShutdown(
  server: McpServer,
  metadataWriter: MetadataWriterService,
  _transport: StdioServerTransport
): void {
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  
  // 用于跟踪关闭是否已经开始，避免多次触发
  let isShuttingDown = false;

  /**
   * 执行超时操作
   * @param operation 要执行的异步操作
   * @param timeoutMs 超时时间(毫秒)
   * @param operationName 操作名称(用于日志)
   */
  const executeWithTimeout = async <T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    operationName: string
  ): Promise<T | undefined> => {
    return new Promise<T | undefined>((resolve) => {
      // 设置超时
      const timeout = setTimeout(() => {
        console.warn(`${operationName} 操作超时 (${timeoutMs}ms)。继续关闭流程。`);
        resolve(undefined);
      }, timeoutMs);

      // 执行操作
      operation()
        .then((result) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((error) => {
          console.error(`${operationName} 操作失败:`, error);
          clearTimeout(timeout);
          resolve(undefined);
        });
    });
  };

  /**
   * 主要关闭函数
   */
  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    // 防止多次触发关闭过程
    if (isShuttingDown) {
      console.log(`已经在关闭过程中，忽略额外的 ${signal} 信号`);
      return;
    }
    
    isShuttingDown = true;
    console.log(`\n接收到 ${signal} 信号。正在关闭 MetaTag Genie 服务器...`);
    
    let exitCode = 0;
    
    try {
      // 1. 尝试关闭 MCP 服务器
      console.log('正在关闭 MCP 服务器...');
      await executeWithTimeout(
        async () => server.close(),
        SHUTDOWN_TIMEOUT_MS,
        'MCP Server close'
      );
      console.log('MCP 服务器已关闭。');

      // 2. 关闭 ExifTool 进程
      console.log('正在释放 MetadataWriterService 资源...');
      await executeWithTimeout(
        async () => metadataWriter.end(),
        SHUTDOWN_TIMEOUT_MS,
        'MetadataWriter end'
      );
      console.log('MetadataWriterService 资源已释放。');

      console.log('关闭流程完成。');
    } catch (error) {
      console.error('优雅关闭过程中发生错误:', error);
      exitCode = 1;
    } finally {
      // 确保进程退出，无论是否发生错误
      console.log(`进程即将退出，退出码: ${exitCode}`);
      process.exit(exitCode);
    }
  };

  // 注册信号处理程序
  for (const signal of signals) {
    process.once(signal, () => shutdown(signal));
  }

  // 处理未捕获的异常
  process.on('uncaughtException', async (error) => {
    console.error('未捕获的异常:', error);
    if (!isShuttingDown) {
      isShuttingDown = true;
      
      // 尝试清理资源
      console.log('尝试在未捕获异常处理中清理资源...');
      try {
        await executeWithTimeout(
          async () => metadataWriter.end(),
          SHUTDOWN_TIMEOUT_MS,
          'MetadataWriter end (uncaughtException)'
        );
        console.log('在未捕获异常处理中成功清理了资源。');
      } catch (cleanupError) {
        console.error('在未捕获异常处理中清理资源失败:', cleanupError);
      }
      
      console.error('进程因未捕获的异常而退出');
      process.exit(1);
    }
  });

  // 处理未处理的 Promise rejections
  process.on('unhandledRejection', async (reason, promise) => {
    console.error('未处理的 Promise rejection:', promise, '原因:', reason);
    if (!isShuttingDown) {
      isShuttingDown = true;
      
      // 尝试清理资源
      console.log('尝试在未处理的 Promise rejection 处理中清理资源...');
      try {
        await executeWithTimeout(
          async () => metadataWriter.end(),
          SHUTDOWN_TIMEOUT_MS,
          'MetadataWriter end (unhandledRejection)'
        );
        console.log('在未处理的 Promise rejection 处理中成功清理了资源。');
      } catch (cleanupError) {
        console.error('在未处理的 Promise rejection 处理中清理资源失败:', cleanupError);
      }
      
      console.error('进程因未处理的 Promise rejection 而退出');
      process.exit(1);
    }
  });

  console.log('已初始化优雅关闭处理程序，监听 SIGINT 和 SIGTERM 信号');
} 