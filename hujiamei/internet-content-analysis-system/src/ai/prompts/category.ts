/**
 * 舆情分类提示词（区分网媒和微博，适配通义千问）
 * 输出格式：{ category, topics, event_id }
 */
export function getCategoryPrompt(
  type: 'webmedia' | 'weibo',
  content: string,
  title?: string
): string {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')

  if (type === 'webmedia') {
    return `你是一名舆情分类专家，请分析以下网媒文章的类型与话题。

文章标题：${title || '无'}
文章内容：${content}

【输出格式】严格 JSON：
{
  "category": "投诉"|"建议"|"咨询"|"表扬"|"中性报道",
  "topics": ["话题1", "话题2"],
  "event_id": "EVT_${dateStr}_keyword"
}

【分类规则】
- 投诉：含"问题""投诉""差""骗" → 负面诉求
- 建议：含"建议""希望""可以改进" → 建设性意见
- 咨询：含"请问""如何""有没有" → 信息询问
- 表扬：含"好""优秀""感谢" → 正面评价
- 中性报道：新闻体，无明显情感倾向

【事件 ID 生成规则】
- 取标题/核心事件关键词 → hash → \`EVT_${dateStr}_keyword\`
- 示例：标题含"offer" → \`EVT_${dateStr}_offer\`
- keyword 为小写，去特殊字符，最多20字符

【要求】
1. topics ≤3 个，为具体名词短语
2. confidence <0.7 时 category="中性报道"
3. 仅输出 JSON，不要包含任何其他文字说明`
  } else {
    return `你是一名舆情分类专家，请分析以下微博内容的类型与话题。

内容：${content}

【输出格式】严格 JSON：
{
  "category": "投诉"|"建议"|"咨询"|"表扬"|"中性报道",
  "topics": ["话题1", "话题2"],
  "event_id": "EVT_${dateStr}_keyword"
}

【分类规则】
- 投诉：含"问题""投诉""差""骗" → 负面诉求
- 建议：含"建议""希望""可以改进" → 建设性意见
- 咨询：含"请问""如何""有没有" → 信息询问
- 表扬：含"好""优秀""感谢" → 正面评价
- 中性报道：客观的讨论，无明显倾向

【事件 ID 生成规则】
- 提取 #xxx# 标签或高频词 → \`EVT_${dateStr}_keyword\`
- 示例：\`#令人心动的offer#\` → \`EVT_${dateStr}_offer\`
- 示例：\`风景很好\`（无标签）→ \`EVT_${dateStr}_scenery\`
- keyword 为小写，去特殊字符，最多20字符

【要求】
1. topics ≤3 个，为具体名词短语
2. confidence <0.7 时 category="中性报道"
3. 仅输出 JSON，不要包含任何其他文字说明`
  }
}

