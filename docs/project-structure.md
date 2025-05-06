# MetaTag Genie 项目结构

本项目采用 Node.js 和 TypeScript 构建，作为一个通过 Stdio 与客户端（如 AI 代理）通信的 MCP 服务。以下是推荐的项目目录结构：

```plaintext
metatag-genie/
├── .github/                  # CI/CD 工作流 (例如 GitHub Actions) (可选)
│   └── workflows/
│       └── main.yml
├── .vscode/                  # VSCode 编辑器特定配置 (可选)
│   └── settings.json
├── dist/                     # TypeScript 编译后的 JavaScript 输出目录 (通常在 .gitignore 中)
├── docs/                     # 项目所有文档
│   ├── architecture.md       # 主架构文档
│   ├── tech-stack.md         # 技术栈文档
│   ├── project-structure.md  # 本文档
│   ├── coding-standards.md   # 编码规范
│   ├── mcp-tools-definition.md # MCP Tool 定义
│   ├── testing-strategy.md   # 测试策略
│   ├── epic1.md              # (或其他 Epic/需求文档链接或副本)
│   └── ...                   # 其他相关文档
├── node_modules/             # 项目依赖 (通过 .gitignore 忽略)
├── scripts/                  # 辅助脚本 (例如构建、运行、测试、打包脚本)
│   ├── build.sh
│   ├── run.sh
│   └── test.sh
├── src/                      # 应用程序源代码
│   ├── common/               # 通用工具、类型定义、常量等
│   │   └── types.ts          # 全局或共享的 TypeScript 类型和接口
│   │   └── errors.ts         # 自定义错误类
│   │   └── constants.ts      # 项目常量
│   ├── core/                 # 核心业务逻辑和元数据处理
│   │   └── metadata-writer.ts # 封装 exiftool-vendored 的元数据写入/读取逻辑
│   │   └── file-utils.ts     # 文件操作相关的辅助函数
│   ├── mcp/                  # MCP 服务实现相关
│   │   ├── server.ts         # MCP 服务器的初始化和管理 (使用 @modelcontextprotocol/sdk)
│   │   ├── tools/            # MCP Tool 的定义和实现
│   │   │   └── writeImageMetadata.ts # 'writeImageMetadata' Tool 的具体实现
│   │   └── transport.ts      # Stdio 传输的具体设置 (如果 @modelcontextprotocol/sdk 未完全封装)
│   └── main.ts               # 应用程序主入口点，负责启动 MCP 服务
├── tests/                    # 自动化测试
│   ├── unit/                 # 单元测试 (镜像 src 目录结构)
│   │   ├── core/
│   │   │   └── metadata-writer.test.ts
│   │   └── mcp/
│   │       └── tools/
│   │           └── writeImageMetadata.test.ts
│   ├── integration/          # 集成测试
│   │   └── mcp-service.test.ts # 测试 MCP 服务与 Tool 的集成
│   └── e2e/                  # 端到端测试 (可选，模拟客户端通过 Stdio 交互并验证 Spotlight)
│       └── spotlight-search.test.ts
├── .env.example              # 环境变量示例文件 (如果需要)
├── .eslintignore             # ESLint 忽略配置
├── .eslintrc.js              # ESLint 配置文件
├── .gitignore                # Git 忽略规则
├── .prettierrc.json          # Prettier 配置文件
├── package.json              # Node.js 项目清单和依赖
├── tsconfig.json             # TypeScript 编译器配置文件
└── README.md                 # 项目概览、安装和使用说明