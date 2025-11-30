import type { WebMediaData, WeiboData, UnifiedData } from '@/interfaces/data'
import type { TopicCluster, EventCorrelation } from '@/interfaces/ai'

/**
 * 话题聚类分析
 */
export function clusterTopics(
  data: (WebMediaData | WeiboData | UnifiedData)[]
): TopicCluster[] {
  const topicMap = new Map<string, Array<{ id: string | number; type: 'webmedia' | 'weibo' }>>()

  // 按话题分组
  data.forEach((item) => {
    const topics = item.topics || []
    topics.forEach((topic) => {
      if (!topicMap.has(topic)) {
        topicMap.set(topic, [])
      }
      topicMap.get(topic)!.push({
        id: item.id!,
        type: ('type' in item ? item.type : ('title' in item ? 'webmedia' : 'weibo')) as 'webmedia' | 'weibo',
      })
    })
  })

  // 生成聚类结果
  const clusters: TopicCluster[] = []

  topicMap.forEach((items, topic) => {
    const topicItems = data.filter((item) => item.topics?.includes(topic))
    const sentiment = {
      positive: topicItems.filter((item) => item.sentiment === 'positive').length,
      neutral: topicItems.filter((item) => item.sentiment === 'neutral').length,
      negative: topicItems.filter((item) => item.sentiment === 'negative').length,
    }

    const times = topicItems.map((item) => new Date(item.publishTime).getTime()).sort()
    const keywords = new Set<string>()
    topicItems.forEach((item) => {
      const itemKeywords = item.keywords || item.aiKeywords || []
      itemKeywords.forEach((k) => keywords.add(k))
    })

    clusters.push({
      topic,
      items,
      keywords: Array.from(keywords).slice(0, 10),
      sentiment,
      timeRange: {
        start: times.length > 0 ? new Date(times[0]).toISOString() : '',
        end: times.length > 0 ? new Date(times[times.length - 1]).toISOString() : '',
      },
    })
  })

  return clusters.sort((a, b) => b.items.length - a.items.length)
}

/**
 * 事件关联分析（同一事件在不同数据源的传播）
 */
export function analyzeEventCorrelation(
  webmediaData: WebMediaData[],
  weiboData: WeiboData[],
  similarityThreshold: number = 0.3
): EventCorrelation[] {
  const correlations: EventCorrelation[] = []

  // 简单的关键词匹配算法（实际应该使用更复杂的语义相似度）
  webmediaData.forEach((wmItem) => {
    const wmKeywords = new Set(wmItem.keywords || wmItem.aiKeywords || [])
    if (wmKeywords.size === 0) return

    const relatedWeibos: Array<{ id: string | number; content: string; userName: string }> = []

    weiboData.forEach((wbItem) => {
      const wbKeywords = new Set(wbItem.keywords || wbItem.aiKeywords || [])
      if (wbKeywords.size === 0) return

      // 计算关键词重叠度
      const intersection = new Set([...wmKeywords].filter((k) => wbKeywords.has(k)))
      const union = new Set([...wmKeywords, ...wbKeywords])
      const similarity = intersection.size / union.size

      if (similarity >= similarityThreshold) {
        relatedWeibos.push({
          id: wbItem.id!,
          content: wbItem.content,
          userName: wbItem.userName,
        })
      }
    })

    if (relatedWeibos.length > 0) {
      const wmTime = new Date(wmItem.publishTime).getTime()
      const wbTimes = relatedWeibos.map((wb) => {
        const wbItem = weiboData.find((item) => item.id === wb.id)
        return wbItem ? new Date(wbItem.publishTime).getTime() : 0
      })

      const allTimes = [wmTime, ...wbTimes].filter((t) => t > 0).sort()

      correlations.push({
        event: wmItem.title || wmItem.content.substring(0, 50),
        webmediaItems: [
          {
            id: wmItem.id!,
            title: wmItem.title,
            content: wmItem.content,
          },
        ],
        weiboItems: relatedWeibos,
        correlationScore: relatedWeibos.length / (weiboData.length || 1),
        timeRange: {
          start: allTimes.length > 0 ? new Date(allTimes[0]).toISOString() : '',
          end: allTimes.length > 0 ? new Date(allTimes[allTimes.length - 1]).toISOString() : '',
        },
      })
    }
  })

  return correlations.sort((a, b) => b.correlationScore - a.correlationScore)
}

