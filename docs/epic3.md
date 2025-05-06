# Epic 3: Spotlight 集成、错误处理和 MCP 服务反馈

**目标:** 确保通过 MCP Tool 写入的元数据能够被 macOS Spotlight 有效索引和搜索。同时，实现全面的错误处理机制和清晰的 MCP 服务反馈机制（通过 Stdio 上的 JSON-RPC），以提升工具的健壮性和易用性。

## Story 列表

### Story 3.1: Spotlight 索引和搜索验证 (标签、描述)
- **用户故事 / 目标:** 作为测试者/用户，我需要在图片被 MCP Tool (`writeImageMetadata`) 处理后，能够通过 Spotlight 使用新添加的标签和描述中的关键词成功搜索到这些图片。
- **详细需求:**
    - 准备一组测试图片 (JPG, PNG, HEIC)。
    - 通过 MCP 服务调用 `writeImageMetadata` Tool 为这些图片添加不同的标签和描述。
    - 根据 `docs/testing-strategy.md` 中定义的 "Spotlight 验证方法"，通过手动测试和/或辅助脚本验证 Spotlight 的可搜索性。自动化 E2E 测试将主要验证元数据是否正确写入文件。
    - 记录手动测试的搜索结果的准确性和及时性。
- **技术实现建议 (针对辅助验证):**
    * **手动测试步骤:**
        1. 使用工具写入元数据到一组测试图片。
        2. 等待一段合理时间（例如1-5分钟）。
        3. 打开 Spotlight 搜索 (Cmd+Space)。
        4. 输入写入的标签、描述中的关键词进行搜索。
        5. 验证目标图片是否出现在搜索结果中。
    * **辅助脚本 (可选):**
        * 可以编写一个简单的 Node.js 脚本，该脚本：
            1. 调用 `writeImageMetadata` Tool。
            2. 等待固定时间或轮询检查 `mdfind -onlyin /path/to/test/image/folder "kMDItemKeywords == 'test-tag'"` (或其他相关 Spotlight 查询) 是否返回结果。
            3. 脚本的输出主要用于观察，不作为 CI 的阻塞性检查。
- **验收标准 (ACs):**
    - AC1: 对于已添加标签的图片，通过手动 Spotlight 搜索或辅助脚本观察，这些标签（或其中之一）能在合理时间内找到至少 90% 的目标图片。
    - AC2: 对于已添加描述的图片，通过手动 Spotlight 搜索或辅助脚本观察，描述中的独特关键词能在合理时间内找到至少 90% 的目标图片。
    - AC3: 手动测试过程和结果被记录下来。
    - AC4: (自动化 E2E 测试) 验证元数据（标签、描述）已正确写入图片文件，通过回读元数据进行断言。

### Story 3.2: Spotlight 索引和搜索验证 (人物、地点)
- **用户故事 / 目标:** 作为测试者/用户，我需要在图片被 MCP Tool (`writeImageMetadata`) 处理后，能够通过 Spotlight 使用作为关键词写入的人物名称和写入的地点文本成功搜索到这些图片。
- **详细需求:**
    - 沿用 Story 3.1 的测试图片和流程。
    - 通过 MCP 服务调用 `writeImageMetadata` Tool 为图片添加人物名称（作为关键词）和地点文本。
    - 根据 `docs/testing-strategy.md`，此处的 Spotlight 搜索验证主要通过手动测试或辅助脚本进行。
    - 记录搜索结果。
- **技术实现建议 (针对辅助验证):**
    * 与 Story 3.1 类似，采用手动测试或辅助脚本验证。
    * Spotlight 查询示例：
        * 人物 (作为关键词): `mdfind -onlyin /path/to/folder "kMDItemKeywords == '人物名称'"`
        * 地点 (假设写入 `XMP:photoshop:Location`, Spotlight 可能通过 `kMDItemUserTags` 或其他通用文本字段索引): `mdfind -onlyin /path/to/folder "地点文本中的关键词"` (具体查询可能需要实验确定 Spotlight 如何索引所选字段)。
- **验收标准 (ACs):**
    - AC1: 对于已添加人物名称（作为关键词）的图片，通过手动 Spotlight 搜索或辅助脚本观察，这些人物名称能在合理时间内找到至少 90% 的目标图片。
    - AC2: 对于已添加地点文本的图片，通过手动 Spotlight 搜索或辅助脚本观察，地点文本中的独特关键词能在合理时间内找到至少 90% 的目标图片。
    - AC3: 测试过程和结果被记录下来。
    - AC4: (自动化 E2E 测试) 验证元数据（人物作为关键词、地点文本）已正确写入图片文件到预期的字段，通过回读元数据进行断言。

### Story 3.3: 实现健壮的文件操作和元数据写入错误处理 (MCP Tool Context)
- **用户故事 / 目标:** 作为开发者，我需要确保 MCP Tool 在执行文件操作和元数据写入时能妥善处理各种潜在错误，并通过 Stdio 以符合 JSON-RPC 规范的方式向调用者提供明确的错误信息。
- **详细需求:**
    - 覆盖的错误情况包括：
        - 文件未找到或无读取/写入权限。
        - 不支持的图片文件格式。
        - 元数据写入冲突或特定字段写入失败。
        - 元数据处理库 (`exiftool-vendored`) 抛出的内部错误。
        - Tool 参数无效 (例如，图片路径格式不正确，或必需的元数据结构缺失)。
    - 错误信息应包含在 JSON-RPC 2.0 的 `error` 对象中，包含 `code` (符合 JSON-RPC 标准或自定义扩展), `message`, 和可选的 `data` (用于携带额外错误详情)。这些错误码应与 `docs/mcp-tools-definition.md` 中定义的一致。
    - 确保在发生错误时，尽可能不损坏原始文件或保持其原始状态。
- **技术实现建议:**
    * **`src/mcp/tools/writeImageMetadata.ts` (Handler):**
        * 在调用 `MetadataWriterService` 之前和之后，使用 `try...catch` 块。
        * 捕获 `MetadataWriterService` 抛出的自定义错误或 `exiftool-vendored` 的错误。
        * 根据错误类型，映射到 `docs/mcp-tools-definition.md` 中定义的 JSON-RPC 错误对象。
        * 例如:
          ```typescript
          // import { JsonRpcError } from '@modelcontextprotocol/sdk'; // or a custom error utility
          // import { ERROR_CODES } from '../../common/errors'; // custom error codes
          try {
            // ...
            await metadataWriterService.writeMetadataForImage(...);
            return { success: true, filePath: params.filePath, message: "Metadata written successfully." };
          } catch (error) {
            if (error instanceof FileNotFoundError) { // Custom error type
              throw new JsonRpcError(ERROR_CODES.FILE_NOT_FOUND, `File not found: ${params.filePath}`, { filePath: params.filePath });
            } else if (error.message.includes("Unsupported file type")) { // Example check for exiftool error
               throw new JsonRpcError(ERROR_CODES.UNSUPPORTED_FILE_FORMAT, `Unsupported file format: ${params.filePath}. Only JPG, PNG, HEIC.`, { filePath: params.filePath });
            }
            // ... other error mappings
            logger.error("Internal error during writeImageMetadata", error);
            throw new JsonRpcError(JsonRpcError.INTERNAL_ERROR, "Internal server error while writing metadata.");
          }
          ```
    * **`src/core/metadata-writer.ts` (`MetadataWriterService`):**
        * 在与 `exiftool-vendored` 交互时，仔细检查其返回的 Promise 是否被 reject，以及 reject 的错误对象内容。
        * 在进行文件操作前，可以使用 `fs.promises.access` 检查文件是否存在和权限（尽管并发条件下仍有竞争风险，但可作为初步检查）。
        * 抛出具有明确类型和信息的自定义错误 (例如 `FileNotFoundError`, `FileAccessError`, `MetadataWriteError`)，以便上层 Tool Handler 可以更容易地映射到 JSON-RPC 错误。
- **验收标准 (ACs):**
    - AC1: 当 Tool 参数无效（如指定文件不存在或无权限）时，Tool 返回符合 JSON-RPC 规范的错误响应（包含正确的错误码和消息）。
    - AC2: 当尝试处理不受支持的图片格式时，Tool 返回特定的 JSON-RPC 错误。
    - AC3: 当元数据写入失败时（例如，`exiftool-vendored` 返回错误），Tool 能捕获并返回相应的 JSON-RPC 错误。
    - AC4: (MCP/Stdio) 错误会以符合 JSON-RPC 2.0 错误对象规范的格式通过 `stdout` 返回给调用者。
    - AC5: 相关的单元测试/集成测试覆盖这些错误场景，验证返回的 JSON-RPC 错误对象结构和内容是否正确。
    - AC6: 发生文件操作错误时，原始图片文件未被损坏。

### Story 3.4: 完善 MCP 服务 (Stdio) 的反馈机制与 Tool 定义文档
- **用户故事 / 目标:** 作为开发者，我需要完善 MCP 服务通过 Stdio 的反馈机制，确保其在操作成功时也能提供清晰的、符合 JSON-RPC 规范的确认信息。 (Tool 定义文档已完成)
- **详细需求:**
    - **MCP 服务 (Stdio):**
        - Tool 执行成功后，通过 `stdout` 返回符合 JSON-RPC 2.0 `result` 对象规范的响应。响应内容应清晰表明操作结果，并与 `docs/mcp-tools-definition.md` 中定义的返回值一致。
        - 确保服务在 Stdio 上的交互（如初始化、Tool 调用）稳定可靠。
- **技术实现建议:**
    * **`src/mcp/tools/writeImageMetadata.ts` (Handler):**
        * 成功执行后，返回的 `result` 对象应严格匹配 `docs/mcp-tools-definition.md` 中为 `writeImageMetadata` Tool 定义的成功返回值 JSON Schema。
        * 例如: `return { success: true, filePath: params.filePath, message: "元数据已成功写入." };`
    * **`@modelcontextprotocol/sdk`:** SDK 应负责将 handler 返回的对象正确封装为 JSON-RPC 2.0 响应并通过 Stdio 发送。我们需要确保我们提供给 SDK 的返回值是符合我们定义的。
- **验收标准 (ACs):**
    - AC1: (MCP/Stdio) `writeImageMetadata` Tool 执行成功后，通过 `stdout` 返回符合 `docs/mcp-tools-definition.md` 中定义的 JSON-RPC 2.0 结果规范的响应。
    - AC2: MCP Tool 的定义文档 (`docs/mcp-tools-definition.md`) 已被创建并确认。 **(已完成)**
    - AC3: 模拟客户端能正确解析成功和错误的 JSON-RPC 响应。

## 新增技术 Stories/Tasks (由架构师识别)

### Story 3.5: `writeImageMetadata` Tool 参数的健壮性校验
- **用户故事 / 目标:** 作为开发者，我需要确保 `writeImageMetadata` Tool 的输入参数（特别是 `filePath` 和 `metadata` 对象内部的各个字段）在被传递给核心逻辑之前，经过了全面的格式和有效性校验，并能对无效输入返回清晰的错误。
- **详细需求:**
    - `@modelcontextprotocol/sdk` 通常与 `zod` 结合使用，允许在 Tool 定义时声明参数的 schema。SDK 会基于此 schema 进行初步校验。
    - 我们需要确保 `docs/mcp-tools-definition.md` 中的 JSON Schema 定义是完整和准确的，并被 `@modelcontextprotocol/sdk` 正确使用。
    - 对于 JSON Schema 难以表达的更具体的业务逻辑校验（例如，`filePath` 在 macOS 上的有效性模式，尽管不检查存在性；或元数据字符串的特定内容规则，如果需要），可以在 Tool handler 的开头添加额外的校验逻辑。
    * 例如：`filePath` 是否是有效的 macOS 路径字符串（但不实际检查文件是否存在，这由核心逻辑处理）。
    * 元数据中的字符串字段是否过长（如果需要限制）。
    * 标签或人物数组中的元素是否都是非空字符串。
- **技术实现建议:**
    * **Schema 校验:**
        * 在 `src/mcp/server.ts` 中注册 Tool 时，向 `@modelcontextprotocol/sdk` 提供基于 `zod` 的 schema 定义，该 schema 应与 `docs/mcp-tools-definition.md` 中的 JSON Schema 等效。
        * `import { z } from "zod";`
        * `const WriteImageMetadataParamsSchema = z.object({ filePath: z.string().min(1), metadata: z.object({ tags: z.array(z.string()).optional(), ... }), overwrite: z.boolean().default(true) });`
        * `server.tool("writeImageMetadata", { inputSchema: WriteImageMetadataParamsSchema, /* outputSchema (optional) */ }, handlerFn);`
    * **自定义业务校验 (在 handlerFn 内部):**
        * 在 handler 函数的开头，对 `params` 进行额外的校验。
        * 如果校验失败，抛出相应的 `JsonRpcError`，使用 `-32602 (Invalid params)` 或自定义的业务错误码 (如 `-32007 INVALID_METADATA_STRUCTURE`)。
        * 示例：
          ```typescript
          if (params.metadata.description && params.metadata.description.length > 10000) {
            throw new JsonRpcError(ERROR_CODES.INVALID_METADATA_STRUCTURE, "Description is too long.");
          }
          if (params.metadata.tags && params.metadata.tags.some(tag => tag.trim() === "")) {
            throw new JsonRpcError(ERROR_CODES.INVALID_METADATA_STRUCTURE, "Tags cannot be empty strings.");
          }
          ```
- **验收标准 (ACs):**
    - AC1: `writeImageMetadata` Tool 能拒绝不符合其 JSON Schema 定义的参数（由 `@modelcontextprotocol/sdk` + `zod` 处理），并返回 `-32602 (Invalid params)` 错误。
    - AC2: Tool 能拒绝业务上无效的参数（例如，标签数组包含空字符串，如果定义了此规则），并返回自定义的业务错误码 (例如 `-32007 INVALID_METADATA_STRUCTURE`)，与 `docs/mcp-tools-definition.md` 中定义的一致。
    - AC3: 相关的单元测试覆盖这些参数校验逻辑（包括 schema 校验失败的模拟和自定义业务校验逻辑）。

## 变更日志

| 变更内容      | 日期       | 版本  | 描述                                       | 作者        |
| ------------- | ---------- | ----- | ------------------------------------------ | ----------- |
| 初稿          | 2025-05-06 | 0.1   | 初始 Epic 定义                             | 2-PM (产品经理) |
| 修订          | 2025-05-06 | 0.2   | 调整以适应 MCP 服务 (Stdio) 和 JSON-RPC 反馈 | 2-PM (产品经理) |
| 架构补充      | 2025-05-07 | 0.3   | 添加架构师识别的技术 Story 3.5；调整 Spotlight 验证描述；细化技术实现建议和 ACs | 3-Architect |