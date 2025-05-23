# MetaTag Genie

[![npm version](https://badge.fury.io/js/metatag-genie.svg)](https://badge.fury.io/js/metatag-genie)
![NPM Downloads](https://img.shields.io/npm/dw/metatag-genie)
[![Node.js Version](https://img.shields.io/node/v/metatag-genie)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/terryso/metatag-genie/pulls)
[![smithery badge](https://smithery.ai/badge/@terryso/meta_tag_genie)](https://smithery.ai/server/@terryso/meta_tag_genie)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![DeepWiki](https://img.shields.io/badge/DeepWiki-项目文档-blue)](https://deepwiki.com/terryso/metatag-genie)

## 简介

MetaTag Genie 是一个 macOS Stdio MCP 服务，专为写入图片元数据以增强 Spotlight 搜索而设计。该服务可被 AI 代理或其他需要本地管理图片元数据的应用程序调用，通过标准输入输出（Stdio）与客户端通信，提供符合 MCP (Machine Comprehension Protocol) 规范的接口。

## 功能特性

- 通过 Stdio 暴露符合 MCP 规范的服务
- 提供 `writeImageMetadata` MCP Tool
- 支持向 JPG, PNG, HEIC 图片写入元数据
- 支持的元数据类型：
  - 标签 (Tags)
  - 描述 (Description)
  - 人物 (People - 作为关键词)
  - 地点 (Location - 文本)
- 写入的元数据可被 macOS Spotlight 搜索

## 系统要求

- **Node.js 版本**：Node.js 22.x LTS 或更高版本
- **隐含依赖**：本项目使用 `exiftool-vendored`，它会自动管理 ExifTool 的依赖

## 安装

### 安装 Smithery

要自动将 MetaTag Genie 安装到 Claude Desktop，请使用 [Smithery](https://smithery.ai/server/@terryso/meta_tag_genie)：

```bash
npx -y @smithery/cli install @terryso/metatag_genie --client claude
```

### 通过NPM安装（推荐）

```bash
# 全局安装
npm install -g metatag-genie
```

使用全局安装后，可以通过以下命令直接运行：

```bash
metatag-genie
```

或者，您可以不安装直接使用npx运行：

```bash
npx metatag-genie
```

这种方式不需要全局安装，也是AI代理等客户端调用的推荐方式。

### 通过源码安装

```bash
# 1. 克隆仓库
git clone <repository-url>
cd metatag-genie

# 2. 安装依赖
npm install
# 或者: yarn install

# 3. 编译 TypeScript 代码
npm run build
# 或者: yarn build

# 4. 本地链接（可选，用于测试npx和命令行调用）
npm link
```

## 运行服务

### 通过NPX运行（推荐）

安装包后，可以直接通过npx运行：

```bash
npx metatag-genie
```

这种方式不需要全局安装包，适合作为AI代理或其他客户端的调用方式。

### 开发模式

开发过程中，可以直接使用TypeScript源码运行服务：

```bash
npm run start:dev
```

此命令使用`ts-node`直接运行TypeScript代码，无需预先编译，适合快速开发和调试。

### 生产模式

构建后，可以通过以下命令运行编译好的JavaScript代码：

```bash
npm start
# 或者直接: node dist/main.js
```

服务启动后会监听标准输入输出（Stdio），等待MCP客户端连接并发送JSON-RPC消息。

### 与MCP客户端集成

AI代理（如Cursor）或其他客户端需要在其配置中指定命令的完整路径：

- 基于Node.js：`/usr/local/bin/node /path/to/metatag-genie/dist/main.js`
- 使用npx：`/usr/local/bin/npx metatag-genie`

注意：本服务不监听网络端口，仅通过标准输入输出通信。

### Cursor MCP集成

在Cursor编辑器中，可以通过以下步骤集成MetaTag Genie：

1. 在项目根目录创建`.cursor/mcp.json`文件
2. 添加以下配置内容：

```json
{
  "mcpServers": {
    "MetaTagGenie": {
      "command": "npx",
      "args": [
        "-y",
        "metatag-genie"
      ]
    }
  }
}
```

配置完成后，Cursor中的AI助手将能够使用MetaTag Genie提供的writeImageMetadata工具，直接为图片添加元数据，增强Spotlight搜索体验。

## MCP 交互协议

### 基础

通信基于 Stdio 上的 JSON-RPC 2.0 协议。

### 初始化流程

客户端需要先发送 `initialize` 请求，服务器响应 `InitializeResult`，然后客户端发送 `initialized` 通知完成握手。

### Tool 调用

#### 示例：writeImageMetadata 调用

**JSON-RPC 请求示例**:

```json
{
  "jsonrpc": "2.0",
  "id": "request-id-123",
  "method": "writeImageMetadata",
  "params": {
    "filePath": "/Users/username/Pictures/photo.jpg",
    "metadata": {
      "tags": ["Vacation", "Beach"],
      "description": "Sunset view from the hotel.",
      "people": ["Alice", "Bob"],
      "location": "Hawaii, USA"
    },
    "overwrite": true
  }
}
```

**JSON-RPC 成功响应示例**:

```json
{
  "jsonrpc": "2.0",
  "id": "request-id-123",
  "result": {
    "success": true,
    "filePath": "/Users/username/Pictures/photo.jpg",
    "message": "Metadata successfully written."
  }
}
```

**注意**：实际使用时 `filePath` 需要是有效的绝对路径。

完整的 Tool 参数、返回值和错误代码定义，请参阅 [MCP Tools 定义文档](./docs/mcp-tools-definition.md)。

## 运行测试

```bash
# 运行所有单元测试和集成测试
npm test
# 或者: yarn test

# 在监视模式下运行测试
npm run test:watch
# 或者: yarn test:watch

# 运行测试并生成覆盖率报告 (输出到 coverage/ 目录)
npm run test:cov
# 或者: yarn test:cov
```

关于不同测试层级的更多信息，请参阅 [测试策略文档](./docs/testing-strategy.md)。

## 开发与贡献

### 代码风格

项目使用 ESLint 和 Prettier 强制代码风格，详细规范请参阅 [编码规范文档](./docs/coding-standards.md)。

请在提交代码前运行以下命令：

```bash
# 检查代码风格
npm run lint

# 自动格式化代码
npm run format
```

### 分支策略

- `master` 分支用于发布稳定版本
- 开发新功能或修复 Bug 时，从 `master` 创建特性分支（例如 `feature/add-png-support` 或 `fix/handle-exiftool-error`）
- 完成后提交 Pull Request (PR) 到 `master` 分支

### Pull Request (PR) 流程

- PR 应包含清晰的描述，说明变更内容和原因
- PR 需要通过所有 CI 检查 (Linting, Tests, Build)
- 鼓励进行代码审查

### 报告问题

如需报告 Bug 或提出功能建议，请在项目的 Issue Tracker 中创建新的 Issue，并提供尽可能详细的信息。

### 持续集成与自动发布

本项目使用GitHub Actions进行持续集成和自动发布：

- 每次Push和PR会自动运行测试和构建
- 创建Release后会自动发布到NPM

提交PR时请确保通过所有CI检查。如需发布新版本：

1. 更新`package.json`中的版本号
2. 创建一个新的GitHub Release
3. GitHub Actions会自动将包发布到NPM

## 文档链接

- [架构文档](./docs/architecture.md)
- [技术栈](./docs/tech-stack.md)
- [项目结构](./docs/project-structure.md)
- [MCP Tool 定义](./docs/mcp-tools-definition.md)
- [测试策略](./docs/testing-strategy.md)
- [编码规范](./docs/coding-standards.md)
- [元数据字段映射](./docs/metadata-field-mapping.md)
- [手动 Spotlight 测试计划](./docs/manual-spotlight-tests.md)

## 许可证

本项目采用 MIT 许可证。详情请参阅项目根目录下的 LICENSE 文件。 
