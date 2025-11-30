import { search } from '@/db/indexedDB'
import { createAIAnalyzer } from '@/ai/client'
import dayjs from 'dayjs'

export type ReportType = 'daily' | 'weekly' | 'monthly'

export interface ReportOptions {
  type: ReportType
  date: string // YYYY-MM-DD
}

/**
 * 生成报告
 */
export async function generateReport(options: ReportOptions): Promise<string> {
  try {
    // 1. 聚合数据
    const aggregatedData = await aggregateData(options)
    
    // 2. 格式化数据用于AI提示词
    const dataText = formatDataForPrompt(aggregatedData)
    
    // 3. 加载报告提示词模板
    const prompt = await loadReportPrompt(options.type, options.date, dataText)
    
    // 4. 调用AI生成报告
    const report = await generateReportWithAPI(prompt)
    
    return report
  } catch (error) {
    console.error('生成报告失败:', error)
    // 降级到基础报告
    return generateFallbackReport(options)
  }
}

/**
 * 聚合数据
 */
async function aggregateData(options: ReportOptions) {
  const date = dayjs(options.date)
  let startDate: dayjs.Dayjs
  let endDate: dayjs.Dayjs = date.endOf('day')
  
  switch (options.type) {
    case 'daily':
      startDate = date.startOf('day')
      break
    case 'weekly':
      startDate = date.startOf('week')
      endDate = date.endOf('week')
      break
    case 'monthly':
      startDate = date.startOf('month')
      endDate = date.endOf('month')
      break
  }
  
  // 查询数据
  const [webmediaResults, weiboResults] = await Promise.all([
    search({
      type: 'webmedia',
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
    }, 1, 10000),
    search({
      type: 'weibo',
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
    }, 1, 10000),
  ])
  
  const webmediaData = webmediaResults.data as any[]
  const weiboData = weiboResults.data as any[]
  
  // 统计情感分布
  const webmediaSentiment = {
    positive: webmediaData.filter(d => d.sentiment === 'positive').length,
    neutral: webmediaData.filter(d => d.sentiment === 'neutral').length,
    negative: webmediaData.filter(d => d.sentiment === 'negative').length,
  }
  
  const weiboSentiment = {
    positive: weiboData.filter(d => d.sentiment === 'positive').length,
    neutral: weiboData.filter(d => d.sentiment === 'neutral').length,
    negative: weiboData.filter(d => d.sentiment === 'negative').length,
  }
  
  // 提取关键词
  const allKeywords: string[] = []
  webmediaData.forEach(d => {
    if (d.aiKeywords) allKeywords.push(...d.aiKeywords)
  })
  weiboData.forEach(d => {
    if (d.aiKeywords) allKeywords.push(...d.aiKeywords)
  })
  
  const keywordCounts = new Map<string, number>()
  allKeywords.forEach(k => {
    keywordCounts.set(k, (keywordCounts.get(k) || 0) + 1)
  })
  
  const topKeywords = Array.from(keywordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword]) => keyword)
  
  return {
    type: options.type,
    date: options.date,
    startDate: startDate.format('YYYY-MM-DD'),
    endDate: endDate.format('YYYY-MM-DD'),
    webmedia: {
      total: webmediaData.length,
      sentiment: webmediaSentiment,
    },
    weibo: {
      total: weiboData.length,
      sentiment: weiboSentiment,
    },
    topKeywords,
  }
}

/**
 * 格式化数据用于提示词
 */
function formatDataForPrompt(data: any): string {
  return `
【数据统计】
- 时间范围：${data.startDate} 至 ${data.endDate}
- 网媒数据：共 ${data.webmedia.total} 条
  * 正面：${data.webmedia.sentiment.positive} 条
  * 中性：${data.webmedia.sentiment.neutral} 条
  * 负面：${data.webmedia.sentiment.negative} 条
- 微博数据：共 ${data.weibo.total} 条
  * 正面：${data.weibo.sentiment.positive} 条
  * 中性：${data.weibo.sentiment.neutral} 条
  * 负面：${data.weibo.sentiment.negative} 条
- 热门关键词：${data.topKeywords.join('、')}
`
}

/**
 * 加载报告提示词
 */
async function loadReportPrompt(type: ReportType, date: string, dataText: string): Promise<string> {
  const typeMap = {
    daily: '日报',
    weekly: '周报',
    monthly: '月报',
  }
  
  return `你是一名专业的舆情分析专家，请根据以下数据生成一份${typeMap[type]}。

${dataText}

【报告要求】
1. 使用Markdown格式
2. 包含以下章节：
   - 数据概览
   - 情感分析
   - 热门话题
   - 趋势洞察
   - 建议措施
3. 语言专业、简洁、有洞察力
4. 字数控制在800-1200字

请开始生成报告：`
}

/**
 * 调用AI生成报告
 */
async function generateReportWithAPI(prompt: string): Promise<string> {
  try {
    const analyzer = createAIAnalyzer({ mock: false })
    
    // 使用通义千问API
    const apiUrl = import.meta.env.VITE_AI_MOCK === 'true'
      ? undefined
      : 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
    
    if (!apiUrl) {
      // Mock模式
      return generateFallbackReport({ type: 'daily', date: dayjs().format('YYYY-MM-DD') })
    }
    
    const apiKey = import.meta.env.VITE_QWEN_API_KEY || 'sk-b48c6eb1c32242af82e89ee7582c66e9'
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-SSE': 'disable',
      },
      body: JSON.stringify({
        model: 'qwen-turbo',
        input: {
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        parameters: {
          temperature: 0.7,
          max_tokens: 2000,
        },
      }),
    })
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.statusText}`)
    }
    
    const result = await response.json()
    const content = result.output?.choices?.[0]?.message?.content || result.output?.text || ''
    
    if (!content) {
      throw new Error('AI返回内容为空')
    }
    
    return content
  } catch (error) {
    console.error('AI生成报告失败:', error)
    throw error
  }
}

/**
 * 生成降级报告
 */
function generateFallbackReport(options: ReportOptions): string {
  const typeMap = {
    daily: '日报',
    weekly: '周报',
    monthly: '月报',
  }
  
  return `# ${typeMap[options.type]} - ${options.date}

## 数据概览

本${typeMap[options.type]}统计了 ${options.date} 的舆情数据。

## 情感分析

数据正在分析中，请稍后查看详细报告。

## 热门话题

暂无数据。

## 趋势洞察

数据正在分析中。

## 建议措施

1. 持续关注舆情动态
2. 及时响应负面舆情
3. 加强正面宣传
`
}

