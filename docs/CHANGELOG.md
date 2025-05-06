## [Unreleased]

### Added
- ExifTool错误处理增强，包括针对超时和进程错误的特定错误类型 (`ExifToolTimeoutError`, `ExifToolProcessError`)
- `MetadataWriterService`构造函数现在支持自定义超时设置
- 详细的错误消息现在包含ExifTool进程的stderr输出和退出码（如可用）

### Changed
- 改进了`MetadataWriterService`的错误处理逻辑，能够识别并区分不同类型的ExifTool错误
- 优化了优雅关闭流程中ExifTool资源的释放

### Fixed
- 修复了潜在的ExifTool进程泄漏问题，确保在应用关闭时清理所有资源 