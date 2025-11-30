/**
 * 摘要生成提示词
 */
export function getSummaryPrompt(type: 'webmedia' | 'weibo', content: string, title?: string): string {
  if (type === 'webmedia') {
    return `请为以下网媒文章生成一段简洁的摘要（50-100字）。文章标题：${title || '无'}，文章内容：${content}。`
  } else {
    return `请为以下微博内容生成一段简洁的摘要（30-50字）。内容：${content}。`
  }
}

