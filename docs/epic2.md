# Epic 2: 扩展图片格式和元数据类型支持

**目标:** 将核心元数据引擎的功能扩展到支持所有 MVP 范围内的图片格式 (PNG, HEIC) 和所有元数据类型 (描述, 人物名称作为关键词, 地点文本)，这些都将作为 MCP 服务中 `writeImageMetadata` Tool 的参数进行处理或根据需要设计为独立的 Tool。这包括研究并确定每种元数据类型到标准 EXIF/IPTC/XMP 字段的最佳映射方案，以确保 Spotlight 索引效率和跨工具兼容性。

## Story 列表

### Story 2.1: 为 `writeImageMetadata` Tool 添加 PNG 图片格式支持
- **用户故事 / 目标:** 作为开发者，我需要扩展 `writeImageMetadata` Tool 的功能，使其能够为 PNG 图片格式读取和写入元数据（标签、描述），确保其行为与 JPG 格式一致。
- **详细需求:**
    - 调研并确认所选元数据处理库 (`exiftool-vendored`) 对 PNG 格式的支持情况和特性。
    - 更新 `writeImageMetadata` Tool 的逻辑，以处理 PNG 文件。
    - Tool 需要能将标签列表和描述文本写入 PNG 图片文件的元数据中。
    - Tool （或辅助内部函数/独立Tool）需要能从 PNG 图片文件读取标签列表和描述文本。
    - 关注 PNG 元数据标准 (例如，PNG tEXt/zTXt/iTXt chunks, XMP)。
    - 编写单元测试覆盖 PNG 格式的特定逻辑。
- **技术实现建议:**
    * **`src/core/metadata-writer.ts` (`MetadataWriterService`):**
        * `exiftool-vendored` 对 PNG 的元数据写入（特别是 XMP 段）有良好支持。
        * 在构建传递给 `exiftool.write()` 的参数时，确保元数据字段名使用与 XMP 兼容的名称（例如 `XMP:dc:subject` for tags, `XMP:dc:description` for description），这些通常是跨 JPG, PNG, HEIC 兼容的。
        * 虽然 PNG 支持 tEXt/zTXt/iTXt 块，但为了与 Spotlight 和其他工具的广泛兼容性，应优先并主要依赖写入 XMP 数据。`exiftool-vendored` 通常会自动处理这些细节，但需确认其行为。
    * **测试:**
        * 准备包含和不包含现有 XMP 元数据的 PNG 测试图片。
        * 验证写入操作是否成功，并且可以使用 `exiftool.read()` 或标准元数据查看器查看新写入的 XMP 标签和描述。
- **验收标准 (ACs):**
    - AC1: 通过 MCP 客户端调用 `writeImageMetadata` Tool（传入 PNG 图片路径及元数据：标签、描述），Tool 能成功将元数据写入。
    - AC2: 使用 ExifTool (或类似工具) 可以查看到 PNG 图片中新写入的标签和描述。
    - AC3: `writeImageMetadata` Tool 或相应的读取机制能从已写入元数据的 PNG 图片中成功读回标签和描述。
    - AC4: 写入操作后，PNG 文件保持完好。
    - AC5: (单元/集成测试) 覆盖 PNG 格式的标签和描述的写入与读取，确认 `exiftool-vendored` 被正确调用，并且写入的元数据位于预期的 XMP 字段。

### Story 2.2: 为 `writeImageMetadata` Tool 添加 HEIC 图片格式支持
- **用户故事 / 目标:** 作为开发者，我需要扩展 `writeImageMetadata` Tool 的功能，使其能够为 HEIC 图片格式读取和写入元数据（标签、描述），鉴于 HEIC 是苹果生态系统中的重要格式。
- **详细需求:**
    - 重点调研所选元数据处理库 (`exiftool-vendored`) 对 HEIC (HEIF) 格式的支持能力。
    - 更新 `writeImageMetadata` Tool 的逻辑，以处理 HEIC 文件。
    - Tool 需要能将标签列表和描述文本写入 HEIC 图片文件的元数据中。
    - Tool （或辅助内部函数/独立Tool）需要能从 HEIC 图片文件读取标签列表和描述文本。
    - 编写单元测试覆盖 HEIC 格式的特定逻辑。
- **技术实现建议:**
    * **`src/core/metadata-writer.ts` (`MetadataWriterService`):**
        * `exiftool-vendored` 对 HEIC (HEIF) 格式的元数据读写有良好支持，通常是针对其内嵌的 EXIF 和 XMP 数据。
        * 与 PNG 类似，确保传递给 `exiftool.write()` 的元数据字段名对于 HEIC 是有效的 (通常 XMP 字段是通用的，例如 `XMP:dc:subject`, `XMP:dc:description`)。
        * HEIC 文件结构可能比 JPG/PNG 更复杂，依赖 `exiftool-vendored` 来处理这些复杂性。
    * **测试:**
        * 准备多种来源的 HEIC 测试图片（例如，iPhone拍摄的原生 HEIC，其他工具转换生成的 HEIC），因为不同实现可能会有细微差别。
        * 重点测试写入元数据后，文件是否仍然有效且可被 macOS 预览、照片应用等正确识别和打开。
        * 验证元数据是否成功写入预期的 EXIF/XMP 字段。
- **验收标准 (ACs):**
    - AC1: 通过 MCP 客户端调用 `writeImageMetadata` Tool（传入 HEIC 图片路径及元数据：标签、描述），Tool 能成功将元数据写入。
    - AC2: 使用 ExifTool (或类似工具) 可以查看到 HEIC 图片中新写入的标签和描述。
    - AC3: `writeImageMetadata` Tool 或相应的读取机制能从已写入元数据的 HEIC 图片中成功读回标签和描述。
    - AC4: 写入操作后，HEIC 文件保持完好，并能被标准图像查看器正确打开。
    - AC5: (单元/集成测试) 覆盖 HEIC 格式的标签和描述的写入与读取，确认 `exiftool-vendored` 被正确调用，并且写入的元数据位于预期的 EXIF/XMP 字段。

### Story 2.3: 在 `writeImageMetadata` Tool 中实现“人物”元数据（作为关键词）的处理
- **用户故事 / 目标:** 作为开发者，我需要更新 `writeImageMetadata` Tool，使其能够接收一组“人物”名称作为参数，并将这些名称作为关键词写入到所有支持的图片格式 (JPG, PNG, HEIC) 的元数据中，并能读取验证。
- **详细需求:**
    - `writeImageMetadata` Tool 的参数中增加一个用于接收“人物”名称列表的字段 (已在 `docs/mcp-tools-definition.md` 中定义为 `people`: `string[]`)。
    - “人物”名称应作为独立的关键词处理，这意味着它们将被添加到与常规“标签”相同的元数据字段中（例如 `IPTC:Keywords` 或 `XMP:dc:subject`）。
    - 确保写入逻辑与 Story 1.4, 2.1, 2.2 中标签的写入方式兼容。如果同时提供了 `tags` 和 `people`，则两个列表中的所有项都应写入关键词字段。
    - 编写单元测试。
- **技术实现建议:**
    * **`src/mcp/tools/writeImageMetadata.ts`:**
        * 在 handler 函数中，如果 `params.metadata.people` 存在，将其与 `params.metadata.tags` (如果存在) 合并成一个统一的关键词列表。
        * 将合并后的列表传递给 `MetadataWriterService`。
    * **`src/core/metadata-writer.ts` (`MetadataWriterService`):**
        * `writeMetadataForImage` 方法需要能够接收合并后的完整关键词列表，并将其写入到目标图片格式的相应关键词字段（如 `Keywords`, `Subject`）。
        * 例如，如果 `allKeywords = [...(tags || []), ...(people || [])];`，则 `exiftoolArgs.Keywords = allKeywords;`
- **验收标准 (ACs):**
    - AC1: 通过 MCP 客户端调用 `writeImageMetadata` Tool（传入图片路径和一组人物名称，以及可选的标签），Tool 可以将人物名称和标签作为关键词成功写入 JPG, PNG, HEIC 图片。
    - AC2: 使用 ExifTool 可以在图片的关键词字段中查看到添加的人物名称和标签。
    - AC3: `writeImageMetadata` Tool 或相应的读取机制可以从图片中正确读取包含人物名称和标签的完整关键词列表。
    - AC4: 如果同时提供 `tags` 和 `people`，则关键词字段包含两者的并集。

### Story 2.4: 研究并实现“地点”文本元数据在 `writeImageMetadata` Tool 中的处理
- **用户故事 / 目标:** 作为开发者，我需要研究并确定存储文本型“地点”信息的最佳标准元数据字段，并更新 `writeImageMetadata` Tool，使其能够接收“地点”文本作为参数，为所有支持的图片格式 (JPG, PNG, HEIC) 实现其写入与读取功能，目标是优化 Spotlight 的搜索效果。
- **详细需求:**
    - 研究 EXIF, IPTC, XMP 标准中适合存储自由文本地点描述的字段 (例如 `XMP:photoshop:Location`, `IPTC:Sub-location`, `XMP:iptcCore:LocationCreatedSublocation`, `XMP:dc:coverage` 等)。
    * **初步研究指向 `XMP:photoshop:Location` 或 `XMP:iptcCore:LocationCreatedSublocation` 作为较好的候选，因为它们语义明确且被 Spotlight 索引的可能性较高。最终选择需记录理由。**
    - 评估这些字段被 Spotlight 索引的可能性和效果。
    - 做出字段选择决策，并在项目内部文档中记录理由 (例如，在 `docs/architecture.md` 或专门的字段映射说明中)。
    - `writeImageMetadata` Tool 的参数中增加一个用于接收“地点”文本的字段 (已在 `docs/mcp-tools-definition.md` 中定义为 `location`: `string`)。
    - 实现将地点文本写入选定字段的逻辑。
    - 实现读取该地点文本的逻辑（可能作为 Tool 的一部分或独立读取功能）。
    - 编写单元测试。
- **技术实现建议:**
    * **字段选择:** 假设选择 `XMP:photoshop:Location`。
    * **`src/core/metadata-writer.ts` (`MetadataWriterService`):**
        * `writeMetadataForImage` 方法需要能够接收 `location` 字符串。
        * 如果 `location` 参数存在，则在 `exiftoolArgs` 中设置，例如 `exiftoolArgs["XMP-photoshop:Location"] = location;` (注意 `exiftool-vendored` 可能需要的确切字段名格式，它通常处理组前缀)。
    * **记录:** 在 `docs/architecture.md` 的 "关键架构决策与模式" -> "Spotlight 集成" 部分，或创建一个新的 `docs/metadata-field-mapping.md` 文件，明确记录地点文本使用的字段及其选择理由。
- **验收标准 (ACs):**
    - AC1: 选定的“地点”元数据字段 (例如 `XMP:photoshop:Location`) 已确定并记录在项目文档中，附带选择理由。
    - AC2: 通过 MCP 客户端调用 `writeImageMetadata` Tool（传入图片路径和地点文本），Tool 可以将地点文本成功写入 JPG, PNG, HEIC 图片的选定元数据字段。
    - AC3: 使用 ExifTool 可以查看到新写入的地点文本，并确认其位于选定的字段。
    - AC4: `writeImageMetadata` Tool 或相应的读取机制可以从图片中正确读取写入的地点文本。

### Story 2.5: 确保元数据字段映射的准确性和兼容性
- **用户故事 / 目标:** 作为开发者，我需要审核并最终确定所有元数据类型（标签、描述、人物、地点）到具体 EXIF/IPTC/XMP 字段的映射方案，确保其在 Spotlight 索引、跨工具兼容性和标准遵从性方面达到最佳平衡。此映射将应用于 `writeImageMetadata` Tool。
- **详细需求:**
    - 汇总 `writeImageMetadata` Tool 将处理的所有元数据类型及其目标字段。
        * **Tags/Keywords (and People):** 推荐写入 `IPTC:Keywords` (数组) 和 `XMP:dc:subject` (数组)。`exiftool-vendored` 通常会自动处理这些。
        * **Description:** 推荐写入 `EXIF:ImageDescription`, `IPTC:Caption-Abstract`, 和 `XMP:dc:description`。写入多个兼容字段可提高跨工具可见性。
        * **Location (Text):** 根据 Story 2.4 的研究结果，例如 `XMP:photoshop:Location`。
    - 针对每种图片格式 (JPG, PNG, HEIC)，确认字段映射的适用性。
    - 查阅元数据标准文档和 Spotlight 索引行为的最佳实践。
    - 更新项目内部文档 (例如 `docs/architecture.md` 或新的 `docs/metadata-field-mapping.md`)，清晰记录最终的字段映射表，包括 `exiftool-vendored` 使用的具体参数名。
- **技术实现建议:**
    * **`src/core/metadata-writer.ts` (`MetadataWriterService`):**
        * 在此服务内部，根据最终确定的字段映射，构造传递给 `exiftool.write()` 的参数对象。
        * 例如：
          ```typescript
          const exifArgs: any = {};
          if (metadata.tags || metadata.people) {
            const allKeywords = [...(metadata.tags || []), ...(metadata.people || [])];
            exifArgs.Keywords = allKeywords; // IPTC:Keywords
            exifArgs["dc:subject"] = allKeywords; // XMP:dc:subject
          }
          if (metadata.description) {
            exifArgs.ImageDescription = metadata.description; // EXIF:ImageDescription
            exifArgs["Caption-Abstract"] = metadata.description; // IPTC:Caption-Abstract
            exifArgs["dc:description"] = metadata.description; // XMP:dc:description
          }
          if (metadata.location) {
            // Assuming XMP:photoshop:Location is chosen
            exifArgs["photoshop:Location"] = metadata.location; // XMP:photoshop:Location
          }
          // Add other exiftool options like -overwrite_original if needed
          // await this.exiftool.write(filePath, exifArgs, ['-overwrite_original']);
          ```
    * **文档:** 创建或更新 `docs/metadata-field-mapping.md` (或在 `docs/architecture.md` 中) 详细列出：
        * **用户提供的数据 -> 标准元数据字段 (包括组名) -> `exiftool-vendored` 参数名**
        * 示例：
            * `description` (用户输入) -> `EXIF:ImageDescription`, `IPTC:Caption-Abstract`, `XMP:dc:description` -> `exiftoolArgs.ImageDescription`, `exiftoolArgs["Caption-Abstract"]`, `exiftoolArgs["dc:description"]`
- **验收标准 (ACs):**
    - AC1: 所有元数据类型到具体字段的映射已为每种支持的图片格式明确定义和记录在指定文档中。
    - AC2: 记录中包含选择这些特定字段的理由，特别是考虑到 Spotlight 兼容性和多字段写入策略。
    - AC3: 映射方案已经过团队（至少PM和技术SM/架构师）的评审。
    - AC4: `MetadataWriterService` 的实现严格遵循此映射方案。

## 新增/细化技术 Tasks (由架构师识别)

### Task 2.4.1 (细化 Story 2.4): “地点”元数据字段与 Spotlight 索引效果的深度验证
- **描述:** 在选择了“地点”文本存储的 EXIF/IPTC/XMP 字段后，需要进行更深入的测试，不仅仅是确认字段能写入，而是要验证不同长度、不同字符集（例如包含特殊字符或多语言）的地点文本写入后，Spotlight 的索引和搜索效果如何（通过手动测试或辅助脚本，如测试策略文档所述）。这可能涉及创建更多样化的测试用例和手动验证步骤。
- **验收标准 (ACs):**
    - AC1: 已定义一套测试用例，覆盖不同类型的地点文本。
    - AC2: 已通过手动或辅助脚本方式，对选定字段的 Spotlight 索引效果进行了验证并记录结果。

### Task 2.5.1 (细化 Story 2.5): 创建并验证元数据字段映射的测试套件
- **描述:** 为最终确定的元数据字段映射方案，创建一个专门的自动化测试套件。此套件应能针对每种支持的图片格式 (JPG, PNG, HEIC) 和每种元数据类型，验证写入操作是否将数据写入了所有预期的目标字段，并且读取操作能从这些字段中正确检索。
- **技术实现建议:**
    * 使用集成测试，针对 `MetadataWriterService` 的 `writeMetadataForImage` 和 `readMetadataForImage` 方法。
    * 对于每种图片格式和每种元数据类型（标签、描述、人物、地点）的组合：
        1. 准备一个干净的测试图片。
        2. 调用 `writeMetadataForImage` 写入特定元数据。
        3. 使用 `exiftool.read()` 直接读取写入后的文件，验证所有目标字段是否都包含了正确的值。
        4. (可选) 调用 `readMetadataForImage`（如果它设计为从特定首选字段读取），验证其读取逻辑。
- **验收标准 (ACs):**
    - AC1: 存在一个自动化测试套件（集成测试层面），用于验证每种元数据到具体 EXIF/IPTC/XMP 字段的写入和读取是否符合定义的规范。
    - AC2: 该测试覆盖 JPG, PNG, HEIC 格式。
    - AC3: 测试能验证写入到所有预期的多个标准字段（如描述写入到 EXIF, IPTC, XMP 的对应字段）。

## 变更日志

| 变更内容      | 日期       | 版本  | 描述                                       | 作者        |
| ------------- | ---------- | ----- | ------------------------------------------ | ----------- |
| 初稿          | 2025-05-06 | 0.1   | 初始 Epic 定义                             | 2-PM (产品经理) |
| 修订          | 2025-05-06 | 0.2   | 使其与 MCP Tool (`writeImageMetadata`) 概念保持一致 | 2-PM (产品经理) |
| 架构补充      | 2025-05-07 | 0.3   | 添加架构师识别的技术 Tasks 2.4.1, 2.5.1；细化技术实现建议和 ACs | 3-Architect |