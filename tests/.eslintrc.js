module.exports = {
  extends: '../.eslintrc.js',
  rules: {
    // 在测试文件中放宽类型检查，允许使用 any
    '@typescript-eslint/no-explicit-any': 'off',
    // 允许在测试文件中使用 ts-ignore 注释
    '@typescript-eslint/ban-ts-comment': 'off'
  }
}; 