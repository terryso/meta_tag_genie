/**
 * 示例测试套件
 *
 * 这只是一个简单的测试示例，用于验证 Jest 配置是否正确
 */

describe('Example Test Suite', () => {
  it('should ensure true is true', () => {
    expect(true).toBe(true);
  });

  it('should add two numbers correctly', () => {
    const sum = (a: number, b: number): number => a + b;
    expect(sum(1, 2)).toBe(3);
  });
});
