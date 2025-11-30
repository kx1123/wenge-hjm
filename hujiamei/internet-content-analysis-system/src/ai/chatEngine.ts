import { db, getStats, search } from '@/db/indexedDB'
import { createAIAnalyzer } from '@/ai/client'
import type { ChatMessage } from '@/interfaces/ai'
import dayjs from 'dayjs'

/**
 * 创建聊天引擎
 */
export function createChatEngine(
  dbInstance?: typeof db,
  analyzer = createAIAnalyzer()
) {
  /**
   * 发送消息并获取回复
   */
  async function sendMessage(
    message: string,
    history: ChatMessage[] = []
  ): Promise<ChatMessage> {
    try {
      // 1. 意图识别 - 解析用户意图
      const intent = await parseIntent(message)
      
      // 2. 数据查询 - 根据意图查询数据
      let queryResult: any = null
      
      if (intent.type === 'stats') {
        // 统计查询
        // 如果指定了具体日期，按日期查询
        if (intent.filters?.date && typeof intent.filters.date === 'string' && intent.filters.date.includes('-')) {
          const specificDate = dayjs(intent.filters.date)
          const dateRange = {
            start: specificDate.startOf('day').toISOString(),
            end: specificDate.endOf('day').toISOString(),
          }
          const dataType = intent.filters?.dataType === 'webmedia' ? 'webmedia' : intent.filters?.dataType === 'weibo' ? 'weibo' : 'all'
          
          let results: any = null
          if (dataType === 'all') {
            // 查询所有类型
            const [webmediaResults, weiboResults] = await Promise.all([
              search({ type: 'webmedia', startTime: dateRange.start, endTime: dateRange.end }, 1, 1000),
              search({ type: 'weibo', startTime: dateRange.start, endTime: dateRange.end }, 1, 1000),
            ])
            results = {
              items: [...(webmediaResults.data || []), ...(weiboResults.data || [])],
              total: (webmediaResults.total || 0) + (weiboResults.total || 0),
            }
          } else {
            const searchResult = await search({
              type: dataType,
              startTime: dateRange.start,
              endTime: dateRange.end,
            }, 1, 1000)
            results = {
              items: searchResult.data || [],
              total: searchResult.total || 0,
            }
          }
          
          queryResult = {
            type: 'stats',
            data: {
              items: results.items || [],
              total: results.total || 0,
              date: intent.filters.date,
            },
            filters: intent.filters,
          }
        } else {
          // 全局统计
          const stats = await getStats()
          queryResult = {
            type: 'stats',
            data: stats,
            filters: intent.filters,
          }
        }
      } else if (intent.type === 'detail') {
        // 详情查询
        const dataType = intent.filters?.dataType === 'webmedia' ? 'webmedia' : intent.filters?.dataType === 'weibo' ? 'weibo' : 'webmedia'
        const searchResult = await search({
          type: dataType,
          keyword: intent.filters?.keyword,
          sentiment: intent.filters?.sentiment,
        }, 1, 10)
        queryResult = {
          type: 'detail',
          data: {
            items: searchResult.data || [],
            total: searchResult.total || 0,
          },
          filters: intent.filters,
        }
      } else if (intent.type === 'trend') {
        // 趋势分析
        let dateRange: { start: string; end: string }
        if (intent.filters?.date && typeof intent.filters.date === 'string' && intent.filters.date.includes('-')) {
          // 具体日期格式：YYYY-MM-DD
          const specificDate = dayjs(intent.filters.date)
          dateRange = {
            start: specificDate.startOf('day').toISOString(),
            end: specificDate.endOf('day').toISOString(),
          }
        } else {
          dateRange = parseDateRange(intent.filters?.date as 'today' | 'yesterday' | 'week' | 'month' || 'today')
        }
        const dataType = intent.filters?.dataType === 'webmedia' ? 'webmedia' : intent.filters?.dataType === 'weibo' ? 'weibo' : 'webmedia'
        const searchResult = await search({
          type: dataType,
          startTime: dateRange.start,
          endTime: dateRange.end,
        }, 1, 1000)
        queryResult = {
          type: 'trend',
          data: {
            items: searchResult.data || [],
            total: searchResult.total || 0,
          },
          filters: intent.filters,
        }
      }
      
      // 3. 生成自然语言回复
      const response = await generateResponse(message, queryResult, history)
      
      return {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error('聊天引擎错误:', error)
      return {
        role: 'assistant',
        content: '抱歉，处理您的请求时出现了错误。请稍后重试。',
        timestamp: new Date().toISOString(),
      }
    }
  }
  
  /**
   * 解析用户意图
   */
  async function parseIntent(message: string): Promise<{
    type: 'stats' | 'detail' | 'trend'
    filters?: {
      date?: 'today' | 'yesterday' | 'week' | 'month' | string // 支持具体日期字符串
      dataType?: 'webmedia' | 'weibo' | 'all'
      keyword?: string
      sentiment?: 'positive' | 'neutral' | 'negative'
    }
  }> {
    // 简单的关键词匹配（可以后续改为AI解析）
    const lowerMessage = message.toLowerCase()
    
    // 判断查询类型
    let type: 'stats' | 'detail' | 'trend' = 'stats'
    if (lowerMessage.includes('趋势') || lowerMessage.includes('变化')) {
      type = 'trend'
    } else if (lowerMessage.includes('详情') || lowerMessage.includes('具体')) {
      type = 'detail'
    }
    
    // 解析日期 - 支持具体日期（如：11月7号、11月7日、2024-11-07等）
    let date: 'today' | 'yesterday' | 'week' | 'month' | string | undefined
    
    // 先尝试解析具体日期
    const datePatterns = [
      /(\d{1,2})月(\d{1,2})[号日]/g,  // 11月7号、11月7日
      /(\d{4})[年-](\d{1,2})[月-](\d{1,2})[号日]?/g,  // 2024年11月7日、2024-11-07
      /(\d{1,2})\/(\d{1,2})/g,  // 11/7
    ]
    
    let specificDate: string | undefined
    for (const pattern of datePatterns) {
      const match = message.match(pattern)
      if (match) {
        const dateStr = match[0]
        // 尝试解析为具体日期
        try {
          let parsedDate: dayjs.Dayjs | null = null
          if (dateStr.includes('月') && dateStr.includes('号')) {
            // 11月7号格式
            const parts = dateStr.match(/(\d{1,2})月(\d{1,2})号/)
            if (parts) {
              const month = parseInt(parts[1])
              const day = parseInt(parts[2])
              const year = dayjs().year() // 使用当前年份
              parsedDate = dayjs(`${year}-${month}-${day}`)
            }
          } else if (dateStr.includes('-')) {
            // 2024-11-07格式
            parsedDate = dayjs(dateStr)
          }
          
          if (parsedDate && parsedDate.isValid()) {
            specificDate = parsedDate.format('YYYY-MM-DD')
            break
          }
        } catch (e) {
          // 解析失败，继续尝试其他格式
        }
      }
    }
    
    if (specificDate) {
      date = specificDate
    } else {
      // 解析相对日期
      if (lowerMessage.includes('今天') || lowerMessage.includes('今日')) {
        date = 'today'
      } else if (lowerMessage.includes('昨天') || lowerMessage.includes('昨日')) {
        date = 'yesterday'
      } else if (lowerMessage.includes('本周') || lowerMessage.includes('这周')) {
        date = 'week'
      } else if (lowerMessage.includes('本月') || lowerMessage.includes('这个月')) {
        date = 'month'
      }
    }
    
    // 解析数据类型
    let dataType: 'webmedia' | 'weibo' | 'all' | undefined
    if (lowerMessage.includes('网媒') || lowerMessage.includes('媒体')) {
      dataType = 'webmedia'
    } else if (lowerMessage.includes('微博')) {
      dataType = 'weibo'
    } else {
      dataType = 'all'
    }
    
    // 解析情感
    let sentiment: 'positive' | 'neutral' | 'negative' | undefined
    if (lowerMessage.includes('正面') || lowerMessage.includes('积极') || lowerMessage.includes('好评')) {
      sentiment = 'positive'
    } else if (lowerMessage.includes('负面') || lowerMessage.includes('消极') || lowerMessage.includes('差评')) {
      sentiment = 'negative'
    } else if (lowerMessage.includes('中性')) {
      sentiment = 'neutral'
    }
    
    // 提取关键词
    const keywordMatch = message.match(/[""](.+?)[""]|「(.+?)」|《(.+?)》/)
    const keyword = keywordMatch
      ? keywordMatch[1] || keywordMatch[2] || keywordMatch[3]
      : undefined
    
    return {
      type,
      filters: {
        date,
        dataType,
        keyword,
        sentiment,
      },
    }
  }
  
  /**
   * 解析日期范围
   */
  function parseDateRange(
    dateType: 'today' | 'yesterday' | 'week' | 'month'
  ): { start: string; end: string } {
    const now = dayjs()
    let start: dayjs.Dayjs
    let end: dayjs.Dayjs = now
    
    switch (dateType) {
      case 'today':
        start = now.startOf('day')
        break
      case 'yesterday':
        start = now.subtract(1, 'day').startOf('day')
        end = now.subtract(1, 'day').endOf('day')
        break
      case 'week':
        start = now.startOf('week')
        break
      case 'month':
        start = now.startOf('month')
        break
      default:
        start = now.startOf('day')
    }
    
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    }
  }
  
  /**
   * 生成自然语言回复
   */
  async function generateResponse(
    question: string,
    queryResult: any,
    history: ChatMessage[]
  ): Promise<string> {
    try {
      // 构建提示词
      let prompt = `用户问题：${question}\n\n`
      
      if (queryResult) {
        prompt += `查询结果：\n`
        if (queryResult.type === 'stats') {
          const stats = queryResult.data
          // 如果是指定日期的查询结果
          if (stats.items && Array.isArray(stats.items)) {
            const total = stats.total || stats.items.length
            const positive = stats.items.filter((item: any) => item.sentiment === 'positive').length
            const neutral = stats.items.filter((item: any) => item.sentiment === 'neutral').length
            const negative = stats.items.filter((item: any) => item.sentiment === 'negative').length
            prompt += `- 指定日期共有 ${total} 条数据\n`
            prompt += `- 正面：${positive} 条，中性：${neutral} 条，负面：${negative} 条\n`
          } else if (stats.webmedia && stats.weibos) {
            // 全局统计
            prompt += `- 网媒数据：正面 ${stats.webmedia.bySentiment?.positive || stats.webmedia.positive || 0} 条，中性 ${stats.webmedia.bySentiment?.neutral || stats.webmedia.neutral || 0} 条，负面 ${stats.webmedia.bySentiment?.negative || stats.webmedia.negative || 0} 条\n`
            prompt += `- 微博数据：正面 ${stats.weibos.bySentiment?.positive || stats.weibos.positive || 0} 条，中性 ${stats.weibos.bySentiment?.neutral || stats.weibos.neutral || 0} 条，负面 ${stats.weibos.bySentiment?.negative || stats.weibos.negative || 0} 条\n`
          }
        } else if (queryResult.type === 'detail') {
          const data = queryResult.data
          const items = data.items || data.data || []
          prompt += `找到 ${items.length} 条相关数据\n`
        } else if (queryResult.type === 'trend') {
          const data = queryResult.data
          const items = data.items || data.data || []
          prompt += `找到 ${items.length} 条数据用于趋势分析\n`
        }
      }
      
      prompt += `\n请用自然语言回答用户的问题，要求：\n`
      prompt += `1. 简洁明了，直接回答核心问题\n`
      prompt += `2. 如果涉及数据，请提供具体数字\n`
      prompt += `3. 可以适当提供分析和建议\n`
      prompt += `4. 使用友好的语气\n`
      
      // 调用AI生成回复
      const response = await analyzer.chat([{
        role: 'user',
        content: prompt,
        timestamp: new Date().toISOString(),
      }])
      return response || '抱歉，我无法回答您的问题。'
    } catch (error) {
      console.error('生成回复失败:', error)
      // 降级到简单回复
      return generateFallbackResponse(question, queryResult)
    }
  }
  
  /**
   * 生成降级回复
   */
  function generateFallbackResponse(question: string, queryResult: any): string {
    if (!queryResult) {
      return '抱歉，我无法理解您的问题。请尝试询问数据统计、趋势分析或具体数据详情。'
    }
    
    if (queryResult.type === 'stats') {
      const stats = queryResult.data
      const total = stats.webmedia.positive + stats.webmedia.neutral + stats.webmedia.negative +
        stats.weibos.positive + stats.weibos.neutral + stats.weibos.negative
      return `根据当前数据统计，共有 ${total} 条舆情数据。其中网媒数据 ${stats.webmedia.positive + stats.webmedia.neutral + stats.webmedia.negative} 条，微博数据 ${stats.weibos.positive + stats.weibos.neutral + stats.weibos.negative} 条。`
    }
    
    return '已为您查询到相关数据，请查看详细结果。'
  }
  
  return {
    sendMessage,
  }
}

