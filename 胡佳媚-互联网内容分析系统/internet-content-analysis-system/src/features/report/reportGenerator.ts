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
    try {
      const report = await generateReportWithAPI(prompt)
      return report
    } catch (apiError) {
      console.warn('AI API调用失败，使用降级报告:', apiError)
      // 如果 API 调用失败，使用基于数据的降级报告
      return generateFallbackReport(options, aggregatedData)
    }
  } catch (error) {
    console.error('生成报告失败:', error)
    // 最终降级到基础报告
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
async function loadReportPrompt(type: ReportType, _date: string, dataText: string): Promise<string> {
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
    // 默认使用 mock 模式避免 CORS 问题
    // 如果需要使用真实 API，请设置环境变量 VITE_AI_MOCK=false 并配置代理
    const useMock = import.meta.env.VITE_AI_MOCK !== 'false'
    const analyzer = createAIAnalyzer({ mock: useMock })
    
    if (useMock) {
      // Mock 模式下，生成基于数据的详细报告
      return generateMockReport(prompt)
    }
    
    // 使用 analyzer 的 chat 方法，它会自动处理错误
    const response = await analyzer.chat([
      {
        role: 'user',
        content: prompt,
        timestamp: new Date().toISOString(),
      },
    ])
    
    if (!response || response.trim().length === 0) {
      throw new Error('AI返回内容为空')
    }
    
    return response
  } catch (error) {
    console.error('AI生成报告失败:', error)
    // 如果 API 调用失败，返回降级报告
    throw error
  }
}

/**
 * 生成 Mock 模式的报告（基于实际数据）
 */
function generateMockReport(prompt: string): string {
  // 从 prompt 中提取数据信息
  const dataMatch = prompt.match(/网媒数据：共 (\d+) 条[\s\S]*?正面：(\d+) 条[\s\S]*?中性：(\d+) 条[\s\S]*?负面：(\d+) 条[\s\S]*?微博数据：共 (\d+) 条[\s\S]*?正面：(\d+) 条[\s\S]*?中性：(\d+) 条[\s\S]*?负面：(\d+) 条[\s\S]*?热门关键词：(.+)/)
  
  if (!dataMatch) {
    return generateFallbackReport({ type: 'daily', date: dayjs().format('YYYY-MM-DD') })
  }
  
  const [
    ,
    webmediaTotal,
    webmediaPositive,
    webmediaNeutral,
    webmediaNegative,
    weiboTotal,
    weiboPositive,
    weiboNeutral,
    weiboNegative,
    keywords,
  ] = dataMatch
  
  const total = parseInt(webmediaTotal) + parseInt(weiboTotal)
  const totalPositive = parseInt(webmediaPositive) + parseInt(weiboPositive)
  const totalNeutral = parseInt(webmediaNeutral) + parseInt(weiboNeutral)
  const totalNegative = parseInt(webmediaNegative) + parseInt(weiboNegative)
  
  const positiveRate = total > 0 ? ((totalPositive / total) * 100).toFixed(1) : '0'
  const negativeRate = total > 0 ? ((totalNegative / total) * 100).toFixed(1) : '0'
  
  // 判断报告类型
  const isWeekly = prompt.includes('周报')
  const isMonthly = prompt.includes('月报')
  const reportType = isWeekly ? '周报' : isMonthly ? '月报' : '日报'
  
  return `# ${reportType} - ${dayjs().format('YYYY-MM-DD')}

## 数据概览

本${reportType}统计了舆情数据，共收集到 **${total}** 条有效数据。

### 数据来源分布
- **网媒数据**：${webmediaTotal} 条
- **微博数据**：${weiboTotal} 条

### 情感分布
- **正面舆情**：${totalPositive} 条（${positiveRate}%）
- **中性舆情**：${totalNeutral} 条（${((totalNeutral / total) * 100).toFixed(1)}%）
- **负面舆情**：${totalNegative} 条（${negativeRate}%）

## 情感分析

### 整体情感趋势
${totalPositive > totalNegative ? '整体舆情以正面为主，' : totalNegative > totalPositive ? '整体舆情以负面为主，' : '整体舆情较为平衡，'}正面舆情占比 ${positiveRate}%，负面舆情占比 ${negativeRate}%。

### 数据源对比
- **网媒数据**：正面 ${webmediaPositive} 条，中性 ${webmediaNeutral} 条，负面 ${webmediaNegative} 条
- **微博数据**：正面 ${weiboPositive} 条，中性 ${weiboNeutral} 条，负面 ${weiboNegative} 条

## 热门话题

根据关键词分析，当前热门话题包括：${keywords || '暂无数据'}。

## 趋势洞察

${totalNegative > 50 ? '⚠️ **重点关注**：负面舆情数量较多，建议加强舆情监控和应对措施。' : ''}
${totalPositive > totalNegative * 2 ? '✅ **积极信号**：正面舆情占主导地位，整体舆情环境良好。' : ''}
${total > 1000 ? '📊 **数据规模**：数据量较大，建议进行更深入的细分分析。' : ''}

## 建议措施

1. **持续监控**：保持对舆情动态的实时关注，及时发现和处理异常情况。
${totalNegative > 30 ? '2. **负面应对**：针对负面舆情，制定相应的应对策略，及时回应和澄清。\n' : ''}3. **数据挖掘**：利用关键词和话题分析，深入挖掘舆情背后的趋势和规律。
4. **渠道优化**：根据网媒和微博的数据表现，优化不同渠道的舆情管理策略。
${totalPositive > totalNegative ? '5. **正面宣传**：继续保持和加强正面舆情的传播，提升品牌形象。' : '5. **形象修复**：加强正面宣传，积极回应负面舆情，修复和提升品牌形象。'}

---

*本报告基于当前数据生成，建议结合实际情况进行深入分析。*`
}

/**
 * 生成降级报告
 */
function generateFallbackReport(options: ReportOptions, aggregatedData?: any): string {
  const typeMap = {
    daily: '日报',
    weekly: '周报',
    monthly: '月报',
  }
  
  // 如果有聚合数据，生成更详细的报告
  if (aggregatedData) {
    const total = aggregatedData.webmedia.total + aggregatedData.weibo.total
    const totalPositive = aggregatedData.webmedia.sentiment.positive + aggregatedData.weibo.sentiment.positive
    const totalNeutral = aggregatedData.webmedia.sentiment.neutral + aggregatedData.weibo.sentiment.neutral
    const totalNegative = aggregatedData.webmedia.sentiment.negative + aggregatedData.weibo.sentiment.negative
    
    return `# ${typeMap[options.type]} - ${options.date}

## 数据概览

本${typeMap[options.type]}统计了 ${options.date} 的舆情数据，共收集到 **${total}** 条有效数据。

### 数据来源分布
- **网媒数据**：${aggregatedData.webmedia.total} 条
- **微博数据**：${aggregatedData.weibo.total} 条

### 情感分布
- **正面舆情**：${totalPositive} 条
- **中性舆情**：${totalNeutral} 条
- **负面舆情**：${totalNegative} 条

## 情感分析

整体舆情${totalPositive > totalNegative ? '以正面为主' : totalNegative > totalPositive ? '以负面为主' : '较为平衡'}。

## 热门话题

${aggregatedData.topKeywords && aggregatedData.topKeywords.length > 0 
  ? '热门关键词：' + aggregatedData.topKeywords.join('、')
  : '暂无数据'}

## 趋势洞察

数据统计完成，建议进行更深入的分析。

## 建议措施

1. 持续关注舆情动态
2. 及时响应负面舆情
3. 加强正面宣传
4. 利用关键词分析挖掘潜在趋势
`
  }
  
  // 基础降级报告
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

