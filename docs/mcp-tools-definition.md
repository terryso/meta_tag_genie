# MetaTag Genie MCP Tools 定义

本文档定义了 MetaTag Genie MCP 服务通过 Stdio 暴露的 Tools。客户端（如 AI 代理）将使用 JSON-RPC 2.0 协议调用这些 Tools。

## 通用约定

* **传输协议:** Stdio (标准输入/输出)
* **消息格式:** JSON-RPC 2.0
* **服务初始化:** 客户端必须首先遵循 MCP 规范完成初始化握手。
* **错误处理:**
    * 如果 Tool 调用成功，响应将是一个 JSON-RPC 2.0 `result` 对象。
    * 如果发生错误，响应将是一个 JSON-RPC 2.0 `error` 对象，包含 `code`、`message` 和可选的 `data` 字段。具体的错误代码将在每个 Tool 的定义中列出。

## Tools 定义

### 1. `writeImageMetadata`

* **Tool 名称 (JSON-RPC `method`):** `writeImageMetadata`
* **功能描述:** 将结构化的元数据（标签、描述、人物名称、地点文本）写入指定的本地图片文件。该 Tool 支持 JPG, PNG, 和 HEIC 格式。它会尝试保留图片中未明确修改的现有元数据。
* **参数 (`params`):**
    一个 JSON 对象，其结构遵循以下 JSON Schema：
    ```json
    {
      "type": "object",
      "properties": {
        "filePath": {
          "type": "string",
          "description": "要写入元数据的图片的绝对路径。"
        },
        "metadata": {
          "type": "object",
          "properties": {
            "tags": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "description": "图片标签/关键词列表。例如：['家庭', '假期', '海滩']。"
            },
            "description": {
              "type": "string",
              "description": "图片的详细描述文本。"
            },
            "people": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "description": "图片中的人物名称列表，将作为关键词处理。例如：['张三', '李四']。"
            },
            "location": {
              "type": "string",
              "description": "描述图片拍摄地点的文本。例如：'法国巴黎埃菲尔铁塔'。"
            }
          },
          "required": [],
          "additionalProperties": false,
          "description": "包含要写入的元数据。所有字段都是可选的；如果某个字段未提供或为 null，则不会修改图片中对应的元数据（除非 `overwrite` 明确设置为 true 且该字段提供了新值）。"
        },
        "overwrite": {
          "type": "boolean",
          "default": true,
          "description": "当设置为 true (默认) 时，对于提供的元数据字段（如 tags, description)，新值将覆盖图片中已有的对应值。如果设置为 false，则尝试追加（例如，对于标签和人物列表），对于描述和地点，如果已有值则可能不作修改或返回错误（此行为待细化）。MVP 默认行为是覆盖。"
        }
      },
      "required": [
        "filePath",
        "metadata"
      ],
      "additionalProperties": false
    }
    ```
* **成功返回值 (`result`):**
    一个 JSON 对象，表示操作成功。
    ```json
    {
      "type": "object",
      "properties": {
        "success": {
          "type": "boolean",
          "const": true
        },
        "filePath": {
          "type": "string",
          "description": "已成功处理的图片文件路径。"
        },
        "message": {
          "type": "string",
          "description": "描述操作成功的消息，例如：'元数据已成功写入.'"
        }
      },
      "required": [
        "success",
        "filePath",
        "message"
      ],
      "additionalProperties": false
    }
    ```
* **可能的错误 (JSON-RPC `error` 对象):**
    * **通用 JSON-RPC 错误代码:**
        * `-32700`: Parse error (解析错误 - 无效的 JSON)
        * `-32600`: Invalid Request (无效请求 - 不符合 JSON-RPC 规范)
        * `-32601`: Method not found (方法未找到 - Tool 名称错误)
        * `-32602`: Invalid params (无效参数 - Tool 参数不符合 Schema)
        * `-32603`: Internal error (内部错误 - 服务器端发生意外错误)
    * **自定义 Tool 特定错误代码 (范围建议: -32000 to -32099):**
        * `-32001`: `FILE_NOT_FOUND` - `message`: "文件未找到: [filePath]" - `data` (可选): `{"filePath": "path/to/file"}`
        * `-32002`: `FILE_NOT_READABLE` - `message`: "文件不可读: [filePath]"
        * `-32003`: `FILE_NOT_WRITABLE` - `message`: "文件不可写: [filePath]"
        * `-32004`: `UNSUPPORTED_FILE_FORMAT` - `message`: "不支持的文件格式: [filePath]。仅支持 JPG, PNG, HEIC。"
        * `-32005`: `METADATA_WRITE_FAILED` - `message`: "元数据写入失败: [filePath]。原因: [具体原因]" (例如，exiftool 错误)
        * `-32006`: `METADATA_READ_FAILED` - `message`: "元数据读取失败 (验证步骤): [filePath]。原因: [具体原因]"
        * `-32007`: `INVALID_METADATA_STRUCTURE` - `message`: "提供的元数据结构无效。"
    * **错误 `data` 字段:** 可以包含额外的上下文信息，如导致错误的具体文件路径或参数。

## 变更日志

| 变更内容      | 日期       | 版本  | 描述                                                     | 作者        |
| ------------- | ---------- | ----- | -------------------------------------------------------- | ----------- |
| 初稿          | 2025-05-07 | 0.1   | 为 `writeImageMetadata` Tool 创建初始定义和 JSON Schema | 3-Architect |

---