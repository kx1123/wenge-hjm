import axios from 'axios'
import type { AIAnalysisResult, AnalyzeOptions, AIClientConfig, ChatMessage } from '@/interfaces/ai'
import { getSentimentPrompt } from './prompts/sentiment'
import { getKeywordsPrompt } from './prompts/keywords'
import { getSummaryPrompt } from './prompts/summary'
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

    // 简单的关键词提取（基于内容长度）
    const keywords = [
      '舆情',
      '分析',
      options.type === 'webmedia' ? '网媒' : '微博',
      sentiment === 'positive' ? '正面' : sentiment === 'negative' ? '负面' : '中性',
    ]

    return {
      sentiment,
      keywords,
      summary: `这是一条${sentiment === 'positive' ? '正面' : sentiment === 'negative' ? '负面' : '中性'}的${options.type === 'webmedia' ? '网媒' : '微博'}内容。`,
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
   * 分析情感
   */
  async analyzeSentiment(options: AnalyzeOptions): Promise<'positive' | 'neutral' | 'negative'> {
    if (this.mock) {
      const result = await this.mockAnalyze(options)
      return result.sentiment
    }

    try {
      const prompt = getSentimentPrompt(
        options.type,
        options.content,
        options.title,
        options.userName
      )
      const response = await this.callAI(prompt)
      const sentiment = response.trim().toLowerCase()

      if (['positive', 'neutral', 'negative'].includes(sentiment)) {
        return sentiment as 'positive' | 'neutral' | 'negative'
      }

      // 如果返回的不是标准格式，尝试解析
      if (response.includes('正面') || response.includes('positive')) return 'positive'
      if (response.includes('负面') || response.includes('negative')) return 'negative'
      return 'neutral'
    } catch (error) {
      console.error('情感分析失败，使用默认值:', error)
      return 'neutral'
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
   * 生成摘要
   */
  async generateSummary(options: AnalyzeOptions): Promise<string> {
    if (this.mock) {
      const result = await this.mockAnalyze(options)
      return result.summary
    }

    try {
      const prompt = getSummaryPrompt(options.type, options.content, options.title)
      const response = await this.callAI(prompt)
      return response.trim()
    } catch (error) {
      console.error('摘要生成失败，使用默认值:', error)
      return '摘要生成失败'
    }
  }

  /**
   * 综合分析（一次性获取所有分析结果）
   */
  async analyze(options: AnalyzeOptions): Promise<AIAnalysisResult> {
    if (this.mock) {
      return await this.mockAnalyze(options)
    }

    const [sentiment, keywords, summary] = await Promise.all([
      this.analyzeSentiment(options),
      this.extractKeywords(options),
      this.generateSummary(options),
    ])

    return {
      sentiment,
      keywords,
      summary,
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

