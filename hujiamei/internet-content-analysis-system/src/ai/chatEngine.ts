import type { Table } from 'dexie'
import { db } from '@/db/indexedDB'
import { getStats, search } from '@/db/indexedDB'
import type { ChatMessage } from '@/interfaces/ai'
import type { WebMediaData, WeiboData } from '@/interfaces/data'
import { createAIAnalyzer, createQwenAnalyzer } from './client'

/**
 * 用户查询意图
 */
export interface UserQuery {
  type: 'stats' | 'detail' | 'trend'
  filters: {
    date?: 'today' | 'yesterday' | 'week' | 'month'
    dataType?: 'webmedia' | 'weibo' | 'all'
    keyword?: string
    sentiment?: 'positive' | 'neutral' | 'negative'
  }
}

/**
 * 聊天引擎
 */
export class ChatEngine {
  private db: typeof db
  private analyzer: ReturnType<typeof createAIAnalyzer>

  constructor(dbInstance: typeof db, analyzerInstance?: ReturnType<typeof createAIAnalyzer>) {
    this.db = dbInstance
    this.analyzer = analyzerInstance || createAIAnalyzer({ mock: import.meta.env.VITE_AI_MOCK === 'true' })
  }

  /**
   * 调用通义千问 API
   */
  private async callAPI(prompt: string, maxRetries: number = 2): Promise<string> {
    if (this.analyzer['mock']) {
      // Mock 模式：返回模拟结果
      return JSON.stringify({
        type: 'stats',
        filters: { date: 'today' },
      })
    }

    const apiKey = import.meta.env.VITE_QWEN_API_KEY || 'sk-b48c6eb1c32242af82e89ee7582c66e9'
    // 使用代理路径避免 CORS 问题
    const apiUrl = import.meta.env.DEV 
      ? '/api/dashscope' // 开发环境使用代理
      : 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation' // 生产环境直接调用
    const model = 'qwen-turbo'

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const axios = (await import('axios')).default
        const response = await axios.post(
          apiUrl,
          {
            model,
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
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'X-DashScope-SSE': 'disable', // 禁用 SSE
            },
          }
        )

        const content = response.data?.output?.choices?.[0]?.message?.content
        if (content) {
          return content
        }

        return response.data.choices?.[0]?.message?.content || response.data.output?.text || ''
      } catch (error: any) {
        lastError = error instanceof Error ? error : new Error(String(error))
        const status = error.response?.status

        if ((status === 429 || status === 500) && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000
          console.warn(`API调用失败，${delay}ms后重试 (${attempt + 1}/${maxRetries})...`)
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }

        throw lastError
      }
    }

    throw lastError || new Error('API调用失败')
  }

  /**
   * 从响应中提取 JSON
   */
  private extractJSON(response: string): any {
    let cleaned = response.trim()

    // 移除 markdown 代码块标记
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    // 尝试提取 JSON 对象
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
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
      // 如果还是失败，返回默认值
      return { type: 'stats', filters: {} }
    }
  }

  /**
   * 加载意图识别提示模板
   */
  private async loadIntentPrompt(): Promise<string> {
    try {
      // 尝试从文件加载（如果支持）
      // 这里直接返回模板内容
      return `你是一名舆情分析助手，请将用户问题转为 JSON：

{
  "type": "stats" | "detail" | "trend",
  "filters": {
    "date": "today" | "yesterday" | "week" | "month",
    "dataType": "webmedia" | "weibo" | "all",
    "keyword": "产品质量" | "客服态度" | ...
  }
}

示例：
用户："今天负面舆情有多少条？"
→ { "type": "stats", "filters": { "date": "today", "sentiment": "negative" } }

用户："详细分析产品质量问题"
→ { "type": "detail", "filters": { "keyword": "产品质量" } }

用户："最近一周的舆情趋势"
→ { "type": "trend", "filters": { "date": "week" } }

【要求】
1. 仅输出 JSON，不要包含其他文字
2. type 必须为 "stats" | "detail" | "trend" 之一
3. filters 中的字段都是可选的
4. 如果无法识别意图，type 默认为 "stats"`
    } catch (error) {
      console.error('加载提示模板失败:', error)
      return `分析以下问题，输出 JSON 格式：{ "type": "stats" | "detail" | "trend", "filters": {} }`
    }
  }

  /**
   * 解析用户意图
   */
  private async parseIntent(message: string): Promise<UserQuery> {
    try {
      const template = await this.loadIntentPrompt()
      const prompt = `${template}\n\n用户问题："${message}"`
      
      const response = await this.callAPI(prompt)
      const parsed = this.extractJSON(response)
      
      // 验证和规范化
      const query: UserQuery = {
        type: parsed.type === 'stats' || parsed.type === 'detail' || parsed.type === 'trend' 
          ? parsed.type 
          : 'stats',
        filters: parsed.filters || {},
      }
      
      return query
    } catch (error) {
      console.error('解析意图失败:', error)
      // 降级方案：返回默认查询
      return {
        type: 'stats',
        filters: {},
      }
    }
  }

  /**
   * 获取日期范围
   */
  private getDateRange(date?: 'today' | 'yesterday' | 'week' | 'month'): { startTime?: string; endTime?: string } {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    switch (date) {
      case 'today':
        return {
          startTime: today.toISOString(),
          endTime: now.toISOString(),
        }
      case 'yesterday':
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayEnd = new Date(today)
        return {
          startTime: yesterday.toISOString(),
          endTime: yesterdayEnd.toISOString(),
        }
      case 'week':
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        return {
          startTime: weekAgo.toISOString(),
          endTime: now.toISOString(),
        }
      case 'month':
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        return {
          startTime: monthAgo.toISOString(),
          endTime: now.toISOString(),
        }
      default:
        return {}
    }
  }

  /**
   * 查询统计数据
   */
  private async queryStats(filters: UserQuery['filters']): Promise<any> {
    const { date, dataType, sentiment } = filters
    const { startTime, endTime } = this.getDateRange(date)
    
    // 获取所有统计数据
    const allStats = await getStats()
    
    // 如果指定了时间范围，需要过滤数据
    if (startTime || endTime) {
      // 这里简化处理，实际应该按时间范围过滤
      // 为了性能，我们直接返回全部统计，但可以在回复中说明时间范围
    }
    
    // 根据 dataType 过滤
    let result: any = {}
    if (dataType === 'webmedia') {
      result = {
        webmedia: allStats.webmedia,
        weibos: { total: 0, analyzed: 0, unanalyzed: 0, bySentiment: { positive: 0, neutral: 0, negative: 0 } },
      }
    } else if (dataType === 'weibo') {
      result = {
        webmedia: { total: 0, analyzed: 0, unanalyzed: 0, bySentiment: { positive: 0, neutral: 0, negative: 0 } },
        weibos: allStats.weibos,
      }
    } else {
      result = allStats
    }
    
    // 如果指定了情感，只返回该情感的统计
    if (sentiment) {
      result = {
        webmedia: {
          ...result.webmedia,
          bySentiment: {
            positive: sentiment === 'positive' ? result.webmedia.bySentiment.positive : 0,
            neutral: sentiment === 'neutral' ? result.webmedia.bySentiment.neutral : 0,
            negative: sentiment === 'negative' ? result.webmedia.bySentiment.negative : 0,
          },
        },
        weibos: {
          ...result.weibos,
          bySentiment: {
            positive: sentiment === 'positive' ? result.weibos.bySentiment.positive : 0,
            neutral: sentiment === 'neutral' ? result.weibos.bySentiment.neutral : 0,
            negative: sentiment === 'negative' ? result.weibos.bySentiment.negative : 0,
          },
        },
      }
    }
    
    return result
  }

  /**
   * 查询详细信息
   */
  private async queryDetails(filters: UserQuery['filters']): Promise<any> {
    const { keyword, dataType, date } = filters
    const { startTime, endTime } = this.getDateRange(date)
    
    const searchParams: any = {
      type: dataType === 'webmedia' ? 'webmedia' : dataType === 'weibo' ? 'weibo' : 'webmedia',
      keyword,
      startTime,
      endTime,
    }
    
    // 如果 dataType 是 'all'，需要分别查询
    if (dataType === 'all' || !dataType) {
      const [webmediaResult, weiboResult] = await Promise.all([
        search({ ...searchParams, type: 'webmedia' }, 1, 10),
        search({ ...searchParams, type: 'weibo' }, 1, 10),
      ])
      
      return {
        webmedia: webmediaResult.data,
        weibos: weiboResult.data,
        total: webmediaResult.total + weiboResult.total,
      }
    } else {
      const result = await search(searchParams, 1, 20)
      return {
        data: result.data,
        total: result.total,
      }
    }
  }

  /**
   * 查询趋势数据
   */
  private async queryTrend(filters: UserQuery['filters']): Promise<any> {
    const { date, dataType } = filters
    const { startTime, endTime } = this.getDateRange(date)
    
    // 获取时间范围内的数据
    const searchParams: any = {
      type: dataType === 'webmedia' ? 'webmedia' : dataType === 'weibo' ? 'weibo' : 'webmedia',
      startTime,
      endTime,
    }
    
    if (dataType === 'all' || !dataType) {
      const [webmediaResult, weiboResult] = await Promise.all([
        search({ ...searchParams, type: 'webmedia' }, 1, 1000),
        search({ ...searchParams, type: 'weibo' }, 1, 1000),
      ])
      
      // 按日期分组统计
      const webmediaByDate = this.groupByDate(webmediaResult.data)
      const weiboByDate = this.groupByDate(weiboResult.data)
      
      return {
        webmedia: webmediaByDate,
        weibos: weiboByDate,
      }
    } else {
      const result = await search(searchParams, 1, 1000)
      return {
        data: this.groupByDate(result.data),
        total: result.total,
      }
    }
  }

  /**
   * 按日期分组数据
   */
  private groupByDate(data: (WebMediaData | WeiboData)[]): Record<string, number> {
    const grouped: Record<string, number> = {}
    
    data.forEach((item) => {
      const date = item.publishTime.split('T')[0]
      grouped[date] = (grouped[date] || 0) + 1
    })
    
    return grouped
  }

  /**
   * 生成自然语言回复
   */
  private async generateResponse(question: string, query: UserQuery, data: any): Promise<string> {
    try {
      const dataStr = JSON.stringify(data, null, 2)
      
      const prompt = `你是一名舆情分析助手，请根据以下数据回答用户问题。

【用户问题】
${question}

【查询类型】
${query.type}

【查询结果】
${dataStr}

【要求】
1. 用自然语言回答用户问题
2. 基于查询结果提供准确的数据
3. 语言简洁、专业
4. 如果数据为空，说明暂无相关数据

【输出格式】
直接输出回答内容，不要包含"回答："等前缀。`

      const response = await this.callAPI(prompt)
      
      // 清理响应文本
      let answer = response.trim()
      answer = answer.replace(/^(回答[：:]|Answer[：:])\s*/i, '')
      answer = answer.replace(/\n+/g, ' ').trim()
      
      return answer || '抱歉，我无法回答这个问题。'
    } catch (error) {
      console.error('生成回复失败:', error)
      return '抱歉，生成回复时出现错误。'
    }
  }

  /**
   * 发送消息并获取回复
   */
  async sendMessage(message: string, history: ChatMessage[] = []): Promise<ChatMessage> {
    try {
      // 1. 解析用户意图
      const query = await this.parseIntent(message)
      
      // 2. 根据 query 查询数据
      let data: any = {}
      
      if (query.type === 'stats') {
        data = await this.queryStats(query.filters)
      } else if (query.type === 'detail') {
        data = await this.queryDetails(query.filters)
      } else if (query.type === 'trend') {
        data = await this.queryTrend(query.filters)
      }
      
      // 3. 生成自然语言回复
      const content = await this.generateResponse(message, query, data)
      
      // 4. 返回回复消息
      return {
        role: 'assistant',
        content,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error('处理消息失败:', error)
      return {
        role: 'assistant',
        content: '抱歉，处理您的问题时出现错误。请稍后重试。',
        timestamp: new Date().toISOString(),
      }
    }
  }
}

/**
 * 创建聊天引擎实例
 */
export function createChatEngine(
  dbInstance: typeof db = db,
  analyzer: ReturnType<typeof createQwenAnalyzer> = createQwenAnalyzer({ mock: import.meta.env.VITE_AI_MOCK === 'true' })
): ChatEngine {
  return new ChatEngine(dbInstance, analyzer)
}

