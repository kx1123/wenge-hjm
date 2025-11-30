# Word 模板文件说明

## 模板文件位置
`src/assets/report_template.docx`

## 模板变量
在 Word 模板中使用以下变量（使用 `{变量名}` 格式）：

- `{reportType}` - 报告类型（日报/周报/月报）
- `{date}` - 报告日期（格式：YYYY年MM月DD日）
- `{content}` - 报告内容（Markdown 格式，会自动转换为 Word 格式）
- `{generatedAt}` - 生成时间（格式：YYYY-MM-DD HH:mm:ss）

## 创建模板
1. 创建一个 Word 文档（.docx 格式）
2. 在需要插入变量的位置使用 `{变量名}` 格式
3. 保存为 `report_template.docx` 并放置在 `src/assets/` 目录下

## 示例模板内容
```
舆情分析{reportType}

日期：{date}
生成时间：{generatedAt}

{content}
```

## 注意事项
- 如果模板文件不存在，系统会自动使用 HTML 格式的降级方案
- 模板文件需要是有效的 .docx 格式（Office Open XML）

