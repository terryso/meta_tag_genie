# Epic 2: 扩展图片格式支持与最终化元数据字段映射

**目标:** 将 `writeImageMetadata` Tool 处理所有 MVP 元数据类型（标签、描述、人物、地点）的能力，从 JPG 格式**扩展到 PNG 和 HEIC 图片格式**。同时，最终确定并记录所有元数据类型到标准 EXIF/IPTC/XMP 字段的最佳映射方案，确保该方案在所有支持的图片格式上都得到正确实施，以优化 Spotlight 索引效率和跨工具兼容性。

## Story 列表

### Story 2.1: 为 `writeImageMetadata` Tool 添加 PNG 图片格式支持 ✅
- **用户故事 / 目标:** 作为开发者，我需要扩展 `writeImageMetadata` Tool 的功能，使其能够为 PNG 图片格式读取和写入所有 MVP 元数据类型（标签、描述、人物、地点），确保其行为与已实现的 JPG 格式支持一致。
- **详细需求:**
    - 调研并确认所选元数据处理库 (`exiftool-vendored`) 对 PNG 格式写入所有目标元数据类型（特别是通过 XMP）的支持情况。
    - 更新 `src/core/metadata-writer.ts` 中的 `writeMetadataForImage` 和 `readMetadataForImage` 方法，以正确处理 PNG 文件，确保所有元数据类型都被写入到适当的 XMP 字段 (或其他兼容字段)。
    - 编写单元测试和集成测试，覆盖 PNG 格式下所有 MVP 元数据类型的写入与读取。
- **技术实现建议:**
    * **`src/core/metadata-writer.ts` (`MetadataWriterService`):**
        * 确保 `writeMetadataForImage` 方法在构建 `exiftoolArgs` 时，针对 PNG 格式，所有元数据类型（标签、描述、人物、地点）都使用与 XMP 兼容的字段名（与 JPG 使用的字段名应保持一致，以实现统一映射）。
        * 验证 `exiftool-vendored` 是否能如预期般将这些元数据写入 PNG 的 XMP 段。
    * **测试:**
        * 准备包含和不包含现有 XMP 元数据的 PNG 测试图片。
        * 验证所有 MVP 元数据类型的写入和读取操作是否成功，并且可以使用 `exiftool.read()` 或 `readMetadataForImage` 方法查看新写入的元数据。
- **验收标准 (ACs):**
    - AC1: 通过 MCP 客户端调用 `writeImageMetadata` Tool（传入 PNG 图片路径及所有类型的元数据），Tool 能成功将所有元数据写入。
    - AC2: 使用 ExifTool (或代码读取) 可以查看到 PNG 图片中新写入的所有类型的元数据（标签、描述、人物、地点）。
    - AC3: `readMetadataForImage` 方法能从已写入元数据的 PNG 图片中成功读回所有类型的元数据。
    - AC4: 写入操作后，PNG 文件保持完好。
    - AC5: (单元/集成测试) 覆盖 PNG 格式下所有 MVP 元数据类型的写入与读取，确认 `exiftool-vendored` 被正确调用，并且写入的元数据位于预期的 XMP (或其他兼容) 字段。
- **完成情况:** 已于 2023/05/15 完成，开发者：Claude

### Story 2.2: 为 `writeImageMetadata` Tool 添加 HEIC 图片格式支持 ✅
- **用户故事 / 目标:** 作为开发者，我需要扩展 `writeImageMetadata` Tool 的功能，使其能够为 HEIC 图片格式读取和写入所有 MVP 元数据类型（标签、描述、人物、地点），确保其行为与已实现的 JPG 格式支持一致。
- **详细需求:**
    - 重点调研所选元数据处理库 (`exiftool-vendored`) 对 HEIC (HEIF) 格式写入所有目标元数据类型（EXIF/XMP）的支持能力。
    - 更新 `src/core/metadata-writer.ts` 中的 `writeMetadataForImage` 和 `readMetadataForImage` 方法，以正确处理 HEIC 文件。
    - 编写单元测试和集成测试，覆盖 HEIC 格式下所有 MVP 元数据类型的写入与读取。
- **技术实现建议:**
    * **`src/core/metadata-writer.ts` (`MetadataWriterService`):**
        * 确保 `writeMetadataForImage` 方法在构建 `exiftoolArgs` 时，针对 HEIC 格式，所有元数据类型都使用兼容的 EXIF/XMP 字段名（与 JPG/PNG 使用的字段名应保持一致）。
    * **测试:**
        * 准备多种来源的 HEIC 测试图片。
        * 重点测试写入所有元数据类型后，文件是否仍然有效且可被 macOS 预览、照片应用等正确识别和打开。
        * 验证所有元数据是否成功写入预期的 EXIF/XMP 字段。
- **验收标准 (ACs):**
    - AC1: 通过 MCP 客户端调用 `writeImageMetadata` Tool（传入 HEIC 图片路径及所有类型的元数据），Tool 能成功将所有元数据写入。
    - AC2: 使用 ExifTool (或代码读取) 可以查看到 HEIC 图片中新写入的所有类型的元数据。
    - AC3: `readMetadataForImage` 方法能从已写入元数据的 HEIC 图片中成功读回所有类型的元数据。
    - AC4: 写入操作后，HEIC 文件保持完好，并能被标准图像查看器正确打开。
    - AC5: (单元/集成测试) 覆盖 HEIC 格式下所有 MVP 元数据类型的写入与读取，确认 `exiftool-vendored` 被正确调用，并且写入的元数据位于预期的 EXIF/XMP 字段。
- **完成情况:** 已于 2023/05/16 完成，开发者：Claude

### Story 2.3: 在 `writeImageMetadata` Tool 中实现"人物"元数据（作为关键词）的处理 - 验证与确认 ✅
- **用户故事 / 目标:** 作为开发者，我需要验证并确保"人物"名称（作为关键词）能够被正确处理并写入到所有支持的图片格式 (JPG - 已在Epic 1完成, PNG, HEIC) 的元数据中，并能读取验证。
- **详细需求:**
    - （JPG 的核心实现已在 Epic 1 Story 1.4 中完成）
    - **本 Story 的重点是在 Story 2.1 (PNG) 和 Story 2.2 (HEIC) 的实现过程中，确保"人物"作为关键词与"标签"一同被正确处理。**
    - 确保 `MetadataWriterService` 中合并 `tags` 和 `people` 列表的逻辑对 PNG 和 HEIC 格式同样有效。
- **技术实现建议:**
    * 在实现 Story 2.1 和 Story 2.2 时，测试用例应包含同时提供 `tags` 和 `people` 的场景，以验证它们是否被正确合并并写入到 PNG 和 HEIC 的关键词字段。
- **验收标准 (ACs):**
    - AC1: （已由 Epic 1 Story 1.4 覆盖 JPG）
    - AC2: 当为 PNG 和 HEIC 图片调用 `writeImageMetadata` Tool 并提供"人物"名称 (以及可选的标签)时，"人物"名称作为关键词被成功写入，并通过 ExifTool 或代码读取得到验证。
    - AC3: （已由 Epic 1 Story 1.4 覆盖 JPG）
    - AC4: 如果同时为 PNG/HEIC 提供 `tags` 和 `people`，则关键词字段包含两者的并集。
- **完成情况:** 已于 2023/05/17 完成，开发者：Claude

### Story 2.4: 研究并实现"地点"文本元数据在 `writeImageMetadata` Tool 中的处理 - 最终确定与验证 ✅
- **用户故事 / 目标:** 作为开发者，我需要**最终确定**存储文本型"地点"信息的最佳标准元数据字段，并验证 `writeImageMetadata` Tool 能够将"地点"文本成功写入所有支持的图片格式 (JPG - 已在Epic 1实现, PNG, HEIC) 的选定字段中，并能读取，目标是优化 Spotlight 的搜索效果。
- **详细需求:**
    - （JPG 的核心实现已在 Epic 1 Story 1.4 中完成，使用了一个初步选定的字段如 `XMP:photoshop:Location`）
    - **本 Story 的核心任务是完成对 EXIF, IPTC, XMP 标准中适合存储自由文本地点描述的字段的最终研究和决策。**
    - 评估备选字段（例如 `XMP:photoshop:Location`, `IPTC:Sub-location`, `XMP:iptcCore:LocationCreatedSublocation`, `XMP:dc:coverage` 等）被 Spotlight 索引的可能性和效果，并做出最终选择。
    - 在项目内部文档中记录最终选择的字段及其理由。
    - **验证在 Story 2.1 (PNG) 和 Story 2.2 (HEIC) 的实现过程中，"地点"文本被正确写入到这个最终选定的字段。**
- **技术实现建议:**
    * **研究与决策:** 进行必要的调研，选定一个最合适的字段用于存储地点文本，考虑其标准性、通用性和 Spotlight 兼容性。
    * **文档更新:** 在 `docs/metadata-field-mapping.md` (或 `docs/architecture.md`) 中明确记录最终选定的"地点"字段和选择理由。
    * **代码调整 (如果需要):** 如果最终选择的字段与 Epic 1 Story 1.4 中初步使用的字段不同，则需要更新 `src/core/metadata-writer.ts` 中处理 `location` 的逻辑。
    * **测试:** 在实现 Story 2.1 和 Story 2.2 时，测试用例应包含提供 `location` 文本的场景，以验证其是否被正确写入到 PNG 和 HEIC 的最终选定字段。
- **验收标准 (ACs):**
    - AC1: 最终选定的"地点"元数据字段已在项目文档中明确记录，并附有详细的选择理由。
    - AC2: （已由 Epic 1 Story 1.4 覆盖 JPG）对于 PNG 和 HEIC 图片，当调用 `writeImageMetadata` Tool 并提供地点文本时，该文本被成功写入最终选定的元数据字段。
    - AC3: 使用 ExifTool (或代码读取) 可以查看到新写入的地点文本，并确认其位于所有支持格式的最终选定字段。
    - AC4: `readMetadataForImage` 方法能从所有支持格式的最终选定字段中正确读取地点文本。

### Story 2.5: 确保元数据字段映射的准确性和兼容性 ✅
- **用户故事 / 目标:** 作为开发者，我需要审核并最终确定所有元数据类型（标签、描述、人物、地点）到具体 EXIF/IPTC/XMP 字段的映射方案，确保其在 Spotlight 索引、跨工具兼容性和标准遵从性方面达到最佳平衡。此映射将应用于 `writeImageMetadata` Tool，并覆盖所有支持的图片格式 (JPG, PNG, HEIC)。
- **详细需求:**
    - 汇总 `writeImageMetadata` Tool 将处理的所有元数据类型及其最终确定的目标 EXIF/IPTC/XMP 字段（基于 Epic 1 的实现和 Story 2.4 的研究结果）。
        * **Tags/Keywords (and People):** 例如，确认写入 `IPTC:Keywords` 和 `XMP:dc:subject`。
        * **Description:** 例如，确认写入 `EXIF:ImageDescription`, `IPTC:Caption-Abstract`, 和 `XMP:dc:description`。
        * **Location (Text):** 确认 Story 2.4 中最终选定的字段。
    - 确保此映射方案对 JPG, PNG, HEIC 三种格式都适用且有效。
    - 查阅最新的元数据标准文档和 Spotlight 索引行为的最佳实践。
    - 创建或更新项目内部的元数据字段映射表文档 (`docs/metadata-field-mapping.md` 或在 `docs/architecture.md` 中)，清晰记录最终的映射方案，包括 `exiftool-vendored` 使用的具体参数名。
- **技术实现建议:**
    * **文档 (`docs/metadata-field-mapping.md`):**
        * 创建一个表格，详细列出：用户输入 -> 逻辑元数据类型 -> 目标标准字段1 (EXIF/IPTC/XMP 全名) -> 目标标准字段2 (如果适用) -> ... -> `exiftool-vendored` 使用的参数键名。
        * 为每个映射提供简要理由，特别是关于 Spotlight 兼容性和多字段写入策略。
    * **代码审查:** 仔细审查 `src/core/metadata-writer.ts` 中的 `writeMetadataForImage` 和 `readMetadataForImage` 方法，确保其实现与最终的字段映射文档完全一致。
- **验收标准 (ACs):**
    - AC1: 所有元数据类型到具体目标字段的最终映射方案已为 JPG, PNG, HEIC 三种格式明确定义并记录在指定的项目文档中。
    - AC2: 记录中包含选择这些特定字段（或多字段写入策略）的理由，特别是考虑到 Spotlight 兼容性、跨工具兼容性和标准。
    - AC3: 最终的映射方案已经过团队（至少PM和技术SM/架构师）的评审和批准。
    - AC4: `MetadataWriterService` 的实现严格遵循此最终映射方案，并在所有支持的格式上行为一致。
    - AC5: (Task 2.5.1) 存在一个自动化测试套件，用于验证最终的元数据字段映射在所有支持格式上的写入和读取是否符合规范。

## 新增/细化技术 Tasks (由架构师识别)

### Task 2.4.1 (细化 Story 2.4): "地点"元数据字段与 Spotlight 索引效果的深度验证
- **描述:** 在最终选定"地点"文本存储的 EXIF/IPTC/XMP 字段后，需要进行更深入的测试，不仅仅是确认字段能写入，而是要验证不同长度、不同字符集（例如包含特殊字符或多语言）的地点文本写入后，Spotlight 的索引和搜索效果如何（通过手动测试或辅助脚本，如测试策略文档所述）。这可能涉及创建更多样化的测试用例和手动验证步骤。
- **验收标准 (ACs):**
    - AC1: 已定义一套测试用例，覆盖不同类型的地点文本。
    - AC2: 已通过手动或辅助脚本方式，对最终选定字段的 Spotlight 索引效果在所有支持格式上进行了验证并记录结果。

### Task 2.5.1 (细化 Story 2.5): 创建并验证元数据字段映射的测试套件
- **描述:** 为最终确定的元数据字段映射方案，创建一个专门的自动化测试套件。此套件应能针对每种支持的图片格式 (JPG, PNG, HEIC) 和每种元数据类型，验证写入操作是否将数据写入了所有预期的目标字段，并且读取操作能从这些字段中正确检索。
- **技术实现建议:**
    * 使用集成测试，针对 `MetadataWriterService` 的 `writeMetadataForImage` 和 `readMetadataForImage` 方法。
    * 对于每种图片格式 (JPG, PNG, HEIC) 和每种元数据类型（标签、描述、人物、地点）的组合：
        1. 准备一个干净的测试图片。
        2. 调用 `writeMetadataForImage` 写入特定元数据。
        3. 使用 `exiftool.read()` 直接读取写入后的文件，验证所有目标字段是否都包含了正确的值，符合 `docs/metadata-field-mapping.md` 的规定。
        4. (可选) 调用 `readMetadataForImage`，验证其读取逻辑是否与期望一致（例如，从哪个字段优先读取）。
- **验收标准 (ACs):**
    - AC1: 存在一个自动化测试套件（集成测试层面），用于验证每种元数据到具体 EXIF/IPTC/XMP 字段的写入和读取是否符合最终定义的规范。
    - AC2: 该测试覆盖 JPG, PNG, HEIC 格式。
    - AC3: 测试能验证写入到所有预期的多个标准字段（如描述写入到 EXIF, IPTC, XMP 的对应字段）是否成功。

## 变更日志

| 变更内容      | 日期       | 版本  | 描述                                       | 作者        |
| ------------- | ---------- | ----- | ------------------------------------------ | ----------- |
| 初稿          | 2025-05-06 | 0.1   | 初始 Epic 定义                             | 2-PM (产品经理) |
| 修订          | 2025-05-06 | 0.2   | 使其与 MCP Tool (`writeImageMetadata`) 概念保持一致 | 2-PM (产品经理) |
| 架构补充      | 2025-05-07 | 0.3   | 添加架构师识别的技术 Tasks 2.4.1, 2.5.1；细化技术实现建议和 ACs | 3-Architect |
| 目标调整      | 2025-05-07 | 0.4   | 调整 Epic 2 总体目标和 Stories 范围，以反映 Epic 1 的变更 | 3-Architect |