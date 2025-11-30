/**
 * 摘要生成提示词（区分网媒和微博，适配通义千问）
 * 网媒：5W1H（时间、地点、人物、事件、结果）
 * 微博：核心观点（主要诉求、态度、关注点）+ 情绪倾向
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
    return `你是一名舆情摘要生成专家，请为以下网媒文章生成摘要。

文章标题：${title || '无'}
文章内容：${content}

【输出要求】
- 纯文本摘要，严格 ≤ ${targetLength} 字（中文按字符数）
- 无标题、无换行
- 直接输出摘要内容，不要包含任何说明文字

【网媒摘要原则】
- 提取：5W1H（Who/What/When/Where/Why/How）
- 客观陈述，不添加观点
- 示例：「国产三大AI对双色球128期进行测算，结果仅供参考」

【强制要求】
1. 严格 ≤ ${targetLength} 字
2. 不出现"本文""该文章"等指代
3. 不使用引号、括号等标点符号（除非必要）
4. 直接输出摘要内容`
  } else {
    return `你是一名舆情摘要生成专家，请为以下微博内容生成摘要。

内容：${content}

【输出要求】
- 纯文本摘要，严格 ≤ ${targetLength} 字（中文按字符数）
- 无标题、无换行
- 直接输出摘要内容，不要包含任何说明文字

【微博摘要原则】
- 提取：用户核心观点 + 情绪倾向
- 保留关键情绪词/标签
- 示例：「用户表达对offer课题的期待；部分用户因『风景很好』感到愉悦」

【强制要求】
1. 严格 ≤ ${targetLength} 字
2. 不出现"该微博""这条微博"等指代
3. 情感倾向需隐含（负面→"问题""质疑"；正面→"满意""赞赏"）
4. 不使用引号、括号等标点符号（除非必要）
5. 直接输出摘要内容`
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

