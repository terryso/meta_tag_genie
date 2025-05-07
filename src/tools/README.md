# MetaTag Genie 工具使用指南

本目录包含了用于操作和测试 MetaTag Genie 服务的实用工具脚本。

## 工具概览

1. **单文件元数据写入工具** (`write-metadata.js`)
   - 用于对单个图片文件写入元数据
   - 支持四种预设的元数据组合

2. **Spotlight 测试批量准备工具** (`spotlight-test-setup.js`)
   - 根据 `docs/manual-spotlight-tests.md` 文档中定义的所有测试用例自动创建测试数据
   - 批量处理多个测试图片

3. **MCP工具列表查询脚本** (`list-tools.js`)
   - 用于查询和列出 MCP 服务支持的所有工具和方法

## 使用方法

### 构建项目

在使用这些工具前，请确保先构建项目：

```bash
npm run build
```

### 单文件元数据写入

```bash
# 添加标签和描述
node src/tools/write-metadata.js ~/Desktop/test.jpg tags-desc

# 添加人物信息
node src/tools/write-metadata.js ~/Desktop/test.jpg people

# 添加地点信息
node src/tools/write-metadata.js ~/Desktop/test.jpg location

# 添加所有类型元数据
node src/tools/write-metadata.js ~/Desktop/test.jpg all
```

### Spotlight 测试批量准备

```bash
# 创建所有测试用例
node src/tools/spotlight-test-setup.js ~/Desktop/spotlight-test-images

# 强制 Spotlight 立即索引
mdimport ~/Desktop/spotlight-test-images
```

创建的测试图片会按照 `docs/manual-spotlight-tests.md` 中定义的 ID 命名，方便与测试矩阵对照。

### 查询可用工具

```bash
# 列出服务支持的工具
node tools/list-tools.js
```

## Spotlight 搜索验证

写入元数据后，可以使用辅助脚本验证元数据是否已被 Spotlight 索引：

```bash
# 检查特定文件的特定标签
node tests/helper-mdfind.js ~/Desktop/test.jpg "Vacation" tags

# 搜索人物名称
node tests/helper-mdfind.js ~/Desktop/test.jpg "Alice" people

# 搜索地点关键词
node tests/helper-mdfind.js ~/Desktop/test.jpg "Paris" location

# 显示文件的所有元数据属性
node tests/helper-mdfind.js ~/Desktop/test.jpg
```

## 常见问题解决

1. **"Method not found" 错误**
   - 确保服务正确实现了 `writeImageMetadata` 工具
   - 检查 MCP 服务是否正确注册了工具

2. **元数据未被索引**
   - 使用 `mdls <文件路径>` 检查元数据是否写入成功
   - 强制重新索引：`mdimport -f <文件路径>`

3. **服务启动失败**
   - 检查是否正确构建了项目 (`npm run build`)
   - 检查是否有其他服务实例正在运行 