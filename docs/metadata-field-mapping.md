# 元数据字段映射文档

本文档记录了Meta Tag Genie项目中使用的各种元数据字段的映射关系，特别是针对不同图片格式(JPG、PNG、HEIC)的处理。

## 图片元数据字段

Meta Tag Genie支持以下类型的元数据：

| 元数据类型 | 内部字段名 | 描述 |
|---------|-----------|------|
| 标签 | `tags` | 描述图片内容的关键词 |
| 描述 | `description` | 图片的文本描述 |
| 人物 | `people` | 图片中出现的人物名称 |
| 地点 | `location` | 图片拍摄或相关的地点描述 |

## 地点元数据字段选择

### 地点(location)元数据字段分析

在为"地点"文本元数据选择最佳存储字段时，我们考虑了以下备选项：

| 元数据字段 | 格式 | 优点 | 缺点 |
|----------|------|------|------|
| `XMP-photoshop:Location` | XMP | 语义明确，被Adobe产品广泛支持，在macOS上被Spotlight索引 | 不是由严格地理标准定义 |
| `IPTC:Sub-location` / `XMP-iptcCore:Location` | IPTC/XMP | 是IPTC Core标准的一部分，被专业图片管理软件支持 | 在一些消费级软件中可能支持较弱 |
| `XMP-dc:coverage` | XMP | Dublin Core元数据标准的一部分 | 语义较为广泛，不仅限于具体地点描述 |
| `XMP-iptcExt:LocationShown` | XMP | IPTC扩展标准的一部分，专为图片内容中显示的地点设计 | 结构较复杂，是一个复合字段 |

### 最终选择：`XMP-photoshop:Location`

经过研究和测试，我们最终选择使用 **`XMP-photoshop:Location`** 作为存储地点文本描述的标准字段，主要基于以下理由：

1. **Spotlight兼容性**：macOS Spotlight能够索引此字段，使用户能够通过地点信息搜索图片。
2. **软件生态支持**：Adobe产品(Photoshop、Lightroom等)以及其他主流图片管理软件广泛支持此字段。
3. **语义清晰**：字段名称直观表达了其用途，适合存储自由文本形式的地点描述。
4. **跨平台兼容性**：在不同系统和应用中有较好的支持度。
5. **exiftool-vendored支持**：我们使用的exiftool-vendored库能够无缝读写此字段。

## 元数据字段在不同格式中的实现

### JPG格式

| 元数据类型 | 写入字段 | 读取字段 |
|----------|---------|---------|
| 标签/人物 | `IPTC:Keywords`, `XMP-dc:Subject` | `IPTC:Keywords`, `XMP-dc:Subject` |
| 描述 | `EXIF:ImageDescription`, `IPTC:Caption-Abstract`, `XMP-dc:Description` | `XMP-dc:Description`, `IPTC:Caption-Abstract`, `EXIF:ImageDescription` |
| 地点 | `XMP-photoshop:Location` | `XMP-photoshop:Location` |

### PNG格式

| 元数据类型 | 写入字段 | 读取字段 |
|----------|---------|---------|
| 标签/人物 | `IPTC:Keywords`, `XMP-dc:Subject` | `IPTC:Keywords`, `XMP-dc:Subject` |
| 描述 | `EXIF:ImageDescription`, `IPTC:Caption-Abstract`, `XMP-dc:Description` | `XMP-dc:Description`, `IPTC:Caption-Abstract`, `EXIF:ImageDescription` |
| 地点 | `XMP-photoshop:Location` | `XMP-photoshop:Location` |

### HEIC格式

| 元数据类型 | 写入字段 | 读取字段 |
|----------|---------|---------|
| 标签/人物 | `IPTC:Keywords`, `XMP-dc:Subject` | `IPTC:Keywords`, `XMP-dc:Subject` |
| 描述 | `EXIF:ImageDescription`, `IPTC:Caption-Abstract`, `XMP-dc:Description` | `XMP-dc:Description`, `IPTC:Caption-Abstract`, `EXIF:ImageDescription` |
| 地点 | `XMP-photoshop:Location` | `XMP-photoshop:Location` |

## 元数据字段与exiftool参数的映射

在使用exiftool-vendored库时，我们使用以下参数名：

| 元数据类型 | exiftool参数名 |
|----------|---------------|
| 标签/人物 | `Keywords`, `Subject` |
| 描述 | `ImageDescription`, `Caption-Abstract`, `Description` |
| 地点 | `XMP-photoshop:Location` |

## Spotlight索引验证结果

我们对`XMP-photoshop:Location`字段在macOS Spotlight中的索引效果进行了验证：

1. **验证方法**：使用`writeImageMetadata` Tool将地点信息写入测试图片，然后在Finder中使用Spotlight搜索该地点名称。
2. **验证结果**：在写入地点信息后，macOS能够通过Spotlight搜索到相应图片，证实该字段被成功索引。
3. **兼容性**：在JPG、PNG和HEIC格式上均验证了索引效果，确保跨格式的一致性。

## 注意事项

1. 虽然我们选择了`XMP-photoshop:Location`作为主要字段，但实际写入时，在exiftool参数中使用的是`Location`，这是exiftool的简写形式。
2. 不同软件可能优先读取不同位置的元数据，我们的实现确保了在主流软件中都能正确展示地点信息。 