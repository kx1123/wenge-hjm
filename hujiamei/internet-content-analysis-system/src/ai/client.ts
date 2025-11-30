import axios from 'axios'
import type {
  AIAnalysisResult,
  AnalyzeOptions,
  AIClientConfig,
  ChatMessage,
  SentimentAnalysisResult,
  HotWordAnalysis,
  TopicCluster,
  EventCorrelation,
} from '@/interfaces/ai'
import { getSentimentPrompt } from './prompts/sentiment'
import { getKeywordsPrompt } from './prompts/keywords'
import { getSummaryPrompt, getMergedSummaryPrompt } from './prompts/summary'
import { getCategoryPrompt } from './prompts/category'
import { getTopicPrompt } from './prompts/topic'
import { CHAT_SYSTEM_PROMPT } from './prompts/chat'

/**
 * AI分析器类
 */
export class AIAnalyzer {
  private mock: boolean
  private apiUrl?: string
  private apiKey?: string
  private model: string

  constructor(config: AIClientConfig = {}) {
    this.mock = config.mock ?? import.meta.env.VITE_AI_MOCK === 'true'
    this.apiUrl = config.apiUrl || import.meta.env.VITE_AI_API_URL
    this.apiKey = config.apiKey || import.meta.env.VITE_AI_API_KEY
    this.model = config.model || 'glm-4-flash'
  }

  /**
   * 模拟AI分析（用于开发测试）
   */
  private async mockAnalyze(options: AnalyzeOptions): Promise<AIAnalysisResult> {
    // 模拟延迟
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000))

    const sentiments: Array<'positive' | 'neutral' | 'negative'> = ['positive', 'neutral', 'negative']
    const sentiment = sentiments[Math.floor(Math.random() * 3)]
    const sentimentScore = sentiment === 'positive' ? 60 + Math.random() * 40 : sentiment === 'negative' ? Math.random() * 40 : 40 + Math.random() * 20

    // 简单的关键词提取（基于内容长度）
    const keywords = [
      '舆情',
      '分析',
      options.type === 'webmedia' ? '网媒' : '微博',
      sentiment === 'positive' ? '正面' : sentiment === 'negative' ? '负面' : '中性',
    ]

    const categories = ['投诉', '建议', '咨询', '表扬', '中性报道', '其他']
    const category = categories[Math.floor(Math.random() * categories.length)]

    return {
      sentiment,
      sentimentScore: Math.round(sentimentScore),
      keywords,
      summary: `这是一条${sentiment === 'positive' ? '正面' : sentiment === 'negative' ? '负面' : '中性'}的${options.type === 'webmedia' ? '网媒' : '微博'}内容。`,
      category,
      topics: [keywords[0], keywords[1]],
    }
  }

  /**
   * 调用真实AI API
   */
  private async callAI(prompt: string): Promise<string> {
    if (!this.apiUrl || !this.apiKey) {
      throw new Error('AI API配置不完整')
    }

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      )

      return response.data.choices[0]?.message?.content || ''
    } catch (error) {
      console.error('AI API调用失败:', error)
      throw error
    }
  }

  /**
   * 分析情感（带评分）
   */
  async analyzeSentiment(options: AnalyzeOptions): Promise<SentimentAnalysisResult> {
    if (this.mock) {
      const result = await this.mockAnalyze(options)
      return {
        sentiment: result.sentiment,
        score: result.sentimentScore || 50,
        confidence: 0.8,
      }
    }

    try {
      const prompt = getSentimentPrompt(
        options.type,
        options.content,
        options.title,
        options.userName
      )
      const response = await this.callAI(prompt)

      // 尝试解析JSON
      try {
        const parsed = JSON.parse(response)
        if (parsed.sentiment && typeof parsed.score === 'number') {
          return {
            sentiment: parsed.sentiment as 'positive' | 'neutral' | 'negative',
            score: Math.max(0, Math.min(100, parsed.score)),
            confidence: parsed.confidence,
          }
        }
      } catch {
        // 如果不是JSON，尝试文本解析
        const sentiment = response.trim().toLowerCase()
        let score = 50

        if (sentiment.includes('positive') || sentiment.includes('正面')) {
          score = 60 + Math.random() * 40
        } else if (sentiment.includes('negative') || sentiment.includes('负面')) {
          score = Math.random() * 40
        } else {
          score = 40 + Math.random() * 20
        }

        return {
          sentiment: sentiment.includes('positive') || sentiment.includes('正面')
            ? 'positive'
            : sentiment.includes('negative') || sentiment.includes('负面')
            ? 'negative'
            : 'neutral',
          score: Math.round(score),
        }
      }
    } catch (error) {
      console.error('情感分析失败，使用默认值:', error)
      return {
        sentiment: 'neutral',
        score: 50,
      }
    }

    return {
      sentiment: 'neutral',
      score: 50,
    }
  }

  /**
   * 提取关键词
   */
  async extractKeywords(options: AnalyzeOptions): Promise<string[]> {
    if (this.mock) {
      const result = await this.mockAnalyze(options)
      return result.keywords
    }

    try {
      const prompt = getKeywordsPrompt(options.type, options.content, options.title)
      const response = await this.callAI(prompt)

      // 尝试解析JSON数组
      try {
        const parsed = JSON.parse(response)
        if (Array.isArray(parsed)) {
          return parsed.filter((k) => typeof k === 'string')
        }
      } catch {
        // 如果不是JSON，尝试提取引号内的内容
        const matches = response.match(/"([^"]+)"/g)
        if (matches) {
          return matches.map((m) => m.replace(/"/g, ''))
        }
      }

      // 最后尝试按逗号分割
      return response
        .split(/[,，、]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .slice(0, 5)
    } catch (error) {
      console.error('关键词提取失败，使用默认值:', error)
      return ['舆情', '分析']
    }
  }

  /**
   * 生成摘要（支持自定义长度）
   */
  async generateSummary(options: AnalyzeOptions): Promise<string> {
    if (this.mock) {
      const result = await this.mockAnalyze(options)
      return result.summary
    }

    try {
      const prompt = getSummaryPrompt(
        options.type,
        options.content,
        options.title,
        options.summaryLength
      )
      const response = await this.callAI(prompt)
      return response.trim()
    } catch (error) {
      console.error('摘要生成失败，使用默认值:', error)
      return '摘要生成失败'
    }
  }

  /**
   * 生成合并摘要（多条舆情智能合并）
   */
  async generateMergedSummary(
    items: Array<{ type: 'webmedia' | 'weibo'; content: string; title?: string }>,
    length?: number
  ): Promise<string> {
    if (this.mock) {
      await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 1200))
      return `合并摘要：综合了${items.length}条${items[0]?.type === 'webmedia' ? '网媒' : '微博'}内容，主要涉及舆情分析和数据统计。`
    }

    try {
      const prompt = getMergedSummaryPrompt(items, length)
      const response = await this.callAI(prompt)
      return response.trim()
    } catch (error) {
      console.error('合并摘要生成失败:', error)
      return '合并摘要生成失败'
    }
  }

  /**
   * 舆情分类
   */
  async classifyCategory(options: AnalyzeOptions): Promise<string> {
    if (this.mock) {
      const result = await this.mockAnalyze(options)
      return result.category || '其他'
    }

    try {
      const prompt = getCategoryPrompt(options.type, options.content, options.title)
      const response = await this.callAI(prompt)
      const category = response.trim()

      const validCategories = ['投诉', '建议', '咨询', '表扬', '中性报道', '中性讨论', '其他']
      if (validCategories.includes(category)) {
        return category
      }

      // 尝试匹配
      if (category.includes('投诉')) return '投诉'
      if (category.includes('建议')) return '建议'
      if (category.includes('咨询')) return '咨询'
      if (category.includes('表扬')) return '表扬'
      if (category.includes('中性')) return options.type === 'webmedia' ? '中性报道' : '中性讨论'
      return '其他'
    } catch (error) {
      console.error('舆情分类失败，使用默认值:', error)
      return '其他'
    }
  }

  /**
   * 话题识别
   */
  async identifyTopics(options: AnalyzeOptions): Promise<string[]> {
    if (this.mock) {
      const result = await this.mockAnalyze(options)
      return result.topics || []
    }

    try {
      const prompt = getTopicPrompt(options.type, options.content, options.title)
      const response = await this.callAI(prompt)

      // 尝试解析JSON数组
      try {
        const parsed = JSON.parse(response)
        if (Array.isArray(parsed)) {
          return parsed.filter((t) => typeof t === 'string' && t.length > 0).slice(0, 3)
        }
      } catch {
        // 如果不是JSON，尝试提取引号内的内容
        const matches = response.match(/"([^"]+)"/g)
        if (matches) {
          return matches.map((m) => m.replace(/"/g, '')).slice(0, 3)
        }
      }

      // 最后尝试按逗号分割
      return response
        .split(/[,，、]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .slice(0, 3)
    } catch (error) {
      console.error('话题识别失败，使用默认值:', error)
      return []
    }
  }

  /**
   * 综合分析（一次性获取所有分析结果）
   */
  async analyze(options: AnalyzeOptions): Promise<AIAnalysisResult> {
    if (this.mock) {
      return await this.mockAnalyze(options)
    }

    const [sentimentResult, keywords, summary, category, topics] = await Promise.all([
      this.analyzeSentiment(options),
      this.extractKeywords(options),
      this.generateSummary(options),
      this.classifyCategory(options),
      this.identifyTopics(options),
    ])

    return {
      sentiment: sentimentResult.sentiment,
      sentimentScore: sentimentResult.score,
      keywords,
      summary,
      category,
      topics,
    }
  }

  /**
   * AI对话
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    if (this.mock) {
      // 模拟对话响应
      await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 1200))
      const lastMessage = messages[messages.length - 1]?.content || ''

      if (lastMessage.includes('负面') || lastMessage.includes('负面舆情')) {
        return '根据当前数据，今天共有约150条负面舆情，主要集中在社会热点和突发事件方面。'
      }
      if (lastMessage.includes('正面') || lastMessage.includes('正面舆情')) {
        return '根据当前数据，今天共有约320条正面舆情，主要集中在科技发展和民生改善方面。'
      }
      if (lastMessage.includes('统计') || lastMessage.includes('多少')) {
        return '当前数据库中共有网媒数据1200条，微博数据800条，其中已分析数据1500条。'
      }

      return '我已经理解您的问题。由于当前处于模拟模式，返回的是示例数据。请配置真实的AI API以获取准确的分析结果。'
    }

    try {
      const systemMessage: ChatMessage = {
        role: 'system',
        content: CHAT_SYSTEM_PROMPT,
      }

      const response = await axios.post(
        this.apiUrl!,
        {
          model: this.model,
          messages: [systemMessage, ...messages].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          temperature: 0.7,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      )

      return response.data.choices[0]?.message?.content || '抱歉，无法生成回复。'
    } catch (error) {
      console.error('AI对话失败:', error)
      return '抱歉，AI服务暂时不可用，请稍后重试。'
    }
  }
}

/**
 * 创建AI分析器实例
 */
export function createAIAnalyzer(config?: AIClientConfig): AIAnalyzer {
  return new AIAnalyzer(config)
}

