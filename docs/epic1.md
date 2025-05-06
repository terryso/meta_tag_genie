# Epic 1: 核心元数据引擎和符合 MCP 规范的基础服务外壳 (Stdio 传输)

**目标:** 建立项目的基础结构，包括 TypeScript 项目设置、TDD 环境配置、核心元数据处理库的选型与集成。实现一个基础的、符合 MCP 规范的服务器外壳（使用 Stdio 传输），并完成针对**单一图片格式（例如 JPG）**的**所有 MVP 元数据类型（标签、描述、人物、地点）**的写入与读取功能，通过一个名为 `writeImageMetadata` 的 MCP Tool 来实现。

## Story 列表

### Story 1.1: 项目初始化与TDD环境搭建
- **用户故事 / 目标:** 作为开发者，我需要一个标准化的 TypeScript 项目结构，并配置好测试驱动开发 (TDD) 环境（包括测试框架、断言库、以及运行测试的脚本），以便能够高效地开始编码和测试。
- **详细需求:**
    - 初始化 Node.js 项目 (`package.json`)。
    - 配置 TypeScript (`tsconfig.json`)。
    - 选择并集成一个测试框架 (Jest)。
    - 设置 linting 工具 (ESLint) 和代码格式化工具 (Prettier)。
    - 创建 `src` 和 `tests` 目录结构。
    - 编写一个简单的示例测试并通过。
- **技术实现建议:**
    * **`package.json`:**
        * `scripts`: 确保包含 `build` (e.g., `tsc`), `test` (e.g., `jest`), `lint` (e.g., `eslint . --ext .ts`), `format` (e.g., `prettier --write .`).
        * `devDependencies`: `typescript`, `ts-node` (for running TS files directly during dev), `jest`, `@types/jest`, `ts-jest`, `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `prettier`.
    * **`tsconfig.json`:**
        * `target`: `ES2022` (或与 Node.js LTS 版本兼容的更高版本).
        * `module`: `NodeNext`.
        * `moduleResolution`: `NodeNext`.
        * `outDir`: `"./dist"`.
        * `rootDir`: `"./src"`.
        * `strict`: `true`.
        * `esModuleInterop`: `true`.
        * `skipLibCheck`: `true`.
        * `resolveJsonModule`: `true`.
    * **Jest 配置 (`jest.config.js` 或 `package.json`):**
        * `preset`: `ts-jest`.
        * `testEnvironment`: `node`.
        * `collectCoverage`: `true`.
        * `coverageDirectory`: `"coverage"`.
        * `testMatch`: `["**/tests/unit/**/*.test.ts", "**/tests/integration/**/*.test.ts"]`.
    * **ESLint 配置 (`.eslintrc.js`):**
        * `parser`: `@typescript-eslint/parser`.
        * `plugins`: `["@typescript-eslint"]`.
        * `extends`: `["eslint:recommended", "plugin:@typescript-eslint/recommended", "eslint-config-prettier"]`.
    * **Prettier 配置 (`.prettierrc.json`):**
        * 定义如 `tabWidth`, `semi`, `singleQuote`, `trailingComma` 等规则。
- **验收标准 (ACs):**
    - AC1: 项目可以通过 `npm install` (或 `yarn`) 成功安装依赖。
    - AC2: 可以通过 `npm run test` (或 `yarn test`) 成功运行所有测试，并且初始的示例测试通过。
    - AC3: TypeScript 代码可以成功编译成 JavaScript。
    - AC4: ESLint 和 Prettier 配置完成，并可以对代码进行检查和格式化。
    - AC5: 开发者可以在本地修改代码后，通过 `npm run test` 快速运行单元测试并看到反馈。
    - AC6: `npm run build` 可以成功将 `src` 目录下的 TypeScript 代码编译到 `dist` 目录。

### Story 1.2: 核心元数据处理库选型与集成 (`exiftool-vendored`)
- **用户故事 / 目标:** 作为开发者，我需要研究、选择并集成一个合适的第三方 TypeScript 库 (`exiftool-vendored`) 来读取和写入图片元数据 (EXIF, IPTC, XMP)，确保该库能满足项目对 JPG 格式的基本操作需求。
- **详细需求:**
    - 将 `exiftool-vendored` 集成到项目中。
    - 编写一个简单的封装层或服务 (`src/core/metadata-writer.ts` 中的 `MetadataWriterService`) 来调用该库的基本功能。
- **技术实现建议:**
    * **封装层 (`src/core/metadata-writer.ts`):**
        * 创建一个 `MetadataWriterService` (或类似名称的类)。
        * 在构造函数中可以初始化 `exiftool` 实例 (从 `exiftool-vendored`导入)。
        * 提供如 `async readRawMetadata(filePath: string): Promise<Tags>` 和 `async end(): Promise<void>` 这样的方法作为初步实现。
        * 内部处理 `exiftool.read()` 和 `exiftool.end()` 的调用。
        * 封装错误处理，将 `exiftool-vendored` 可能抛出的错误转换为自定义的应用程序错误或标准错误。
    * **依赖安装:** `npm install exiftool-vendored`
- **验收标准 (ACs):**
    - AC1: `exiftool-vendored` 已作为项目依赖成功安装。
    - AC2: 可以通过代码 (例如 `MetadataWriterService.readRawMetadata`) 成功调用库的基础功能来读取一张测试 JPG 图片的现有元数据（若有）。(单元测试阶段验证对 mock 的调用，集成测试验证实际文件读取)
    - AC3: 选型决策及其理由已在项目文档中记录 (已在 `docs/tech-stack.md` 和 `docs/architecture.md` 中完成)。
    - AC4: 存在一个初步的 `MetadataWriterService` 类，其中包含调用 `exiftool-vendored` 的 `read()` 和 `end()` 方法的逻辑，并能处理其 Promise 结果。
    - AC5: (单元测试) 为 `MetadataWriterService` 的 `readRawMetadata` 和 `end` 方法编写了单元测试，正确 mock 了 `exiftool-vendored` 的行为。

### Story 1.3: 搭建符合 MCP 规范的基础服务外壳 (Stdio 传输) (使用 `@modelcontextprotocol/sdk`)
- **用户故事 / 目标:** 作为开发者，我需要使用 `@modelcontextprotocol/sdk` 搭建一个符合 Model Context Protocol (MCP) 规范的基础服务器外壳。该服务器将使用 Stdio (标准输入/输出)作为传输机制，能够响应 MCP 初始化请求，并为后续暴露元数据操作的 "Tool" 定义好框架。
- **详细需求:**
    - 使用 `@modelcontextprotocol/sdk` (特别是 `McpServer` 和 `StdioServerTransport`) 来处理 Stdio 上的 MCP 消息。
    - 实现 MCP 服务器的初始化握手逻辑：
        - 能够接收来自客户端（例如 AI 代理）的 `initialize` 请求。
        - 能够发送包含服务器能力（初期应包含 `writeImageMetadata` Tool 的基本定义）的 `initialize` 响应。
        - 能够处理客户端的 `initialized` 通知。
    - 初步注册 `writeImageMetadata` Tool，其 handler 在此阶段可以是模拟的。
    - 确保该服务可以通过 Stdio 被一个模拟的 MCP 客户端或测试脚本调用和交互。
- **技术实现建议:**
    * **`src/main.ts` (入口点):**
        * 导入并实例化 `McpServer` 和 `StdioServerTransport`。
        * 实例化 `MetadataWriterService`。
        * 创建和配置 `McpServer` 实例 (name, version, logger, app context 注入 `metadataWriter`)。
        * 定义 `writeImageMetadata` Tool 的输入输出 schema (使用 `zod`，参照 `docs/mcp-tools-definition.md`) 并注册 Tool，handler 暂时为模拟实现。
        * 调用 `initializeGracefulShutdown`。
        * 调用 `server.connect(transport)`。
    * **`src/common/graceful-shutdown.ts`:** (已在 Story 1.5 提示中详细说明，确保此处创建和使用)
    * **依赖安装:** `npm install @modelcontextprotocol/sdk zod`
- **验收标准 (ACs):**
    - AC1: MCP 服务器可以通过 Stdio 启动和通信，没有端口监听。
    - AC2: 服务器能正确处理 MCP `initialize` 请求，并根据协议规范返回包含服务器能力的响应 (包含 `serverInfo`，`capabilities` 应包含 `writeImageMetadata` Tool 的基本定义)。
    - AC3: 服务器能正确接收 `initialized` 通知 (在集成测试中模拟发送)。
    - AC4: `writeImageMetadata` Tool 已初步注册，其 schema 和描述已在服务器能力中体现，即使其功能在此阶段是模拟的。
    - AC5: (集成测试) 通过一个测试脚本（模拟 MCP 客户端通过 Stdio 发送 JSON-RPC 消息）与服务器成功完成初始化握手，并能验证服务器返回的能力信息。
    - AC6: 关于 `@modelcontextprotocol/sdk` 的使用及其基本用法已在 `src/main.ts` 或代码注释中体现。

### Story 1.4 (REVISED): 实现 `writeImageMetadata` Tool 对 JPG 图片的完整元数据写入与读取
- **用户故事 / 目标:** 作为开发者，我需要在已搭建的 MCP 服务框架内，充实 `writeImageMetadata` Tool 的核心逻辑，使其能够将用户提供的结构化元数据（标签、描述、人物名称、地点文本）成功写入到指定 JPG 图片的元数据中，并能通过代码读取验证。
- **详细需求:**
    - 在 Story 1.3 搭建的 MCP 服务中，为 `writeImageMetadata` Tool 编写实际的 handler 实现。
    - Tool handler 接收图片路径和包含所有可选元数据字段（tags, description, people, location）的 `metadata` 对象以及 `overwrite` 标志。
    - Tool handler 调用 `MetadataWriterService` 中的方法来执行实际的元数据写入和读取。
    - `MetadataWriterService` 需要为 JPG 格式实现所有 MVP 元数据类型的写入和读取逻辑。
    - 确保写入操作不会损坏图片文件或清除其他已有元数据（除非 `overwrite` 为 true 且字段被更新）。
    - 编写单元测试和集成测试覆盖所有元数据类型对 JPG 的操作。
- **技术实现建议:**
    * **`MetadataWriterService` (`src/core/metadata-writer.ts`):**
        * 实现 `async writeMetadataForImage(filePath: string, metadata: ImageMetadataArgs, overwrite: boolean): Promise<void>`，其中 `ImageMetadataArgs` 包含所有可选元数据字段。
        * 根据 `metadata` 中的字段和初步的字段映射策略（参考 Story 2.5 的建议，为 JPG 选择合适的 EXIF/IPTC/XMP 字段），构建 `exiftoolArgs`。
        * 调用 `this.exiftool.write(filePath, exiftoolArgs, ['-overwrite_original'])`。
        * 实现 `async readMetadataForImage(filePath: string): Promise<Partial<ImageMetadataArgs>>` 以读取所有 MVP 元数据类型。
    * **Tool Handler (`src/mcp/tools/writeImageMetadata.ts`):**
        * 从 `context.app` 获取 `MetadataWriterService` 实例。
        * 调用 `metadataWriterInstance.writeMetadataForImage()`。
        * 处理成功和错误情况，返回符合规范的 JSON-RPC 响应。
- **验收标准 (ACs):**
    - AC1: 通过 MCP 客户端调用 `writeImageMetadata` Tool，传入 JPG 图片路径和包含所有 MVP 元数据类型（标签、描述、人物、地点）的对象，Tool 能成功将所有这些元数据写入图片的相应字段，并返回成功的 JSON-RPC 响应。 (通过集成测试验证)
    - AC2: 使用标准元数据查看工具 (如 ExifTool) 或代码读取，可以查看到新写入的所有类型的元数据。 (集成测试中通过代码调用 ExifTool/`readMetadataForImage` 读取验证)
    - AC3: Tool 的执行结果（成功/失败）能通过 JSON-RPC 响应正确返回给 MCP 客户端。 (通过集成测试验证)
    - AC4: 写入操作后，图片文件本身保持完好，且其他无关的已有元数据（若存在）未被破坏（除非 `overwrite` 为 true 且字段被更新）。
    - AC5: 相关的单元测试和集成测试通过，覆盖所有 MVP 元数据类型针对 JPG 格式的写入和读取。
    - AC6: `MetadataWriterService` 中的写入逻辑针对 JPG 的所有元数据类型，使用了 `exiftool-vendored` 的 `write` 方法，并遵循了初步的字段映射策略。

## 新增技术 Stories/Tasks (由架构师识别)

### Story 1.5: `@modelcontextprotocol/sdk` 与 Stdio 传输的详细集成与错误处理
- **用户故事 / 目标:** 作为开发者，我需要确保 `@modelcontextprotocol/sdk` 能够稳定地通过 Stdio 接收和发送 JSON-RPC 消息，并能正确处理 Stdio 传输层面的各种边缘情况和错误（例如，输入流意外关闭、输出流阻塞、无效的 JSON-RPC 消息格式在 SDK 处理之前出现等）。
- **详细需求:**
    - 在 `src/main.ts` 中，实现使用 `@modelcontextprotocol/sdk` 的 `StdioServerTransport`。
    - 研究并实现 SDK 提供的关于 Stdio 传输的生命周期管理（启动、正常关闭、异常终止）。
    - 测试当客户端发送格式错误的 JSON-RPC 消息（例如，非 UTF-8 编码、不完整的 JSON）时，服务进程的行为（理想情况下应能捕获并记录错误，而不是崩溃）。
    - 测试当 `stdout` 被阻塞或写入非常大的响应时的情况。
    - 确保服务在接收到终止信号 (SIGINT, SIGTERM) 时能够优雅关闭（例如，`exiftool-vendored` 可能需要调用 `end()` 方法）。
- **技术实现建议:**
    * **Stdio 流错误处理:**
        * 在 `main.ts` 中，监听 `process.stdin`, `process.stdout`, `process.stderr` 的 `error` 事件，并进行日志记录。
        * SDK 的 `StdioServerTransport` 应处理大部分 Stdio 交互。
    * **优雅关闭 (`src/common/graceful-shutdown.ts`):**
        * 为 `SIGINT` 和 `SIGTERM` 注册处理器。
        * 调用 `server.disconnect()` 和 `metadataWriter.end()`。
        * 处理 `uncaughtException` 和 `unhandledRejection`。
- **验收标准 (ACs):**
    - AC1: MCP 服务能通过 StdioServerTransport 成功初始化并与模拟客户端进行基本通信。 (已由 Story 1.3 覆盖部分)
    - AC2: 服务能捕获并记录 Stdio 传输层面的常见错误（如无效 JSON），并保持稳定。 (通过集成测试验证)
    - AC3: 服务在接收到终止信号 (SIGINT/SIGTERM) 时能执行清理操作（调用 `server.disconnect()`, `metadataWriter.end()`）并正常退出。 (通过集成测试验证)
    - AC4: （集成测试）覆盖上述 Stdio 错误和生命周期场景。

### Story 1.6: `exiftool-vendored` 的初始化、管理与健康检查
- **用户故事 / 目标:** 作为开发者，我需要在 `core/metadata-writer.ts` 中有效地管理 `exiftool-vendored` 的实例，包括其启动、关闭（使用 `exiftool.end()` 来释放子进程），以及潜在的健康检查或错误恢复机制。
- **详细需求:**
    - 确定 `exiftool-vendored` 实例的生命周期管理策略（应用启动时初始化，应用关闭时销毁）。
    - 研究 `exiftool-vendored` 的配置选项，例如 `taskTimeoutMillis`，并设置合理的默认值。
    - 考虑如果 `exiftool-vendored` 的子进程意外崩溃或无响应，应如何处理（例如，重试机制，向客户端返回特定错误）。
    - 实现一个机制来确保 ExifTool 进程在服务关闭时被正确终止，避免僵尸进程。
- **技术实现建议:**
    * **`MetadataWriterService` (`src/core/metadata-writer.ts`):**
        * 构造函数中创建 `ExifTool` 实例并配置 `taskTimeoutMillis`。
        * 提供 `async end()` 方法调用 `this.exiftool.end()`。
        * 在 `write/read` 方法中捕获 `exiftool-vendored` 的特定错误 (超时、进程错误) 并映射。
    * **优雅关闭 (`src/common/graceful-shutdown.ts`):**
        * 确保调用 `metadataWriter.end()`。
- **验收标准 (ACs):**
    - AC1: `exiftool-vendored` 实例在应用启动时被正确初始化，并配置了合理的超时时间。 (通过代码审查和构造函数测试验证)
    - AC2: 应用正常退出时 (`SIGINT`/`SIGTERM`)，`metadataWriter.end()` 被调用，从而调用 `exiftool.end()`，ExifTool 子进程被清理。 (通过集成测试验证)
    - AC3: （单元测试）验证 ExifTool 进程的生命周期管理 (`end` 方法的调用)。
    - AC4: 定义了处理 ExifTool 进程故障的基本策略（至少包括捕获特定错误、记录日志并向上层报告错误）。 (通过代码审查和单元测试验证错误处理逻辑)
    - AC5: （单元测试）`MetadataWriterService` 的 `end` 方法被调用时，其内部的 `exiftool.end()` 被调用。
    - AC6: （单元/集成测试）当 `exiftool.write()` 或 `exiftool.read()` 因特定原因（如超时、模拟的进程错误）失败时，`MetadataWriterService` 能捕获错误并向上层传递一个可识别的错误（或将其包装）。

## 变更日志

| 变更内容      | 日期       | 版本  | 描述                                       | 作者        |
| ------------- | ---------- | ----- | ------------------------------------------ | ----------- |
| 初稿          | 2025-05-06 | 0.1   | 初始 Epic 定义，包含 CLI 或 MCP HTTP 选项    | 2-PM (产品经理) |
| 重大修订      | 2025-05-06 | 0.2   | 明确为 MCP 服务，指定 Stdio 传输，重写 Story 1.3 | 2-PM (产品经理) |
| 架构补充      | 2025-05-07 | 0.3   | 添加架构师识别的技术 Stories 1.5, 1.6；细化技术实现建议和 ACs | 3-Architect |
| 目标调整      | 2025-05-07 | 0.4   | 调整 Epic 1 总体目标和 Story 1.4 范围，使其覆盖 JPG 的所有 MVP 元数据类型 | 3-Architect |