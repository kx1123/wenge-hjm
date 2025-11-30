/**
 * 情感分析提示词
 */
export function getSentimentPrompt(type: 'webmedia' | 'weibo', content: string, title?: string, userName?: string): string {
  if (type === 'webmedia') {
    return `请分析以下网媒文章的情感倾向。文章标题：${title || '无'}，文章内容：${content}。请只返回一个词：positive（正面）、neutral（中性）或negative（负面）。`
  } else {
    return `请分析以下微博内容的情感倾向。用户：${userName || '未知'}，内容：${content}。请只返回一个词：positive（正面）、neutral（中性）或negative（负面）。`
  }
}

