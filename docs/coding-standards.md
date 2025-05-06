# MetaTag Genie 编码规范与模式

## 架构 / 设计模式采纳

* **服务模式:** 本地命令行服务，通过 Stdio 进行 MCP 通信。
    * *理由/参考:* 满足 PRD 作为本地工具的需求，便于 AI 代理集成。详见 `docs/architecture.md`。
* **模块化设计:** 代码按功能划分为 `common`, `core`, `mcp` 等模块。
    * *理由/参考:* 提高可维护性、可测试性。详见 `docs/project-structure.md` 和 `docs/architecture.md`。
* **MCP Tool 模式:** 通过 `@modelcontextprotocol/sdk` 定义和暴露 Tools (例如 `writeImageMetadata`)。
    * *理由/参考:* 遵循 MCP 规范，标准化与客户端的交互。
* **错误处理模式:** 在 Tool 实现中捕获具体错误，通过 JSON-RPC 2.0 错误对象返回给调用方。
    * *理由/参考:* 提供清晰、标准的错误反馈。详见 Epic 3 和 `docs/architecture.md`。

## 编码标准

* **主要语言:** TypeScript (`~5.x`，具体版本在 `package.json` 中定义)
* **主要运行时:** Node.js (`~22.x` LTS，具体版本在 `package.json` 中定义)
* **风格指南 & Linter:**
    * ESLint (具体配置在 `.eslintrc.js` 中定义)。推荐基于 `eslint:recommended` 和 `plugin:@typescript-eslint/recommended`，并可根据团队偏好调整。
    * Prettier (具体配置在 `.prettierrc.json` 中定义)。用于代码自动格式化，确保风格统一。
    * *配置:* 相关配置文件将位于项目根目录。
* **命名约定:**
    * 变量: `camelCase` (例如 `imagePath`, `metadataObject`)
    * 函数/方法: `camelCase` (例如 `writeMetadata`, `initializeServer`)
    * 类/类型/接口: `PascalCase` (例如 `MetadataWriter`, `ImageMetadata`, `MCPToolParams`)
    * 常量: `UPPER_SNAKE_CASE` (例如 `SUPPORTED_FORMATS`, `DEFAULT_TIMEOUT`)
    * 文件名: `kebab-case.ts` (例如 `metadata-writer.ts`, `mcp-server.ts`)
    * 目录名: `kebab-case` (例如 `src/core`, `src/mcp/tools`)
* **文件结构:** 遵循 `docs/project-structure.md` 中定义的布局。
* **异步操作:** 优先使用 `async/await` 处理异步逻辑。
    * 所有返回 Promise 的函数应明确标记其返回类型为 `Promise<T>`。
* **类型安全:**
    * 充分利用 TypeScript 的强类型特性，开启 `strict` 模式 (`tsconfig.json` 中设置)。
    * 避免使用 `any` 类型，除非在极少数无法避免或正在重构旧代码的过渡阶段。优先使用更具体的类型或 `unknown`。
    * 共享的类型和接口定义在 `src/common/types.ts` 或各模块内部的 `types.ts` 文件中。
* **注释 & 文档:**
    * 对公开的函数、类、方法和复杂逻辑块使用 TSDoc 风格的注释。
    * 注释应解释“为什么”这样做，而不仅仅是“做了什么”（代码本身应清晰说明后者）。
    * MCP Tool 的参数和返回值将在 `docs/mcp-tools-definition.md` 中使用 JSON Schema 详细定义。
* **依赖管理:**
    * 使用 `npm` (或 `yarn`，团队需统一) 管理项目依赖。
    * `package.json` 是唯一的依赖来源。
    * 添加新依赖前需进行评估，考虑其维护性、安全性、大小和许可证。
    * 定期审查和更新依赖，关注安全漏洞。
* **模块导入/导出:**
    * 使用 ES6 模块语法 (`import`/`export`)。
    * 避免使用默认导出 (`export default`) 以保持导入名称的一致性，推荐使用命名导出。
    * 模块内部的辅助函数或常量，如果不希望被外部访问，则不导出。

## 错误处理策略

* **通用方法:**
    * 在函数或方法内部，对于预期的、可恢复的错误，可以返回特定的错误对象或 `null`/`undefined` (需在 TSDoc 中明确)。
    * 对于意外的、不可恢复的或编程错误，应抛出自定义错误（继承自 `Error`）或标准 JavaScript 错误。
    * 自定义错误应定义在 `src/common/errors.ts` 中，并包含有意义的错误代码和消息。
* **MCP Tool 错误处理:**
    * 所有从 MCP Tool 返回给客户端的错误必须符合 JSON-RPC 2.0 错误对象规范。
    * 错误对象应包含 `code` (使用标准 JSON-RPC 错误代码或 PRD 中定义的自定义代码)、`message` (对用户友好的错误描述) 和可选的 `data` (包含额外调试信息)。
    * `@modelcontextprotocol/sdk` 可能提供了处理此问题的机制，需研究并遵循其最佳实践。
* **文件操作错误:**
    * 在使用 `exiftool-vendored` 或 `fs`模块进行文件操作时，必须妥善处理如文件未找到、权限不足、文件损坏等错误。
    * 在错误发生时，应确保不会损坏原始文件，或尽可能保持其原始状态。
    * 操作前进行必要的检查（如文件是否存在、可读/写）。
* **日志记录:**
    * **库/方法:** MVP 阶段可先使用 `console.log`, `console.warn`, `console.error`。未来可考虑集成更专业的日志库如 `pino` 或 `winston`。
    * **格式:** 纯文本或简单的 JSON 格式，包含时间戳、日志级别和消息。
    * **级别:**
        * `DEBUG`: 详细的诊断信息，仅在开发或调试时启用。
        * `INFO`: 常规操作信息，如服务启动、Tool 调用成功等。
        * `WARN`: 潜在问题或非严重错误。
        * `ERROR`: 严重错误，导致操作失败。
    * **上下文:** 日志应包含足够的上下文信息，如正在处理的文件路径、Tool 名称、相关参数（注意脱敏）。
    * **Stdio 服务注意事项:** 由于服务通过 Stdio 与客户端通信，日志输出需要小心管理，避免干扰 JSON-RPC 消息。错误日志应通过 `stderr` 输出，而 `stdout` 专用于 JSON-RPC 消息。

## 安全最佳实践

* **输入校验:**
    * MCP Tool 的输入参数（特别是文件路径和元数据内容）必须进行严格校验。
    * 文件路径应进行规范化处理，并警惕路径遍历攻击（尽管作为本地服务风险较低，但仍是好习惯）。
    * 元数据内容应检查长度、类型和潜在的恶意字符（如果适用，取决于 `exiftool-vendored` 如何处理输入）。
* **文件系统访问:**
    * 服务操作仅限于由客户端通过参数明确指定的本地文件路径。
    * 最小权限原则：确保服务运行用户对非目标文件没有不必要的访问权限（这更多是部署和运行时的考虑）。
* **依赖安全:**
    * 定期使用 `npm audit` (或 `yarn audit`) 检查已知漏洞。
    * 保持依赖更新到最新的安全版本。
* **错误信息披露:**
    * 返回给客户端的错误信息应足够明确以帮助诊断，但不应泄露过多内部实现细节或敏感路径。
* **资源消耗:**
    * 警惕处理超大文件或恶意构造的输入可能导致的资源耗尽问题（例如，`exiftool-vendored` 的超时设置）。`exiftool-vendored` 提供了 `taskTimeoutMillis` 选项。

## 变更日志

| 变更内容      | 日期       | 版本  | 描述                                       | 作者        |
| ------------- | ---------- | ----- | ------------------------------------------ | ----------- |
| 初稿          | 2025-05-07 | 0.1   | 基于模板和项目技术栈创建                    | 3-Architect |

---