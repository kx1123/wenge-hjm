import type { WebMediaData, WeiboData, UnifiedData } from '@/interfaces/data'
import type { KeywordStats, HotWordAnalysis } from '@/interfaces/ai'

/**
 * 统计关键词词频
 */
export function countKeywords(
  data: (WebMediaData | WeiboData | UnifiedData)[]
): KeywordStats[] {
  const keywordMap = new Map<string, number>()

  data.forEach((item) => {
    const keywords = item.keywords || item.aiKeywords || []
    keywords.forEach((keyword) => {
      if (keyword && keyword.trim()) {
        const key = keyword.trim()
        keywordMap.set(key, (keywordMap.get(key) || 0) + 1)
      }
    })
  })

  const total = keywordMap.size > 0 ? Array.from(keywordMap.values()).reduce((a, b) => a + b, 0) : 1

  return Array.from(keywordMap.entries())
    .map(([keyword, count]) => ({
      keyword,
      count,
      frequency: count / total,
    }))
    .sort((a, b) => b.count - a.count)
}

/**
 * 获取热词分析结果
 */
export function getHotWordAnalysis(
  data: (WebMediaData | WeiboData | UnifiedData)[],
  topN: number = 20
): HotWordAnalysis {
  const stats = countKeywords(data)
  const topKeywords = stats.slice(0, topN).map((s) => s.keyword)

  // 生成词云数据格式
  const wordCloud = stats.slice(0, topN).map((s) => ({
    word: s.keyword,
    value: s.count,
  }))

  return {
    keywords: stats,
    topKeywords,
    wordCloud,
  }
}

/**
 * 分析关键词趋势（时间维度）
 */
export function analyzeKeywordTrend(
  data: (WebMediaData | WeiboData | UnifiedData)[],
  keyword: string,
  timeRange: { start: string; end: string },
  intervals: number = 7
): Array<{ time: string; count: number }> {
  const startTime = new Date(timeRange.start).getTime()
  const endTime = new Date(timeRange.end).getTime()
  const interval = (endTime - startTime) / intervals

  const result: Array<{ time: string; count: number }> = []

  for (let i = 0; i < intervals; i++) {
    const intervalStart = startTime + i * interval
    const intervalEnd = startTime + (i + 1) * interval

    const count = data.filter((item) => {
      const itemTime = new Date(item.publishTime).getTime()
      const keywords = item.keywords || item.aiKeywords || []
      return (
        itemTime >= intervalStart &&
        itemTime < intervalEnd &&
        keywords.some((k) => k.includes(keyword))
      )
    }).length

    result.push({
      time: new Date(intervalStart).toISOString().substring(0, 10),
      count,
    })
  }

  return result
}

/**
 * 对比分析网媒和微博的热词
 */
export function compareHotWords(
  webmediaData: WebMediaData[],
  weiboData: WeiboData[]
): {
  webmedia: HotWordAnalysis
  weibo: HotWordAnalysis
  common: string[] // 共同热词
  unique: {
    webmedia: string[] // 网媒独有热词
    weibo: string[] // 微博独有热词
  }
} {
  const webmediaAnalysis = getHotWordAnalysis(webmediaData)
  const weiboAnalysis = getHotWordAnalysis(weiboData)

  const webmediaSet = new Set(webmediaAnalysis.topKeywords)
  const weiboSet = new Set(weiboAnalysis.topKeywords)

  const common = webmediaAnalysis.topKeywords.filter((k) => weiboSet.has(k))
  const webmediaUnique = webmediaAnalysis.topKeywords.filter((k) => !weiboSet.has(k))
  const weiboUnique = weiboAnalysis.topKeywords.filter((k) => !webmediaSet.has(k))

  return {
    webmedia: webmediaAnalysis,
    weibo: weiboAnalysis,
    common,
    unique: {
      webmedia: webmediaUnique,
      weibo: weiboUnique,
    },
  }
}

