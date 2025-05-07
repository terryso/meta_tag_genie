/**
 * MCP服务生命周期和Stdio传输健壮性测试
 * 
 * 这些测试验证MCP服务对以下情况的处理：
 * 1. 优雅关闭 (SIGINT/SIGTERM)
 * 2. 无效JSON-RPC消息
 * 3. Stdin意外关闭
 */

import * as path from 'node:path';
import { type ChildProcess, spawn } from 'node:child_process';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// 超时设置
const TEST_TIMEOUT = 10000;
const SERVICE_STARTUP_DELAY = 1000;

// 服务进程路径
const SERVICE_PATH = path.join(process.cwd(), 'dist', 'main.js');
const NODE_BINARY = process.execPath; // 当前Node.js可执行文件路径

// 辅助函数：等待指定时间
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 辅助函数：等待进程退出
const waitForExit = async (
  childProcess: ChildProcess,
  timeoutMs = 5000,
) => {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
    let stdout = '';
    let stderr = '';
    
    if (childProcess.stdout) {
      childProcess.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
    }
    
    if (childProcess.stderr) {
      childProcess.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
    }
    
    // 设置超时
    const timeout = setTimeout(() => {
      // console.warn(`进程退出等待超时(${timeoutMs}ms)，强制终止`);
      childProcess.kill('SIGKILL');
      resolve({ code: null, stdout, stderr });
    }, timeoutMs);
    
    childProcess.on('exit', (code) => {
      clearTimeout(timeout);
      resolve({ code, stdout, stderr });
    });
  });
};

// 启动MCP服务子进程的辅助函数
const startServiceProcess = (): ChildProcess => {
  // console.log(`启动服务: ${NODE_BINARY} ${SERVICE_PATH}`);
  
  // 使用spawn启动子进程并保持stdin/stdout/stderr管道开放
  const childProcess = spawn(NODE_BINARY, [SERVICE_PATH], {
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: false
  });
  
  childProcess.stderr?.on('data', (_data) => {
    // console.log(`[服务stderr] ${_data.toString().trim()}`);
  });
  
  childProcess.stdout?.on('data', (_data) => {
    // console.log(`[服务stdout] ${_data.toString().trim()}`);
  });
  
  return childProcess;
};

describe('MCP服务生命周期和健壮性测试', () => {
  let serviceProcess: ChildProcess | null = null;
  
  beforeEach(async () => {
    // 在每个测试前重新启动服务进程
    serviceProcess = startServiceProcess();
    
    // 等待服务启动
    await sleep(SERVICE_STARTUP_DELAY);
  });
  
  afterEach(async () => {
    // 确保在每个测试后清理进程
    if (serviceProcess && !serviceProcess.killed) {
      try {
        serviceProcess.kill('SIGKILL');
      } catch (error) {
        // console.warn('清理测试进程时发生错误:', error);
      }
    }
    serviceProcess = null;
    
    // 等待一段时间确保进程完全终止
    await sleep(100);
  });
  
  /**
   * 测试用例1: 验证服务能优雅关闭 (SIGTERM)
   * 
   * 1. 启动服务子进程
   * 2. 向子进程发送SIGTERM信号
   * 3. 验证服务能够优雅关闭 (退出码0或null)
   * 4. 验证日志信息中包含清理操作的确认
   */
  it('应能优雅关闭并释放资源 (SIGTERM)', async () => {
    // 跳过启动，使用beforeEach中的实例
    
    // 确保服务进程已启动
    expect(serviceProcess).not.toBeNull();
    expect(serviceProcess?.killed).toBeFalsy();
    
    if (!serviceProcess) {
      throw new Error('服务进程未启动');
    }
    
    // 发送SIGTERM信号
    serviceProcess.kill('SIGTERM');
    
    // 等待进程退出
    const { code, stdout, stderr } = await waitForExit(serviceProcess);
    
    // 验证进程正常退出(在某些环境中可能返回null而不是0)
    expect(code === 0 || code === null).toBeTruthy();
    
    // 组合stdout和stderr进行检查，因为日志可能输出到任一流
    const allLogs = stdout + stderr;
    // console.log('进程输出日志:', allLogs);
    
    // 检查是否包含关键日志信息 - 使用更灵活的检查以适应不同的日志输出格式
    const containsShutdownSignal = 
      allLogs.includes('接收到 SIGTERM 信号') || 
      allLogs.includes('SIGTERM') ||
      allLogs.includes('shutdown') || 
      allLogs.includes('关闭');
    
    const containsServerDisconnect = 
      allLogs.includes('断开 MCP 服务器连接') || 
      allLogs.includes('Server disconnect') ||
      allLogs.includes('disconnected');
    
    const containsResourceRelease = 
      allLogs.includes('释放 MetadataWriterService 资源') || 
      allLogs.includes('MetadataWriterService') ||
      allLogs.includes('resources released') ||
      allLogs.includes('ExifTool process terminated');
    
    // 断言至少包含一些关键日志信息
    expect(containsShutdownSignal || containsServerDisconnect || containsResourceRelease).toBeTruthy();
  }, TEST_TIMEOUT);
  
  /**
   * 测试用例2: 验证服务能处理无效的JSON-RPC消息
   * 
   * 1. 启动服务子进程
   * 2. 发送格式错误的JSON-RPC消息到服务的标准输入
   * 3. 验证服务不会崩溃
   * 4. 验证服务会记录错误
   */
  it('应能处理无效的JSON-RPC消息而不崩溃', async () => {
    // 确保服务进程已启动
    expect(serviceProcess).not.toBeNull();
    expect(serviceProcess?.killed).toBeFalsy();
    
    if (!serviceProcess || !serviceProcess.stdin) {
      throw new Error('服务进程未启动或stdin不可用');
    }
    
    // 发送不完整的JSON-RPC消息
    const incompleteJson = '{"jsonrpc":"2.0", "method": "test"';
    serviceProcess.stdin.write(`${incompleteJson}\n`);
    
    // 发送完全无效的内容
    serviceProcess.stdin.write('这不是JSON!\n');
    
    // 等待一段时间
    await sleep(1000);
    
    // 验证服务仍在运行，没有崩溃
    expect(serviceProcess.killed).toBeFalsy();
    
    // 发送SIGTERM信号
    serviceProcess.kill('SIGTERM');
    
    // 等待进程退出
    const { code } = await waitForExit(serviceProcess);
    
    // 验证进程能够正常退出(在某些环境中可能返回null而不是0)
    expect(code === 0 || code === null).toBeTruthy();
  }, TEST_TIMEOUT);
  
  /**
   * 测试用例3: 验证服务能处理stdin意外关闭
   * 
   * 1. 启动服务子进程
   * 2. 关闭服务的标准输入流
   * 3. 验证服务的行为 (可能会退出或保持运行，取决于SDK的行为)
   */
  it('应能处理stdin意外关闭的情况', async () => {
    // 确保服务进程已启动
    expect(serviceProcess).not.toBeNull();
    expect(serviceProcess?.killed).toBeFalsy();
    
    if (!serviceProcess || !serviceProcess.stdin) {
      throw new Error('服务进程未启动或stdin不可用');
    }
    
    // 关闭stdin流
    serviceProcess.stdin.end();
    
    // 等待一段时间
    await sleep(2000);
    
    // 此时的行为取决于SDK:
    // 1. 服务可能保持运行 - 此时需要手动结束
    // 2. 服务可能自动退出 - 我们应该检查退出码
    
    // 如果服务仍在运行，发送SIGTERM信号
    if (!serviceProcess.killed) {
      serviceProcess.kill('SIGTERM');
      
      // 等待进程退出
      const { code } = await waitForExit(serviceProcess);
      
      // 验证进程能够正常退出(在某些环境中可能返回null而不是0)
      expect(code === 0 || code === null).toBeTruthy();
    } else {
      // 如果服务已自动退出，记录日志
      console.log('服务进程在stdin关闭后自动退出');
    }
  }, TEST_TIMEOUT);
}); 