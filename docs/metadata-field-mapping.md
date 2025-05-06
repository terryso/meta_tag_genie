# 元数据字段映射文档

本文档详细记录了Meta Tag Genie应用如何将用户提供的元数据(标签、描述、人物、地点)映射到标准的EXIF, IPTC和XMP元数据字段,以实现跨格式(JPG, PNG, HEIC)的一致元数据处理。

## 映射概述

我们针对每种元数据类型采用了"多字段写入策略",将用户提供的元数据同时写入多个标准元数据字段,以确保:

1. **Spotlight索引效率:** 选择macOS Spotlight常用索引的字段
2. **跨工具兼容性:** 确保不同的图片查看/编辑软件能够读取到元数据
3. **遵循元数据标准:** 尊重EXIF, IPTC和XMP等标准规范

## 详细字段映射表

| 用户输入字段 | 逻辑元数据类型 | 目标标准元数据标签 (完整名称) | exiftool-vendored参数键名 | 理由/备注 |
|------------|--------------|---------------------------|------------------------|----------|
| `tags` | 关键词/标签 | `IPTC:Keywords`,<br>`XMP:dc:subject` | `Keywords`,<br>`Subject` | 同时写入IPTC和XMP标签字段,确保最大化兼容性。Spotlight优先索引这些关键词字段。 |
| `people` | 人物(作为关键词) | `IPTC:Keywords`,<br>`XMP:dc:subject` | `Keywords`,<br>`Subject` | 将人物名称作为关键词处理,与tags合并写入相同字段。更专业的人脸识别标记需要更复杂的XMP结构,不在MVP范围内。 |
| `description` | 图像描述 | `EXIF:ImageDescription`,<br>`IPTC:Caption-Abstract`,<br>`XMP:dc:description` | `ImageDescription`,<br>`Caption-Abstract`,<br>`Description` | 在三个主要标准中都写入描述,确保不同软件都能读取到描述内容。Spotlight会索引这些描述字段。 |
| `location` | 地点(自由文本) | `XMP:photoshop:Location` | `Location`,<br>`XMP-photoshop:Location` | 经研究,发现`XMP:photoshop:Location`是存储简单地点文本最合适的字段,且被Spotlight较好地索引。不使用GPS坐标相关字段,因为我们处理的是文本描述,而不是地理坐标。 |

## 读取优先级

对于可能存在于多个字段的元数据(如描述),我们定义了以下读取优先级:

1. **描述(Description):**
   - 首先尝试读取: `XMP:dc:description`
   - 其次尝试读取: `IPTC:Caption-Abstract`
   - 最后尝试读取: `EXIF:ImageDescription`

2. **标签与人物(Keywords/Tags):**
   - 收集所有来自`IPTC:Keywords`和`XMP:dc:subject`的关键词
   - 合并去重后作为`tags`返回

3. **地点(Location):**
   - 首先尝试读取: `Location` (简写形式)
   - 其次尝试读取: `XMP-photoshop:Location` (完整形式)

## 格式兼容性说明

此映射方案已经确认适用于所有三种支持的图片格式:

- **JPG/JPEG:** 完全支持所有元数据字段
- **PNG:** 完全支持所有元数据字段(主要通过XMP块存储)
- **HEIC:** 完全支持所有元数据字段

## 技术实现注意事项

- 在`MetadataWriterService.writeMetadataForImage`方法中,根据用户提供的元数据构建适当的`exiftoolArgs`对象。
- 使用`exiftool-vendored`库的参数命名约定,有些字段可以使用简写形式(如`Keywords`),而某些字段则需要完整形式(如`XMP-photoshop:Location`)。
- 在所有支持的格式上使用统一的字段映射,确保一致的用户体验。 