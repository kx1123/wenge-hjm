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
  private apiUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
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
        await db.aiCache.delete(cached.id!)
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
                  content: [
                    {
                      type: 'text',
                      text: prompt,
                    },
                  ],
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

        // HTTP 429 (限流) 或 500 (服务器错误) 时重试
        if ((status === 429 || status === 500) && attempt < maxRetries) {
          // 指数退避：1s, 2s, 4s
          const delay = Math.pow(2, attempt) * 1000
          console.warn(`API调用失败，${delay}ms后重试 (${attempt + 1}/${maxRetries})...`, error.response?.data)
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
      if (Array.isArray(parsed)) {
        // 如果是带权重的格式 [{keyword: "...", weight: 0.9}]
        if (parsed.length > 0 && typeof parsed[0] === 'object' && 'keyword' in parsed[0]) {
          result = parsed
            .slice(0, topK)
            .map((item: any) => ({
              keyword: item.keyword || item.word || String(item),
              weight: typeof item.weight === 'number' ? item.weight : 1 - (parsed.indexOf(item) / parsed.length),
            }))
        } else {
          // 如果是简单数组格式 ["关键词1", "关键词2"]
          result = parsed.slice(0, topK).map((kw: string, index: number) => ({
            keyword: String(kw),
            weight: 1 - (index / parsed.length),
          }))
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
      const result = response.trim()
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
   */
  async classifyTopic(text: string): Promise<string> {
    const cacheKey = this.generateCacheKey('topic', text)
    
    // 1. 尝试从缓存获取
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // 2. Mock 模式
    if (this.mock) {
      const result = this.mockTopic(text)
      await this.saveToCache(cacheKey, result, 'webmedia', 'topic')
      return result
    }

    // 3. 调用真实 API（带降级）
    try {
      const prompt = this.getTopicPrompt(text)
      const response = await this.callAPI(prompt)
      const result = response.trim()
      await this.saveToCache(cacheKey, result, 'webmedia', 'topic')
      return result
    } catch (error) {
      console.warn('话题分类API调用失败，使用降级方案:', error)
      const result = this.mockTopic(text)
      await this.saveToCache(cacheKey, result, 'webmedia', 'topic')
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
   */
  private mockTopic(text: string): string {
    const topics = ['投诉', '建议', '咨询', '表扬', '中性报道', '其他']
    // 简单的关键词匹配
    if (text.includes('投诉') || text.includes('不满')) return '投诉'
    if (text.includes('建议') || text.includes('希望')) return '建议'
    if (text.includes('咨询') || text.includes('请问')) return '咨询'
    if (text.includes('表扬') || text.includes('感谢')) return '表扬'
    if (text.includes('报道') || text.includes('新闻')) return '中性报道'
    return topics[Math.floor(Math.random() * topics.length)]
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
   * 生成关键词提取提示词
   */
  private getKeywordsPrompt(text: string): string {
    return `请从以下文本中提取10个关键词，并给出每个关键词的权重（0-1）。

文本内容：${text}

要求：
1. 提取最能代表文本核心内容的关键词
2. 关键词要具体、准确、有意义
3. 权重表示关键词的重要性，范围0-1，1表示最重要

请严格按照以下JSON数组格式返回，不要包含任何其他文字说明：
[
  {"keyword": "关键词1", "weight": 0.9},
  {"keyword": "关键词2", "weight": 0.8},
  ...
]`
  }

  /**
   * 生成摘要提示词
   */
  private getSummaryPrompt(text: string, maxLength: number): string {
    return `请为以下文本生成一段简洁的摘要。

文本内容：${text}

要求：
1. 摘要长度：不超过${maxLength}字
2. 提取核心信息和关键事实
3. 保持客观、准确、简洁

请直接返回摘要内容，不要包含其他说明。`
  }

  /**
   * 生成话题分类提示词
   */
  private getTopicPrompt(text: string): string {
    return `请对以下文本进行话题分类。

文本内容：${text}

请从以下类别中选择最合适的一个：
- 投诉：用户或机构对服务、产品、政策等的投诉
- 建议：对改进、优化提出的建议
- 咨询：询问信息、政策、服务等
- 表扬：对服务、产品、政策等的正面评价
- 中性报道：客观的新闻报道，无明显倾向
- 其他：不属于以上类别的其他类型

请只返回类别名称，例如：投诉、建议、咨询、表扬、中性报道、其他。`
  }
}

/**
 * 创建 AI 分析器实例
 */
export function createAIAnalyzer(config: AIAnalyzerConfig = {}): AIAnalyzer {
  return new AIAnalyzer(config)
}
