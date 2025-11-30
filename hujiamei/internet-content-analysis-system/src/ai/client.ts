import axios from 'axios'
import { db } from '@/db/indexedDB'

/**
 * AI分析器配置
 */
export interface AIAnalyzerConfig {
  mock?: boolean
  apiKey?: string
}

/**
 * 情感分析结果
 */
export interface SentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative'
  score: number // 0-100
  confidence?: number // 0-1
}

/**
 * 关键词结果
 */
export interface KeywordResult {
  keyword: string
  weight: number // 0-1
}

/**
 * AI分析器类
 */
export class AIAnalyzer {
  private mock: boolean
  private apiKey: string
  // 使用代理路径避免 CORS 问题
  private apiUrl = import.meta.env.DEV 
    ? '/api/dashscope' // 开发环境使用代理
    : 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation' // 生产环境直接调用
  private model = 'qwen-turbo'

  constructor(config: AIAnalyzerConfig = {}) {
    this.mock = config.mock ?? false
    this.apiKey = config.apiKey || 'sk-b48c6eb1c32242af82e89ee7582c66e9'
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(method: string, text: string, params?: any): string {
    const paramsStr = params ? JSON.stringify(params) : ''
    const content = `${method}_${text}_${paramsStr}`
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return `ai_${Math.abs(hash).toString(36)}`
  }

  /**
   * 从缓存获取
   */
  private async getFromCache(cacheKey: string): Promise<any | null> {
    try {
      const cached = await db.aiCache.where('cacheKey').equals(cacheKey).first()
      if (!cached) return null

      // 检查是否过期（24小时）
      const now = new Date()
      const createdAt = new Date(cached.createdAt)
      const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
      if (hoursDiff > 24) {
        // 确保 id 是 number 类型
        const cacheId = typeof cached.id === 'number' ? cached.id : (typeof cached.id === 'string' ? parseInt(cached.id, 10) : null)
        if (cacheId !== null && !isNaN(cacheId)) {
          await db.aiCache.delete(cacheId)
        }
        return null
      }

      return JSON.parse(cached.result)
    } catch (error) {
      console.error('读取缓存失败:', error)
      return null
    }
  }

  /**
   * 保存到缓存
   */
  private async saveToCache(cacheKey: string, result: any, dataType: 'webmedia' | 'weibo' = 'webmedia', promptType: 'sentiment' | 'keywords' | 'summary' | 'category' | 'topic' | 'full' = 'full'): Promise<void> {
    try {
      await db.aiCache.put({
        cacheKey,
        dataType,
        promptType,
        promptVersion: 'v1',
        result: JSON.stringify(result),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24小时后过期
      })
    } catch (error) {
      console.error('保存缓存失败:', error)
    }
  }

  /**
   * 调用通义千问 API（带重试和降级）
   */
  private async callAPI(prompt: string, maxRetries: number = 2): Promise<string> {
    // 如果启用 mock，直接返回模拟结果
    if (this.mock) {
      throw new Error('Mock mode enabled, use mock methods instead')
    }

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.post(
          this.apiUrl,
          {
            model: this.model,
            input: {
              messages: [
                {
                  role: 'user',
                  content: prompt, // 直接使用字符串，不是数组
                },
              ],
            },
            parameters: {
              result_format: 'message',
              temperature: 0.7,
              max_tokens: 2000,
            },
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
              'X-DashScope-SSE': 'disable', // 禁用 SSE
            },
          }
        )

        // 解析响应：output.choices[0].message.content
        const content = response.data?.output?.choices?.[0]?.message?.content
        if (content) {
          return content
        }

        // 兼容其他格式
        return response.data.choices?.[0]?.message?.content || response.data.output?.text || ''
      } catch (error: any) {
        lastError = error instanceof Error ? error : new Error(String(error))
        const status = error.response?.status
        const errorData = error.response?.data

        // 403 错误：权限问题，记录详细信息
        if (status === 403) {
          console.error('API 403 错误 - 权限问题:', {
            message: errorData?.message || error.message,
            code: errorData?.code,
            requestId: errorData?.request_id,
            apiKey: this.apiKey ? `${this.apiKey.substring(0, 10)}...` : '未设置',
          })
          throw new Error(`API 403 错误：${errorData?.message || '权限被拒绝，请检查 API Key 是否有效'}`)
        }

        // HTTP 429 (限流) 或 500 (服务器错误) 时重试
        if ((status === 429 || status === 500) && attempt < maxRetries) {
          // 指数退避：1s, 2s, 4s
          const delay = Math.pow(2, attempt) * 1000
          console.warn(`API调用失败，${delay}ms后重试 (${attempt + 1}/${maxRetries})...`, errorData)
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }

        // 其他错误或重试次数用完，抛出错误
        throw lastError
      }
    }

    throw lastError || new Error('API调用失败')
  }

  /**
   * 从响应中提取 JSON（处理 markdown 代码块等）
   */
  private extractJSON(response: string): any {
    // 清理响应文本
    let cleaned = response.trim()

    // 移除 markdown 代码块标记
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    // 尝试提取 JSON 对象或数组
    const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0])
      } catch {
        // 如果解析失败，继续尝试整个文本
      }
    }

    // 尝试解析整个文本
    try {
      return JSON.parse(cleaned)
    } catch {
      // 如果还是失败，返回原始文本
      return cleaned
    }
  }

  /**
   * 分析情感（带降级）
   */
  async analyzeSentiment(text: string, dataType: 'webmedia' | 'weibo'): Promise<SentimentResult> {
    const cacheKey = this.generateCacheKey('sentiment', text, { dataType })
    
    // 1. 尝试从缓存获取
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // 2. Mock 模式
    if (this.mock) {
      const result = this.mockSentiment(text, dataType)
      await this.saveToCache(cacheKey, result, dataType, 'sentiment')
      return result
    }

    // 3. 调用真实 API（带降级）
    try {
      const prompt = this.getSentimentPrompt(text, dataType)
      const response = await this.callAPI(prompt)
      const parsed = this.extractJSON(response)

      let result: SentimentResult
      if (typeof parsed === 'object' && parsed.sentiment) {
        result = {
          sentiment: parsed.sentiment as 'positive' | 'neutral' | 'negative',
          score: Math.max(0, Math.min(100, parsed.score || 50)),
          confidence: parsed.confidence || 0.8,
        }
      } else {
        // 解析失败，使用降级方案
        result = this.mockSentiment(text, dataType)
      }

      await this.saveToCache(cacheKey, result, dataType, 'sentiment')
      return result
    } catch (error) {
      console.warn('情感分析API调用失败，使用降级方案:', error)
      const result = this.mockSentiment(text, dataType)
      await this.saveToCache(cacheKey, result, dataType, 'sentiment')
      return result
    }
  }

  /**
   * 提取关键词（带降级）
   */
  async extractKeywords(text: string, topK: number = 10): Promise<KeywordResult[]> {
    const cacheKey = this.generateCacheKey('keywords', text, { topK })
    
    // 1. 尝试从缓存获取
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // 2. Mock 模式
    if (this.mock) {
      const result = this.mockKeywords(text, topK)
      await this.saveToCache(cacheKey, result, 'webmedia', 'keywords')
      return result
    }

    // 3. 调用真实 API（带降级）
    try {
      const prompt = this.getKeywordsPrompt(text)
      const response = await this.callAPI(prompt)
      const parsed = this.extractJSON(response)

      let result: KeywordResult[]
      if (typeof parsed === 'object' && parsed !== null) {
        // 如果是 { keywords: [...] } 格式（通义千问标准格式）
        if ('keywords' in parsed && Array.isArray(parsed.keywords)) {
          result = parsed.keywords
            .filter((item: any) => {
              const word = item.word || item.keyword || String(item)
              const weight = typeof item.weight === 'number' ? item.weight : 0.5
              return word.length >= 2 && weight >= 0.5
            })
            .slice(0, topK)
            .map((item: any) => ({
              keyword: item.word || item.keyword || String(item),
              weight: typeof item.weight === 'number' ? item.weight : 0.5,
            }))
        } else if (Array.isArray(parsed)) {
          // 如果是数组格式 [{word: "...", weight: 0.9}] 或 ["关键词1", "关键词2"]
          if (parsed.length > 0 && typeof parsed[0] === 'object' && ('word' in parsed[0] || 'keyword' in parsed[0])) {
            result = parsed
              .filter((item: any) => {
                const word = item.word || item.keyword || String(item)
                const weight = typeof item.weight === 'number' ? item.weight : 0.5
                return word.length >= 2 && weight >= 0.5
              })
              .slice(0, topK)
              .map((item: any) => ({
                keyword: item.word || item.keyword || String(item),
                weight: typeof item.weight === 'number' ? item.weight : 0.5,
              }))
          } else {
            // 简单数组格式 ["关键词1", "关键词2"]
            result = parsed
              .filter((kw: any) => String(kw).length >= 2)
              .slice(0, topK)
              .map((kw: string, index: number) => ({
                keyword: String(kw),
                weight: 1 - (index / parsed.length),
              }))
          }
        } else {
          // 解析失败，使用降级方案
          result = this.mockKeywords(text, topK)
        }
      } else {
        // 解析失败，使用降级方案
        result = this.mockKeywords(text, topK)
      }

      await this.saveToCache(cacheKey, result, 'webmedia', 'keywords')
      return result
    } catch (error) {
      console.warn('关键词提取API调用失败，使用降级方案:', error)
      const result = this.mockKeywords(text, topK)
      await this.saveToCache(cacheKey, result, 'webmedia', 'keywords')
      return result
    }
  }

  /**
   * 生成摘要（带降级）
   */
  async generateSummary(text: string, maxLength: number = 200): Promise<string> {
    const cacheKey = this.generateCacheKey('summary', text, { maxLength })
    
    // 1. 尝试从缓存获取
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // 2. Mock 模式
    if (this.mock) {
      const result = this.mockSummary(text, maxLength)
      await this.saveToCache(cacheKey, result, 'webmedia', 'summary')
      return result
    }

    // 3. 调用真实 API（带降级）
    try {
      const prompt = this.getSummaryPrompt(text, maxLength)
      const response = await this.callAPI(prompt)
      // 清理响应：移除可能的说明文字、换行、多余标点
      let result = response.trim()
      // 移除可能的"摘要："等前缀
      result = result.replace(/^(摘要[：:]|Summary[：:]|摘要内容[：:])\s*/i, '')
      // 移除换行符，替换为空格
      result = result.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim()
      // 确保不超过最大长度（按中文字符数）
      if (result.length > maxLength) {
        result = result.substring(0, maxLength)
      }
      await this.saveToCache(cacheKey, result, 'webmedia', 'summary')
      return result
    } catch (error) {
      console.warn('摘要生成API调用失败，使用降级方案:', error)
      const result = this.mockSummary(text, maxLength)
      await this.saveToCache(cacheKey, result, 'webmedia', 'summary')
      return result
    }
  }

  /**
   * 分类话题（带降级）
   * 返回格式：{ category: string, topics: string[], event_id?: string }
   */
  async classifyTopic(text: string, dataType: 'webmedia' | 'weibo' = 'webmedia', title?: string): Promise<{ category: string; topics: string[]; event_id?: string }> {
    const cacheKey = this.generateCacheKey('topic', text, { dataType, title })
    
    // 1. 尝试从缓存获取
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // 2. Mock 模式
    if (this.mock) {
      const result = this.mockTopic(text, dataType)
      await this.saveToCache(cacheKey, result, dataType, 'topic')
      return result
    }

    // 3. 调用真实 API（带降级）
    try {
      const prompt = this.getTopicPrompt(text, dataType, title)
      const response = await this.callAPI(prompt)
      const parsed = this.extractJSON(response)

      let result: { category: string; topics: string[]; event_id?: string }
      if (typeof parsed === 'object' && parsed !== null && 'category' in parsed) {
        result = {
          category: String(parsed.category || '中性报道'),
          topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, 3).map(String) : [],
          event_id: parsed.event_id ? String(parsed.event_id) : undefined,
        }
      } else {
        // 解析失败，使用降级方案
        result = this.mockTopic(text, dataType)
      }

      await this.saveToCache(cacheKey, result, dataType, 'topic')
      return result
    } catch (error) {
      console.warn('话题分类API调用失败，使用降级方案:', error)
      const result = this.mockTopic(text, dataType)
      await this.saveToCache(cacheKey, result, dataType, 'topic')
      return result
    }
  }

  // ========== Mock 方法 ==========

  /**
   * Mock 情感分析（网媒中性多，微博两极）
   */
  private mockSentiment(_text: string, dataType: 'webmedia' | 'weibo'): SentimentResult {
    if (dataType === 'webmedia') {
      // 网媒：70%中性，20%正面，10%负面
      const rand = Math.random()
      if (rand < 0.7) {
        return {
          sentiment: 'neutral',
          score: 45 + Math.random() * 15, // 45-60，如「国产三大AI测算」→ 55
          confidence: 0.75 + Math.random() * 0.15,
        }
      } else if (rand < 0.9) {
        return {
          sentiment: 'positive',
          score: 60 + Math.random() * 30, // 60-90
          confidence: 0.7 + Math.random() * 0.2,
        }
      } else {
        return {
          sentiment: 'negative',
          score: Math.random() * 40, // 0-40
          confidence: 0.7 + Math.random() * 0.2,
        }
      }
    } else {
      // 微博：40%正面，35%负面，25%中性
      const rand = Math.random()
      if (rand < 0.4) {
        return {
          sentiment: 'positive',
          score: 60 + Math.random() * 40, // 60-100，如「风景很好」→ 82
          confidence: 0.75 + Math.random() * 0.15,
        }
      } else if (rand < 0.75) {
        return {
          sentiment: 'negative',
          score: Math.random() * 40, // 0-40，如「我好崩溃」→ 25
          confidence: 0.75 + Math.random() * 0.15,
        }
      } else {
        return {
          sentiment: 'neutral',
          score: 40 + Math.random() * 20, // 40-60
          confidence: 0.7 + Math.random() * 0.2,
        }
      }
    }
  }

  /**
   * Mock 关键词提取
   */
  private mockKeywords(text: string, topK: number): KeywordResult[] {
    // 简单的关键词提取（基于文本内容）
    const keywords: KeywordResult[] = []
    const commonWords = ['舆情', '分析', '数据', '报道', '讨论', '话题', '观点', '情绪', '事件', '新闻']
    
    // 从文本中提取可能的关键词
    const words = text.split(/[\s，。、；：！？\n\r]+/).filter(w => w.length > 1)
    const uniqueWords = [...new Set(words)].slice(0, topK)
    
    uniqueWords.forEach((word, index) => {
      keywords.push({
        keyword: word,
        weight: 1 - (index / topK),
      })
    })

    // 如果关键词不足，补充通用词
    while (keywords.length < topK && keywords.length < commonWords.length) {
      const word = commonWords[keywords.length]
      if (!keywords.some(k => k.keyword === word)) {
        keywords.push({
          keyword: word,
          weight: 0.5 - (keywords.length * 0.05),
        })
      }
    }

    return keywords.slice(0, topK)
  }

  /**
   * Mock 摘要生成
   */
  private mockSummary(text: string, maxLength: number): string {
    // 简单的摘要：取前 maxLength 个字符
    if (text.length <= maxLength) {
      return text
    }
    return text.substring(0, maxLength) + '...'
  }

  /**
   * Mock 话题分类
   * 返回格式：{ category: string, topics: string[], event_id?: string }
   */
  private mockTopic(text: string, dataType: 'webmedia' | 'weibo' = 'webmedia'): { category: string; topics: string[]; event_id?: string } {
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')

    // 简单的关键词匹配
    let category = '中性报道'
    if (text.includes('投诉') || text.includes('不满') || text.includes('问题') || text.includes('差') || text.includes('骗')) {
      category = '投诉'
    } else if (text.includes('建议') || text.includes('希望') || text.includes('可以改进')) {
      category = '建议'
    } else if (text.includes('咨询') || text.includes('请问') || text.includes('如何') || text.includes('有没有')) {
      category = '咨询'
    } else if (text.includes('表扬') || text.includes('感谢') || text.includes('好') || text.includes('优秀')) {
      category = '表扬'
    } else if (text.includes('报道') || text.includes('新闻') || dataType === 'webmedia') {
      category = '中性报道'
    }

    // 提取话题标签 #xxx#
    const topicMatches = text.match(/#([^#]+?)#/g)
    const topics: string[] = topicMatches
      ? topicMatches.map((tag) => tag.slice(1, -1)).slice(0, 3)
      : [category, dataType === 'webmedia' ? '网媒报道' : '微博讨论'].slice(0, 3)

    // 生成 event_id
    let eventKeyword = 'default'
    if (topicMatches && topicMatches.length > 0) {
      eventKeyword = topicMatches[0].slice(1, -1).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)
    } else if (text.includes('offer')) {
      eventKeyword = 'offer'
    } else if (text.includes('风景') || text.includes('scenery')) {
      eventKeyword = 'scenery'
    } else {
      // 提取高频词作为 keyword
      const words = text.split(/[\s，。、；：！？\n\r]+/).filter(w => w.length >= 2)
      if (words.length > 0) {
        eventKeyword = words[0].toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)
      }
    }
    const event_id = `EVT_${dateStr}_${eventKeyword}`

    return {
      category,
      topics: topics.slice(0, 3),
      event_id,
    }
  }

  // ========== Prompt 生成 ==========

  /**
   * 生成情感分析提示词
   */
  private getSentimentPrompt(text: string, dataType: 'webmedia' | 'weibo'): string {
    if (dataType === 'webmedia') {
      return `请分析以下网媒文章的情感倾向和强度。

文章内容：${text}

请分析：
1. 情感倾向：正面（positive）、中性（neutral）或负面（negative）
2. 情感强度：0-100的评分，0表示极度负面，50表示中性，100表示极度正面

请严格按照以下JSON格式返回，不要包含任何其他文字说明：
{
  "sentiment": "positive|neutral|negative",
  "score": 0-100,
  "confidence": 0-1
}

注意：网媒报道需要分析其客观性和倾向性，考虑报道的立场和态度。`
    } else {
      return `请分析以下微博内容的情感倾向和强度。

内容：${text}

请分析：
1. 情感倾向：正面（positive）、中性（neutral）或负面（negative）
2. 情感强度：0-100的评分，0表示极度负面，50表示中性，100表示极度正面

请严格按照以下JSON格式返回，不要包含任何其他文字说明：
{
  "sentiment": "positive|neutral|negative",
  "score": 0-100,
  "confidence": 0-1
}

注意：微博内容需要分析用户观点的情绪化程度，考虑表达的语气和态度。`
    }
  }

  /**
   * 生成关键词提取提示词（适配通义千问）
   */
  private getKeywordsPrompt(text: string): string {
    return `你是一名舆情热词挖掘专家，请提取以下文本的核心热词。

文本内容：${text}

【输出格式】严格 JSON：
{
  "keywords": [
    { "word": "词1", "weight": 0.0~1.0 },
    { "word": "词2", "weight": 0.0~1.0 }
  ]
}

【热词原则】
- 聚焦：事件主体、核心动作、情绪词、话题标签
- 排除：通用词（「近日」「据悉」）、停用词（的/了/在/是/有/和/与/或/但/而/等）
- 优先提取 #xxx# 标签（去#号）

【要求】
1. 仅输出 JSON，不要包含任何其他文字说明
2. weight ≥0.5 为有效热词
3. 词长 ≥2，去停用词
4. 关键词数量：3-10个
5. 按 weight 降序排列

【示例输出】
{
  "keywords": [
    { "word": "offer", "weight": 0.95 },
    { "word": "测算", "weight": 0.85 },
    { "word": "AI", "weight": 0.75 }
  ]
}`
  }

  /**
   * 生成摘要提示词（适配通义千问）
   */
  private getSummaryPrompt(text: string, maxLength: number): string {
    return `你是一名舆情摘要生成专家，请为以下文本生成摘要。

文本内容：${text}

【输出要求】
- 纯文本摘要，严格 ≤ ${maxLength} 字（中文按字符数）
- 无标题、无换行
- 直接输出摘要内容，不要包含任何说明文字

【摘要原则】
- 提取：5W1H（Who/What/When/Where/Why/How）或核心观点 + 情绪倾向
- 客观陈述，不添加观点
- 保留关键信息、情绪词/标签

【强制要求】
1. 严格 ≤ ${maxLength} 字
2. 不出现"本文""该微博"等指代
3. 情感倾向需隐含（负面→"问题""质疑"；正面→"满意""赞赏"）
4. 不使用引号、括号等标点符号（除非必要）
5. 直接输出摘要内容`
  }

  /**
   * 生成话题分类提示词（适配通义千问）
   * 输出格式：{ category, topics, event_id }
   */
  private getTopicPrompt(text: string, dataType: 'webmedia' | 'weibo' = 'webmedia', title?: string): string {
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')

    if (dataType === 'webmedia') {
      return `你是一名舆情分类专家，请分析以下网媒文章的类型与话题。

文章标题：${title || '无'}
文章内容：${text}

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

内容：${text}

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
}

/**
 * 创建 AI 分析器实例
 */
export function createAIAnalyzer(config: AIAnalyzerConfig = {}): AIAnalyzer {
  return new AIAnalyzer(config)
}

/**
 * 创建通义千问分析器实例（别名）
 */
export function createQwenAnalyzer(config: AIAnalyzerConfig = {}): AIAnalyzer {
  return createAIAnalyzer(config)
}
