/**
 * 情感分析提示词（带评分）
 */
export function getSentimentPrompt(
  type: 'webmedia' | 'weibo',
  content: string,
  title?: string,
  userName?: string
): string {
  if (type === 'webmedia') {
    return `请分析以下网媒文章的情感倾向和强度。

文章标题：${title || '无'}
文章内容：${content}

请分析：
1. 情感倾向：正面（positive）、中性（neutral）或负面（negative）
2. 情感强度：0-100的评分，0表示极度负面，50表示中性，100表示极度正面

请严格按照以下JSON格式返回，不要包含任何其他文字说明：
{
  "sentiment": "positive|neutral|negative",
  "score": 0-100
}

注意：
1. 网媒报道需要分析其客观性和倾向性，考虑报道的立场和态度
2. 情感强度评分：0-40为负面，40-60为中性，60-100为正面
3. 必须返回有效的JSON格式，不要添加任何解释性文字`
  } else {
    return `请分析以下微博内容的情感倾向和强度。

用户：${userName || '未知'}
内容：${content}

请分析：
1. 情感倾向：正面（positive）、中性（neutral）或负面（negative）
2. 情感强度：0-100的评分，0表示极度负面，50表示中性，100表示极度正面

请严格按照以下JSON格式返回，不要包含任何其他文字说明：
{
  "sentiment": "positive|neutral|negative",
  "score": 0-100
}

注意：
1. 微博内容需要分析用户观点的情绪化程度，考虑表达的语气和态度
2. 情感强度评分：0-40为负面，40-60为中性，60-100为正面
3. 必须返回有效的JSON格式，不要添加任何解释性文字`
  }
}

