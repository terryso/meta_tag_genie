module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'eslint-config-prettier',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  rules: {
    // 放宽一些规则，以便我们可以专注于主要功能
    '@typescript-eslint/no-explicit-any': 'warn', // 降级为警告
    '@typescript-eslint/no-unused-vars': ['error', { 
      'argsIgnorePattern': '^_',  // 忽略以下划线开头的参数
      'varsIgnorePattern': '^_',  // 忽略以下划线开头的变量
    }],
  },
  overrides: [
    {
      // 对于类型声明文件，禁用一些规则
      files: ['*.d.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    {
      // 对于测试文件，放宽一些规则
      files: ['tests/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
}; 