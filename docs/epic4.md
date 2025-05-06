# Epic 4: 文档和最终完善

**目标:** 完成所有必要的项目文档，包括用户指南 (README)、MCP 服务及其 Tools 的定义文档。对 MCP 服务接口进行健壮性打磨，执行全面的端到端测试，修复发现的缺陷，并为 MVP 版本进行最终的准备。

## Story 列表

### Story 4.1: 编写项目 README 和开发者文档
- **用户故事 / 目标:** 作为项目维护者，我需要创建一份全面的 README 文件，包含项目简介、功能、安装步骤、MCP 服务（Stdio模式）的启动方式、交互协议说明（JSON-RPC over Stdio）以及 Tool 调用示例，以及开发和贡献指南，以便新用户和开发者快速上手。
- **详细需求:**
    - README.md 应包含：
        - 项目名称和简介。
        - MVP 功能列表 (通过 MCP Tools 提供，核心是 `writeImageMetadata`)。
        - 系统要求 (macOS 版本，Node.js 版本 - 具体版本参考 `package.json`)。
        - **安装步骤:**
            - 克隆仓库。
            - `npm install` (或 `yarn install`) 安装依赖。
            - `npm run build` (或 `yarn build`) 编译 TypeScript。
        - **MCP 服务 (Stdio 模式) 的启动方式:**
            - 说明如何通过命令行直接运行编译后的服务 (例如 `node dist/main.js`) 以便测试。
            - 说明 AI 代理（如 Cursor）通常如何配置和调用此类 Stdio MCP 服务 (通常是直接执行该命令)。
        - **通过 Stdio 与 MCP 服务交互的协议说明:**
            - 简述基于 JSON-RPC 2.0。
            - 提及 MCP 初始化流程 (`initialize` 请求/响应, `initialized` 通知)。
            - 引用 `docs/mcp-tools-definition.md` 获取详细的 Tool 调用规范。
        - **如何调用已定义的 Tools (例如 `writeImageMetadata`) 的 JSON-RPC 请求/响应示例:**
            - 提供一个 `writeImageMetadata` 的简单请求和成功响应示例。
            - 链接到 `docs/mcp-tools-definition.md` 获取完整的参数和错误定义。
        - **如何运行测试:**
            - `npm test` (或 `yarn test`) 运行所有自动化测试。
            - 提及不同测试类型（单元、集成、E2E - 参考 `docs/testing-strategy.md`）。
        - **贡献指南:**
            - 代码风格 (参考 `docs/coding-standards.md`)。
            - 分支策略 (例如 Gitflow，或更简单的功能分支模型)。
            - Pull Request (PR) 流程和期望的审查标准。
            - 如何报告 Bug 和提交功能请求。
    - **其他开发者文档链接:**
        - 明确链接到 `docs/` 目录下的其他关键架构文档 (`architecture.md`, `tech-stack.md`, `project-structure.md`, `mcp-tools-definition.md`, `testing-strategy.md`, `coding-standards.md`)。
- **技术实现建议:**
    * **README 结构:** 使用清晰的 Markdown 标题和分点。
    * **示例:** 提供简洁明了的命令和代码示例。
    * **徽章 (Badges - 可选):** 可以考虑添加 CI/CD 状态、代码覆盖率、npm 版本等徽章。
- **验收标准 (ACs):**
    - AC1: README.md 文件已创建并包含所有要求的内容，信息准确且易于理解。
    - AC2: 安装和使用步骤清晰、可操作，一个新用户可以参照文档成功安装、构建、运行服务并进行基本的 Tool 调用测试（例如通过一个简单的 Node.js 客户端脚本）。
    - AC3: 开发和贡献指南为潜在贡献者提供了开始贡献所需的必要信息。
    - AC4: README.md 正确链接到 `docs/` 目录下的其他相关详细文档。

### Story 4.2: 创建 MCP 服务 Tools 定义文档
- **用户故事 / 目标:** 作为开发者，我需要为 MCP 服务暴露的每个 Tool 创建清晰、准确的定义文档，详细描述其功能、参数、返回值和可能的错误，以便 AI 代理或其他客户端正确调用。
- **详细需求:**
    - 为 MCP 服务暴露的每个 Tool (MVP 阶段主要是 `writeImageMetadata`) 详细记录：
        - Tool 名称 (用于 JSON-RPC 的 `method` 字段)。
        - Tool 的功能描述。
        - Tool 的参数定义 (使用 JSON Schema 描述每个参数的名称、JSON 类型、是否必需、描述，以及整体的参数对象结构)。
        - Tool 成功执行时的返回值定义 (使用 JSON Schema 描述结构和类型)。
        - Tool 可能返回的特定业务错误条件 (对应 JSON-RPC `error.data` 的内容，如果适用，以及建议的 `error.code` 和 `error.message`)。
    - 此文档应作为 `docs/mcp-tools-definition.md` 或类似文件存在，并且易于 AI 代理开发者理解和集成。
- **验收标准 (ACs):**
    - AC1: MCP 服务暴露的所有 Tools 都有清晰的定义文档 (`docs/mcp-tools-definition.md`)。 **(此 Story 已由架构师在架构设计阶段完成)**
    - AC2: 文档准确描述了每个 Tool 的功能、参数 (JSON Schema)、返回值 (JSON Schema) 和特定错误。 **(此 Story 已由架构师在架构设计阶段完成)**
    - AC3: 文档易于理解，客户端开发者可以根据文档与服务 Tools 进行交互。 **(此 Story 已由架构师在架构设计阶段完成)**

### Story 4.3: MCP 服务接口健壮性与最终测试
- **用户故事 / 目标:** 作为开发者，我需要对 MCP 服务通过 Stdio 提供的接口（包括初始化流程和 Tool 调用） 进行最终审查和打磨，确保其对调用者健壮、可靠且符合 MCP 规范。同时执行一轮完整的端到端测试。
- **详细需求:**
    - 审查 MCP 初始化流程的实现是否完全符合规范，并能处理各种客户端行为（例如，客户端未发送 `initialized` 通知，或发送了无效的 `InitializeParams`）。
    - 审查每个 Tool 的参数校验是否完备 (基于 `zod` schema 的校验，以及 Story 3.5 中定义的自定义业务校验)，错误处理是否符合 JSON-RPC 规范和 `docs/mcp-tools-definition.md`。
    - 确保 Stdio 的输入输出处理没有阻塞、数据损坏或不完整消息的问题，特别是在大数据量或高频率调用（如果适用）的场景下 (参考 Story 1.5 的测试)。
    - 进行探索性测试，模拟各种有效和无效的 JSON-RPC 请求，包括格式错误、参数类型错误、缺少参数等，以及并发调用（如果服务设计为支持）。
    - 验证所有功能需求和非功能性需求是否已满足 PRD 定义。
    - 针对 PRD 中定义的成功指标进行最终验证 (例如，元数据写入成功率，通过 `docs/testing-strategy.md` 中定义的 Spotlight 验证方法进行 Spotlight 检索有效性验证)。
- **技术实现建议:**
    * **探索性测试:** 可以编写一个或多个临时的客户端脚本，发送各种边界条件和错误情况的请求。
    * **压力测试 (可选 MVP 后):** 考虑在 MVP 后对服务进行简单的压力测试，以了解其在高负载下的表现。
    * **代码审查:** 对 MCP 交互、参数校验、错误处理部分的代码进行重点审查。
- **验收标准 (ACs):**
    - AC1: MCP 服务的 Stdio 接口、初始化流程、Tool 定义和 JSON-RPC 消息格式已经过审查和改进，确保了健壮性。
    - AC2: 完成了一轮全面的端到端测试（如 `docs/testing-strategy.md` 中所定义，重点验证元数据写入的正确性），覆盖主要 MCP 交互场景（包括成功和错误路径）和边缘情况。
    - AC3: 所有在 PRD 中定义的 MVP 功能和成功标准均已得到验证，并达到目标。
    - AC4: 所有已知的高优先级缺陷已修复并经验证。
    - AC5: 服务在处理无效或意外的客户端行为时（例如，格式错误的 JSON，不符合 MCP 流程的调用），能保持稳定并返回适当的错误，而不是崩溃。

### Story 4.4: (延伸验证) iPhone 照片应用“描述”可读性测试
- **用户故事 / 目标:** 作为测试者，我需要验证通过本工具写入“描述 (Description)”元数据的图片，在导入到 iPhone 照片应用后，其“说明”字段是否能够被正确显示，并初步验证其可搜索性。
- **详细需求:**
    - 准备几张测试图片 (JPG, HEIC)。
    - 通过 MCP 服务调用 `writeImageMetadata` Tool 为这些图片添加清晰的“描述”元数据 (确保写入到 `EXIF:ImageDescription`, `IPTC:Caption-Abstract`, `XMP:dc:description` 等标准字段)。
    - 将这些图片导入到一台测试 iPhone 的照片应用中（例如通过 AirDrop 或访达同步）。
    - 在 iPhone 照片应用中查看图片的详细信息，确认“说明”字段是否显示了写入的描述。
    - 尝试在 iPhone 照片应用的搜索框中搜索描述中的关键词。
- **技术实现建议:**
    * **元数据字段确认:** 确保 Story 2.5 中确定的描述字段映射包含了 iPhone 照片应用通常读取的字段。`EXIF:ImageDescription` 和 XMP 描述字段通常是关键。
    * **测试设备:** 使用运行较新 iOS 版本的 iPhone 进行测试。
    * **记录:** 对测试结果进行截图并记录。
- **验收标准 (ACs):**
    - AC1: 工具写入的“描述”元数据在 iPhone 照片应用的图片详情中作为“说明”正确显示。
    - AC2: (加分项) 在 iPhone 照片应用中搜索描述中的独特关键词，能够找到对应的图片。
    - AC3: 测试结果（包括截图）已记录，并确认了写入的哪些元数据字段对 iPhone 照片应用可见。

## 新增技术 Stories/Tasks (由架构师识别)

### Story 4.5: 构建与打包策略定义和实现
- **用户故事 / 目标:** 作为开发者，我需要为 MetaTag Genie 服务定义并实现一个清晰的构建和（可选的）打包策略，使其易于被 AI 代理或其他客户端在 macOS 上调用。
- **详细需求:**
    - **构建:**
        - 使用 `tsc` 将 TypeScript 编译到 `dist` 目录 (已在 Story 1.1 中定义)。
        - 确保 `tsconfig.json` 的 `outDir` 设置正确。
    - **运行方式:**
        - 主要运行方式是通过 `node dist/main.js`。客户端将需要知道 Node.js 的安装路径和这个脚本的路径。
    - **打包 (可选，作为增强):**
        - 研究使用 `pkg` (或其他类似工具如 `nexe`) 将 Node.js 应用（包括 Node.js 运行时本身）打包成单个可执行文件。
        - 优点：简化分发，用户无需预装 Node.js。
        - 缺点：包体积较大，某些原生依赖可能存在兼容性问题。
        - **MVP 阶段决策：** 优先确保通过 `node dist/main.js` 方式的可靠运行和清晰文档。打包作为可选的后续优化。
    - 在 `package.json` 中提供相应的 `build` 脚本。如果实现打包，添加 `package` 脚本。
    - 在 README 中记录如何构建和运行/部署该服务。
- **技术实现建议:**
    * **`package.json` scripts:**
        * `build`: `"tsc"`
        * `start:dev`: `"ts-node src/main.ts"` (用于开发时快速启动)
        * `start:prod`: `"node dist/main.js"` (用于运行编译后的版本)
        * (如果打包) `package`: `"pkg . --targets node18-macos-x64 --output metatag-genie"` (示例 `pkg` 命令)
    * **README:** 清晰说明需要 Node.js 环境，以及如何通过 `npm run start:prod` 或直接 `node dist/main.js` 运行。如果提供打包版本，说明如何获取和运行。
- **验收标准 (ACs):**
    - AC1: 项目有一个明确的构建过程 (`npm run build`)，可以将 TypeScript 编译成 JavaScript 到 `dist/` 目录。
    - AC2: README 中包含清晰的构建和运行说明，包括对 Node.js 环境的依赖。
    - AC3: (如果实施打包) 项目有一个脚本可以将应用打包成 macOS 兼容的单个可执行文件，并且该可执行文件可以成功运行并提供服务。
    - AC4: (如果实施打包) 打包后的可执行文件包含了所有必要的依赖，包括 `exiftool-vendored` 的二进制文件。

## 变更日志

| 变更内容      | 日期       | 版本  | 描述                                       | 作者        |
| ------------- | ---------- | ----- | ------------------------------------------ | ----------- |
| 初稿          | 2025-05-06 | 0.1   | 初始 Epic 定义                             | 2-PM (产品经理) |
| 修订          | 2025-05-06 | 0.2   | 调整以适应 MCP 服务 (Stdio) 和相关文档要求     | 2-PM (产品经理) |
| 架构补充      | 2025-05-07 | 0.3   | 添加架构师识别的技术 Story 4.5；标记 Story 4.2 已完成；细化技术实现建议和 ACs | 3-Architect |