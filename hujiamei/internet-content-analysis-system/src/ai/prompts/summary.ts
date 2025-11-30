/**
 * 摘要生成提示词（支持自定义长度）
 */
export function getSummaryPrompt(
  type: 'webmedia' | 'weibo',
  content: string,
  title?: string,
  length?: number
): string {
  const defaultLength = type === 'webmedia' ? 80 : 40
  const targetLength = length || defaultLength

  if (type === 'webmedia') {
    return `请为以下网媒文章生成一段简洁的摘要。

文章标题：${title || '无'}
文章内容：${content}

要求：
1. 摘要长度：约${targetLength}字
2. 提取新闻要点：时间、地点、人物、事件、结果
3. 保持客观、准确、简洁
4. 突出核心信息和关键事实

请直接返回摘要内容，不要包含其他说明。`
  } else {
    return `请为以下微博内容生成一段简洁的摘要。

内容：${content}

要求：
1. 摘要长度：约${targetLength}字
2. 提取用户核心观点：主要诉求、态度、关注点
3. 保持简洁明了
4. 突出用户表达的核心意思

请直接返回摘要内容，不要包含其他说明。`
  }
}

/**
 * 合并摘要生成提示词
 */
export function getMergedSummaryPrompt(
  items: Array<{ type: 'webmedia' | 'weibo'; content: string; title?: string }>,
  length?: number
): string {
  const targetLength = length || 150
  const itemsText = items
    .map((item, index) => {
      if (item.type === 'webmedia') {
        return `文章${index + 1}（网媒）：
标题：${item.title || '无'}
内容：${item.content}`
      } else {
        return `内容${index + 1}（微博）：
${item.content}`
      }
    })
    .join('\n\n')

  return `请为以下多条舆情内容生成一个合并摘要。

${itemsText}

要求：
1. 摘要长度：约${targetLength}字
2. 综合所有内容的核心信息
3. 识别共同主题和关键观点
4. 保持客观、准确、简洁
5. 突出整体舆情的主要特征和趋势

请直接返回合并摘要内容，不要包含其他说明。`
}

