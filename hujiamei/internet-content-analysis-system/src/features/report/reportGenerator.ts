import { db } from '@/db/indexedDB'
import { getStats } from '@/db/indexedDB'
import { createAIAnalyzer } from '@/ai/client'
import type { WebMediaData, WeiboData } from '@/interfaces/data'
import dayjs from 'dayjs'

/**
 * 报告类型
 */
export type ReportType = 'daily' | 'weekly' | 'monthly'

/**
 * 报告生成参数
 */
export interface ReportParams {
  type: ReportType
  date: string // ISO 8601 格式日期，如 '2025-11-06'
}

/**
 * 聚合数据接口
 */
interface AggregatedData {
  // 总量统计
  total: {
    count: number
    webmediaCount: number
    weiboCount: number
    webmediaRatio: number // 网媒占比（0-1）
    weiboRatio: number // 微博占比（0-1）
  }
  
  // 情感分布
  sentimentDist: {
    positive: number
    neutral: number
    negative: number
    negativeRate: number // 负面率（0-1）
  }
  
  // 热点话题（Top 10）
  topKeywords: Array<{
    keyword: string
    count: number
    weight: number
  }>
  
  // 预警事件
  alerts: Array<{
    id: string
    level: string
    title: string
    description: string
    triggeredAt: string
  }>
  
  // 环比数据（与前一个周期对比）
  comparison?: {
    totalChange: number // 百分比变化
    negativeChange: number // 负面舆情变化
  }
}

/**
 * 获取日期范围
 */
function getDateRange(type: ReportType, date: string): { start: string; end: string } {
  const targetDate = dayjs(date)
  
  switch (type) {
    case 'daily':
      return {
        start: targetDate.startOf('day').toISOString(),
        end: targetDate.endOf('day').toISOString(),
      }
    case 'weekly':
      return {
        start: targetDate.startOf('week').toISOString(),
        end: targetDate.endOf('week').toISOString(),
      }
    case 'monthly':
      return {
        start: targetDate.startOf('month').toISOString(),
        end: targetDate.endOf('month').toISOString(),
      }
  }
}

/**
 * 获取前一个周期的日期范围（用于环比）
 */
function getPreviousPeriodRange(type: ReportType, date: string): { start: string; end: string } | null {
  const targetDate = dayjs(date)
  
  switch (type) {
    case 'daily':
      return {
        start: targetDate.subtract(1, 'day').startOf('day').toISOString(),
        end: targetDate.subtract(1, 'day').endOf('day').toISOString(),
      }
    case 'weekly':
      return {
        start: targetDate.subtract(1, 'week').startOf('week').toISOString(),
        end: targetDate.subtract(1, 'week').endOf('week').toISOString(),
      }
    case 'monthly':
      return {
        start: targetDate.subtract(1, 'month').startOf('month').toISOString(),
        end: targetDate.subtract(1, 'month').endOf('month').toISOString(),
      }
  }
}

/**
 * 聚合数据
 */
async function aggregateData(params: ReportParams): Promise<AggregatedData> {
  const { type, date } = params
  const { start, end } = getDateRange(type, date)
  
  // 1. 获取所有数据
  const [webmediaAll, weiboAll] = await Promise.all([
    db.webmedia.toArray(),
    db.weibos.toArray(),
  ])
  
  // 2. 按时间范围过滤
  const webmediaInRange = webmediaAll.filter((item) => {
    const publishTime = item.publishTime
    return publishTime >= start && publishTime <= end
  })
  
  const weiboInRange = weiboAll.filter((item) => {
    const publishTime = item.publishTime
    return publishTime >= start && publishTime <= end
  })
  
  // 3. 总量统计
  const totalCount = webmediaInRange.length + weiboInRange.length
  const webmediaRatio = totalCount > 0 ? webmediaInRange.length / totalCount : 0
  const weiboRatio = totalCount > 0 ? weiboInRange.length / totalCount : 0
  
  // 4. 情感分布
  const allInRange = [...webmediaInRange, ...weiboInRange]
  const positive = allInRange.filter((d) => d.sentiment === 'positive').length
  const neutral = allInRange.filter((d) => d.sentiment === 'neutral').length
  const negative = allInRange.filter((d) => d.sentiment === 'negative').length
  const negativeRate = totalCount > 0 ? negative / totalCount : 0
  
  // 5. 热点话题（从 keywords, aiKeywords, topics 中提取）
  const keywordMap = new Map<string, { count: number; weight: number }>()
  
  allInRange.forEach((item) => {
    // 优先使用 aiKeywords，其次 keywords，最后 topics
    const keywords = item.aiKeywords || item.keywords || item.topics || []
    
    keywords.forEach((kw) => {
      if (kw && kw.length >= 2) {
        const existing = keywordMap.get(kw)
        if (existing) {
          existing.count++
          existing.weight = Math.max(existing.weight, 0.8) // 出现多次，权重提高
        } else {
          keywordMap.set(kw, { count: 1, weight: 0.5 })
        }
      }
    })
  })
  
  // 转换为数组并排序
  const topKeywords = Array.from(keywordMap.entries())
    .map(([keyword, data]) => ({
      keyword,
      count: data.count,
      weight: data.weight,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
  
  // 6. 预警事件（直接从数据库获取，避免 Pinia store 依赖）
  const alertsAll = await db.alerts.toArray()
  const alertsInRange = alertsAll.filter((alert) => {
    const triggeredAt = alert.triggeredAt
    return triggeredAt >= start && triggeredAt <= end
  })
  
  const alertList = alertsInRange.map((alert) => ({
    id: alert.id,
    level: alert.level,
    title: alert.title,
    description: alert.description,
    triggeredAt: alert.triggeredAt,
  }))
  
  // 7. 环比数据（可选）
  let comparison: { totalChange: number; negativeChange: number } | undefined
  
  const previousRange = getPreviousPeriodRange(type, date)
  if (previousRange) {
    const [prevWebmedia, prevWeibo] = await Promise.all([
      db.webmedia
        .where('publishTime')
        .between(previousRange.start, previousRange.end, true, true)
        .toArray(),
      db.weibos
        .where('publishTime')
        .between(previousRange.start, previousRange.end, true, true)
        .toArray(),
    ])
    
    const prevTotal = prevWebmedia.length + prevWeibo.length
    const prevNegative = [...prevWebmedia, ...prevWeibo].filter(
      (d) => d.sentiment === 'negative'
    ).length
    
    const totalChange = prevTotal > 0 ? ((totalCount - prevTotal) / prevTotal) * 100 : 0
    const negativeChange = prevNegative > 0 ? ((negative - prevNegative) / prevNegative) * 100 : 0
    
    comparison = {
      totalChange: Math.round(totalChange * 100) / 100,
      negativeChange: Math.round(negativeChange * 100) / 100,
    }
  }
  
  return {
    total: {
      count: totalCount,
      webmediaCount: webmediaInRange.length,
      weiboCount: weiboInRange.length,
      webmediaRatio,
      weiboRatio,
    },
    sentimentDist: {
      positive,
      neutral,
      negative,
      negativeRate,
    },
    topKeywords,
    alerts: alertList,
    comparison,
  }
}

/**
 * 格式化数据为提示文本
 */
function formatDataForPrompt(data: AggregatedData, type: ReportType, date: string): string {
  const typeName = type === 'daily' ? '日报' : type === 'weekly' ? '周报' : '月报'
  
  let prompt = `【${typeName}数据汇总】\n\n`
  
  // 1. 数据概览
  prompt += `📊 数据概览：\n`
  prompt += `- 总量：${data.total.count} 条\n`
  prompt += `- 网媒：${data.total.webmediaCount} 条（${(data.total.webmediaRatio * 100).toFixed(1)}%）\n`
  prompt += `- 微博：${data.total.weiboCount} 条（${(data.total.weiboRatio * 100).toFixed(1)}%）\n`
  if (data.comparison) {
    const changeSymbol = data.comparison.totalChange >= 0 ? '+' : ''
    prompt += `- 环比：${changeSymbol}${data.comparison.totalChange.toFixed(1)}%\n`
  }
  prompt += `\n`
  
  // 2. 情感分析
  prompt += `😐 情感分析：\n`
  prompt += `- 正面：${data.sentimentDist.positive} 条\n`
  prompt += `- 中性：${data.sentimentDist.neutral} 条\n`
  prompt += `- 负面：${data.sentimentDist.negative} 条\n`
  prompt += `- 负面率：${(data.sentimentDist.negativeRate * 100).toFixed(1)}%\n`
  if (data.comparison) {
    const changeSymbol = data.comparison.negativeChange >= 0 ? '+' : ''
    prompt += `- 负面舆情变化：${changeSymbol}${data.comparison.negativeChange.toFixed(1)}%\n`
  }
  prompt += `\n`
  
  // 3. 热点话题
  prompt += `🔥 热点话题（Top 10）：\n`
  if (data.topKeywords.length > 0) {
    data.topKeywords.forEach((kw, index) => {
      prompt += `${index + 1}. ${kw.keyword}（出现 ${kw.count} 次）\n`
    })
  } else {
    prompt += `暂无热点话题数据\n`
  }
  prompt += `\n`
  
  // 4. 预警事件
  prompt += `⚠️ 预警事件：\n`
  if (data.alerts.length > 0) {
    data.alerts.forEach((alert, index) => {
      prompt += `${index + 1}. [${alert.level}] ${alert.title}：${alert.description}\n`
    })
  } else {
    prompt += `本期无预警事件\n`
  }
  prompt += `\n`
  
  return prompt
}

/**
 * 加载报告提示模板
 */
async function loadReportPrompt(): Promise<string> {
  try {
    // 尝试从文件加载
    const response = await fetch('/src/ai/prompts/report_prompt.txt')
    if (response.ok) {
      let template = await response.text()
      // 替换占位符
      template = template.replace(/\$\{type\}/g, '{type}')
      template = template.replace(/\$\{date\}/g, '{date}')
      return template
    }
  } catch (error) {
    console.warn('无法加载报告提示模板，使用默认模板:', error)
  }
  
  // 默认模板
  return `你是一名舆情分析师，请生成 {type} 报告（{date}）：

【必须包含】

1. 📊 数据概览：总量、环比、数据源占比

2. 😐 情感分析：负面率、主要诱因（200字内）

3. 🔥 热点话题：Top3 话题 + 关联事件

4. ⚠️ 预警事件：高危事件摘要

5. 💡 建议：3 条 actionable 建议

【输出】纯 Markdown，无代码块`
}

/**
 * 生成报告
 */
export async function generateReport(params: ReportParams): Promise<string> {
  const { type, date } = params
  
  // 1. 聚合数据
  const aggregatedData = await aggregateData(params)
  
  // 2. 格式化数据为提示文本
  const dataText = formatDataForPrompt(aggregatedData, type, date)
  
  // 3. 加载提示模板
  const template = await loadReportPrompt()
  
  // 4. 构建完整提示
  const typeName = type === 'daily' ? '日报' : type === 'weekly' ? '周报' : '月报'
  let prompt = template.replace('{type}', typeName).replace('{date}', date)
  prompt += `\n\n${dataText}`
  
  // 5. 调用 AI 生成报告
  try {
    const response = await generateReportWithAPI(prompt)
    
    // 6. 清理响应（移除可能的代码块标记）
    let report = response.trim()
    
    // 移除 markdown 代码块标记
    if (report.startsWith('```markdown')) {
      report = report.replace(/^```markdown\s*/, '').replace(/\s*```$/, '')
    } else if (report.startsWith('```')) {
      report = report.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    // 确保是纯 Markdown 格式
    return report.trim()
  } catch (error) {
    console.error('生成报告失败:', error)
    // 降级方案：返回基础报告
    return generateFallbackReport(aggregatedData, typeName, date)
  }
}

/**
 * 使用 API 生成报告（直接调用）
 */
async function generateReportWithAPI(prompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_QWEN_API_KEY || 'sk-b48c6eb1c32242af82e89ee7582c66e9'
  // 使用代理路径避免 CORS 问题
  const apiUrl = import.meta.env.DEV 
    ? '/api/dashscope' // 开发环境使用代理
    : 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation' // 生产环境直接调用
  const model = 'qwen-turbo'
  
  const axios = (await import('axios')).default
  
  try {
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
          max_tokens: 3000,
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
  } catch (error) {
    console.error('API 调用失败:', error)
    throw error
  }
}

/**
 * 生成降级报告（当 AI 调用失败时）
 */
function generateFallbackReport(
  data: AggregatedData,
  typeName: string,
  date: string
): string {
  return `# ${typeName}报告（${date}）

## 📊 数据概览

- **总量**：${data.total.count} 条
- **网媒**：${data.total.webmediaCount} 条（${(data.total.webmediaRatio * 100).toFixed(1)}%）
- **微博**：${data.total.weiboCount} 条（${(data.total.weiboRatio * 100).toFixed(1)}%）
${data.comparison ? `- **环比变化**：${data.comparison.totalChange >= 0 ? '+' : ''}${data.comparison.totalChange.toFixed(1)}%` : ''}

## 😐 情感分析

- **正面**：${data.sentimentDist.positive} 条
- **中性**：${data.sentimentDist.neutral} 条
- **负面**：${data.sentimentDist.negative} 条
- **负面率**：${(data.sentimentDist.negativeRate * 100).toFixed(1)}%
${data.comparison ? `- **负面舆情变化**：${data.comparison.negativeChange >= 0 ? '+' : ''}${data.comparison.negativeChange.toFixed(1)}%` : ''}

## 🔥 热点话题

${data.topKeywords.length > 0
  ? data.topKeywords
      .slice(0, 3)
      .map((kw, index) => `${index + 1}. **${kw.keyword}**（出现 ${kw.count} 次）`)
      .join('\n')
  : '暂无热点话题数据'}

## ⚠️ 预警事件

${data.alerts.length > 0
  ? data.alerts
      .map((alert, index) => `${index + 1.} **[${alert.level}]** ${alert.title}：${alert.description}`)
      .join('\n')
  : '本期无预警事件'}

## 💡 建议

1. 持续监控负面舆情变化趋势
2. 重点关注热点话题的传播路径
3. 及时处理高危预警事件

---
*报告生成时间：${new Date().toISOString()}*
`
}

