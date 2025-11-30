/**
 * 关键词提取提示词
 */
export function getKeywordsPrompt(type: 'webmedia' | 'weibo', content: string, title?: string): string {
  if (type === 'webmedia') {
    return `请从以下网媒文章中提取3-5个关键词。文章标题：${title || '无'}，文章内容：${content}。请以JSON数组格式返回，例如：["关键词1", "关键词2", "关键词3"]。`
  } else {
    return `请从以下微博内容中提取3-5个关键词。内容：${content}。请以JSON数组格式返回，例如：["关键词1", "关键词2", "关键词3"]。`
  }
}

