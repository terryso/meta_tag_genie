# macOS Spotlight 搜索验证计划

本文档提供了详细的手动测试步骤，用于验证通过 MetaTag Genie 服务的 `writeImageMetadata` Tool 写入的元数据是否能被 macOS Spotlight 正确索引和搜索。

## 测试目的

验证 MetaTag Genie 写入的 **标签(Tags)**, **描述(Description)**, **人物(People)** 和 **地点(Location)** 元数据能被 macOS Spotlight 索引并用于搜索，使用户能通过这些元数据快速找到相关图片。

## 前提条件

1. **环境要求**：
   - macOS 系统（最低要求 macOS Catalina 10.15 或更高版本）
   - 已安装 Node.js（最低要求 v16.x）
   - 已构建 MetaTag Genie 服务（可通过 `npm run build` 构建）

2. **测试资源**：
   - 至少每种支持的格式（JPG, PNG, HEIC）准备 2-3 张测试图片
   - 测试图片应存放在一个易于识别的目录中（例如 `~/Desktop/spotlight-test-images/`）

3. **服务准备**：
   - 确保 MetaTag Genie 服务已成功构建（`dist` 目录中应有编译后的代码）
   - 如果需要，在执行测试前可以通过 `node dist/main.js` 启动服务

## 测试步骤

### 第一阶段：元数据写入

1. **准备测试目录**：
   ```bash
   mkdir -p ~/Desktop/spotlight-test-images
   cp path/to/original/images/*.jpg ~/Desktop/spotlight-test-images/
   cp path/to/original/images/*.png ~/Desktop/spotlight-test-images/
   cp path/to/original/images/*.heic ~/Desktop/spotlight-test-images/
   ```

2. **启动 MetaTag Genie 服务**：
   ```bash
   cd /path/to/meta_tag_genie
   node dist/main.js
   ```

3. **使用测试客户端写入元数据**：
   - 使用提供的测试客户端脚本或手动构造 JSON-RPC 请求
   - 对于每种格式的图片，使用以下元数据组合进行测试：

   **测试用例组合 - 标签和描述**：
   
   | 测试ID | 文件格式 | 标签 | 描述 |
   |-------|---------|------|------|
   | T1 | JPG | ["SpotlightTest", "Vacation"] | "A beautiful sunset view during vacation." |
   | T2 | JPG | ["假期测试", "中文标签"] | "这是一张测试用的中文描述照片。" |
   | T3 | JPG | ["Beach&Sea", "Special@Chars"] | "Testing special characters: & < > \" ' / \\ ? = + %" |
   | T4 | PNG | ["SpotlightTest", "Mountains"] | "Mountain view from the hiking trail." |
   | T5 | PNG | ["OnlyTags", "NoDescription"] | *不设置* |
   | T6 | HEIC | ["SpotlightTest", "Portrait"] | "Portrait photo with good lighting." |
   | T7 | HEIC | *不设置* | "This HEIC image has description only." |

   **测试用例组合 - 人物和地点**：
   
   | 测试ID | 文件格式 | 人物 | 地点 |
   |-------|---------|------|------|
   | P1 | JPG | ["Alice Wonderland"] | *不设置* |
   | P2 | JPG | ["Bob The Builder", "Charles Xavier"] | *不设置* |
   | P3 | JPG | ["Dr. Strange (Stephen)"] | *不设置* |
   | P4 | PNG | ["孙悟空", "猪八戒"] | *不设置* |
   | L1 | PNG | *不设置* | "London, UK" |
   | L2 | PNG | *不设置* | "Eiffel Tower, Paris, France" |
   | L3 | HEIC | *不设置* | "Baker Street 221B & The Pub Nearby" |
   | L4 | HEIC | *不设置* | "中国北京故宫博物院" |
   | PL1 | JPG | ["Tony Stark", "Peter Parker"] | "Stark Tower, New York" |
   | PL2 | PNG | ["Bruce Wayne", "Clark Kent"] | "Gotham City Central Park" |
   | ALL1 | HEIC | *与T1相同* | *与T1相同* | ["Wonder Woman", "Superman"] | "Themyscira Island" |

   **示例客户端请求 (标签和描述)**：
   ```json
   {
     "jsonrpc": "2.0",
     "id": "test-001",
     "method": "tool",
     "params": {
       "name": "writeImageMetadata",
       "params": {
         "filePath": "~/Desktop/spotlight-test-images/test1.jpg",
         "metadata": {
           "tags": ["SpotlightTest", "Vacation"],
           "description": "A beautiful sunset view during vacation."
         },
         "overwrite": true
       }
     }
   }
   ```

   **示例客户端请求 (人物和地点)**：
   ```json
   {
     "jsonrpc": "2.0",
     "id": "test-002",
     "method": "tool",
     "params": {
       "name": "writeImageMetadata",
       "params": {
         "filePath": "~/Desktop/spotlight-test-images/test2.jpg",
         "metadata": {
           "people": ["Alice Wonderland"],
           "location": "London, UK"
         },
         "overwrite": true
       }
     }
   }
   ```

4. **记录元数据写入情况**：
   对于每个测试用例，记录：
   - 文件路径
   - 写入的标签、描述、人物和地点
   - 写入是否成功（服务返回成功响应）
   - 写入时间（用于后续判断索引延迟）

### 第二阶段：等待 Spotlight 索引

1. **等待 Spotlight 索引完成**：
   - 通常，Spotlight 会在文件变更后自动索引，但可能需要一些时间
   - 建议等待 1-5 分钟，让 Spotlight 有足够时间完成索引
   - 可通过以下方法观察索引进程活动：
     ```bash
     ps aux | grep mdworker
     ```
     如果看到 `mdworker` 或 `mds_stores` 进程处于活动状态，说明索引正在进行

2. **可选：强制立即索引**：
   如果需要立即测试且不想等待，可以尝试以下命令触发目录的立即索引：
   ```bash
   mdimport ~/Desktop/spotlight-test-images
   ```
   注意：此命令可能不会对所有文件立即生效，仍需等待一些时间

### 第三阶段：执行 Spotlight 搜索验证

1. **使用 Spotlight UI 搜索**：
   - 按下 `Cmd + Space` 组合键打开 Spotlight 搜索
   - 对于每个测试用例，分别尝试以下搜索查询：

   **搜索测试矩阵 - 标签和描述**：
   
   | 测试ID | 搜索内容 | 预期结果 |
   |-------|---------|---------|
   | S1 | SpotlightTest | 应找到 T1, T4, T6 的图片 |
   | S2 | Vacation | 应找到 T1 的图片 |
   | S3 | "sunset vacation" | 应找到 T1 的图片 |
   | S4 | 假期测试 | 应找到 T2 的图片 |
   | S5 | 中文描述 | 应找到 T2 的图片 |
   | S6 | Beach&Sea | 应找到 T3 的图片 |
   | S7 | Special@Chars | 应找到 T3 的图片 |
   | S8 | Mountain view | 应找到 T4 的图片 |
   | S9 | OnlyTags | 应找到 T5 的图片 |
   | S10 | Portrait lighting | 应找到 T6 的图片 |
   | S11 | HEIC description | 应找到 T7 的图片 |

   **搜索测试矩阵 - 人物和地点**：
   
   | 测试ID | 搜索内容 | 预期结果 |
   |-------|---------|---------|
   | SP1 | Alice | 应找到 P1 的图片 |
   | SP2 | Alice Wonderland | 应找到 P1 的图片 |
   | SP3 | Bob The Builder | 应找到 P2 的图片 |
   | SP4 | Charles Xavier | 应找到 P2 的图片 |
   | SP5 | Dr. Strange | 应找到 P3 的图片 |
   | SP6 | Stephen | 应找到 P3 的图片 |
   | SP7 | 孙悟空 | 应找到 P4 的图片 |
   | SP8 | 猪八戒 | 应找到 P4 的图片 |
   | SL1 | London | 应找到 L1 的图片 |
   | SL2 | Eiffel | 应找到 L2 的图片 |
   | SL3 | Paris | 应找到 L2 的图片 |
   | SL4 | Baker Street | 应找到 L3 的图片 |
   | SL5 | Pub Nearby | 应找到 L3 的图片 |
   | SL6 | 北京 | 应找到 L4 的图片 |
   | SL7 | 故宫 | 应找到 L4 的图片 |
   | SPL1 | Tony Stark | 应找到 PL1 的图片 |
   | SPL2 | Stark Tower | 应找到 PL1 的图片 |
   | SPL3 | New York | 应找到 PL1 的图片 |
   | SPL4 | Bruce Wayne | 应找到 PL2 的图片 |
   | SPL5 | Gotham City | 应找到 PL2 的图片 |
   | SALL1 | Wonder Woman | 应找到 ALL1 的图片 |
   | SALL2 | Themyscira | 应找到 ALL1 的图片 |

2. **使用 `mdfind` 命令行工具搜索**（可选辅助验证）：
   
   - 这种方法可以提供更确定性的结果，特别是在 Spotlight UI 结果不明确时
   - 针对每个测试用例，执行以下类型的命令：

   **标签和描述的搜索示例**：
   ```bash
   # 搜索标签
   mdfind -onlyin ~/Desktop/spotlight-test-images "kMDItemKeywords == 'SpotlightTest'"
   
   # 搜索描述中的文本
   mdfind -onlyin ~/Desktop/spotlight-test-images "kMDItemTextContent == '*sunset*'"
   
   # 组合搜索（标签和描述）
   mdfind -onlyin ~/Desktop/spotlight-test-images "kMDItemKeywords == 'Vacation' && kMDItemTextContent == '*beautiful*'"
   ```

   **人物和地点的搜索示例**：
   ```bash
   # 搜索人物（因为人物作为关键词写入）
   mdfind -onlyin ~/Desktop/spotlight-test-images "kMDItemKeywords == 'Alice Wonderland'"
   
   # 搜索地点中的关键词
   mdfind -onlyin ~/Desktop/spotlight-test-images "kMDItemTextContent == '*Paris*'"
   
   # 组合搜索（人物和地点）
   mdfind -onlyin ~/Desktop/spotlight-test-images "kMDItemKeywords == 'Tony Stark' && kMDItemTextContent == '*New York*'"
   ```

   可以使用提供的辅助脚本简化这些搜索：
   ```bash
   # 使用辅助脚本搜索人物
   node helper-mdfind.js ~/Desktop/spotlight-test-images "Alice Wonderland" people
   
   # 使用辅助脚本搜索地点
   node helper-mdfind.js ~/Desktop/spotlight-test-images "Paris" location
   ```

3. **记录搜索结果**：
   对于每个搜索测试，记录：
   - 使用的搜索查询
   - 是否成功找到目标图片
   - 搜索响应时间（主观感受，如"快速"、"延迟3秒"等）
   - 是否有任何意外行为或问题

## 测试结果记录表

### 标签和描述测试结果

| 测试ID | 文件格式 | 元数据 | 搜索查询 | 结果 | 响应时间 | 备注 |
|-------|---------|-------|---------|------|---------|------|
| T1+S1 | JPG | 标签:["SpotlightTest", "Vacation"] | SpotlightTest | 找到/未找到 | | |
| T1+S2 | JPG | 同上 | Vacation | 找到/未找到 | | |
| ... | ... | ... | ... | ... | ... | ... |

### 人物和地点测试结果

| 测试ID | 文件格式 | 元数据 | 搜索查询 | 结果 | 响应时间 | 备注 |
|-------|---------|-------|---------|------|---------|------|
| P1+SP1 | JPG | 人物:["Alice Wonderland"] | Alice | 找到/未找到 | | |
| P1+SP2 | JPG | 同上 | Alice Wonderland | 找到/未找到 | | |
| L1+SL1 | PNG | 地点:"London, UK" | London | 找到/未找到 | | |
| ... | ... | ... | ... | ... | ... | ... |

## 辅助测试脚本使用方法

MetaTag Genie 提供了一个辅助脚本 `helper-mdfind.js`，可以简化 Spotlight 搜索验证过程：

```bash
# 基本用法
node helper-mdfind.js <图片路径> "<mdfindQueryTerm>" [searchType]

# 搜索标签示例
node helper-mdfind.js ~/Desktop/spotlight-test-images/test1.jpg "Vacation" tags

# 搜索描述示例
node helper-mdfind.js ~/Desktop/spotlight-test-images "sunset" description

# 搜索人物示例
node helper-mdfind.js ~/Desktop/spotlight-test-images "Alice" people

# 搜索地点示例
node helper-mdfind.js ~/Desktop/spotlight-test-images "Paris" location

# 完整的mdfind查询语法也支持
node helper-mdfind.js ~/Desktop/spotlight-test-images "kMDItemKeywords == 'Alice Wonderland'"
```

## 人物和地点元数据的特殊考虑事项

1. **人物元数据的处理**：
   - 人物名称作为关键词/标签写入（根据 `docs/metadata-field-mapping.md` 中的规范）
   - 这意味着在 Spotlight 中搜索人物名称的方式与搜索标签相同
   - 在搜索时，可以使用完整人物名或部分名称，但精确匹配可能更准确

2. **地点元数据的处理**：
   - 地点文本写入 `XMP:photoshop:Location` 字段
   - Spotlight 索引此字段的方式可能不同于标准的标签字段
   - 有效的搜索可能包括地点名称的关键部分（如城市名、地标名）
   - 如果搜索结果不符合预期，尝试使用不同的关键词组合或更具体的术语

3. **元数据字段映射**：
   - 关于准确的元数据字段映射，请参阅 `docs/metadata-field-mapping.md`
   - 如需查看图片文件的所有元数据，可以使用 `mdls <图片路径>` 命令

## 预期成果衡量标准

根据产品需求文档 (PRD)，本测试的目标是：

1. **搜索成功率**：至少 90% 的已添加新元数据的测试图片应能被成功找到。
   - 针对标签：写入的标签应能在合理时间内找到至少 90% 的目标图片。
   - 针对描述：描述中的独特关键词应能在合理时间内找到至少 90% 的目标图片。
   - 针对人物：作为关键词写入的人物名称应能在合理时间内找到至少 90% 的目标图片。
   - 针对地点：地点文本中的独特关键词应能在合理时间内找到至少 90% 的目标图片。

2. **搜索响应时间**：Spotlight 搜索应能在约 5 秒内返回结果（主观感受）。

## 问题排除指南

1. **如果图片未被索引**：
   - 确认元数据是否成功写入（可使用 `exiftool` 命令行工具验证）
   - 尝试强制重新索引：`mdimport -f 文件路径`
   - 检查图片权限：确保当前用户对图片有读取权限

2. **如果索引很慢**：
   - 检查 Spotlight 是否正在对大量文件进行索引
   - 确认 Spotlight 偏好设置中没有排除测试目录
   - 尝试重新启动 Spotlight 服务：
     ```bash
     sudo mdutil -E /
     ```

3. **特殊字符搜索问题**：
   - 特殊字符（如 &, @, #）在搜索时可能需要特殊处理
   - 尝试使用引号包围搜索词
   - 对于特别复杂的查询，优先使用 `mdfind` 命令行工具

4. **人物和地点的特定问题**：
   - 人物名称可能包含空格或特殊字符，搜索时需谨慎处理
   - 地点文本可能不会被 Spotlight 识别为特定的地理位置，而是作为一般文本处理
   - 如果搜索地点文本的结果不理想，尝试使用地点名称的不同部分（例如，尝试"巴黎"而不是"埃菲尔铁塔，巴黎"）

## 变更日志

| 变更内容 | 日期 | 版本 | 描述 | 作者 |
|---------|------|-----|------|-----|
| 初稿 | 2025-05-XX | 0.1 | 创建手动测试计划 | Development Team |
| 更新 | 2025-05-XX | 0.2 | 添加人物和地点元数据的测试场景 | Development Team | 