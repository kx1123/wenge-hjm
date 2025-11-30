/**
 * 事件关联器
 * 从话题标签中提取事件ID，用于跨源关联
 */

import type { WebMediaData, WeiboData } from '@/interfaces/data'

/**
 * 从内容中提取话题标签（#xxx# 格式）
 */
export function extractTopicTags(content: string): string[] {
  const matches = content.match(/#([^#]+?)#/g)
  if (!matches) return []
  return matches.map((tag) => tag.slice(1, -1)) // 移除 # 号
}

/**
 * 生成事件ID
 * 格式：EVT_YYYYMMDD_topic
 * 例如：#令人心动的offer# → EVT_20251106_offer
 */
export function generateEventId(topic: string, publishTime?: string): string {
  // 清理话题名称（移除特殊字符，转为小写，取前20个字符）
  let cleanTopic = topic
    .replace(/[#【】\[\]()（）]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase()
    .slice(0, 20)

  // 如果话题包含常见事件关键词，提取关键词
  // 例如：「令人心动的offer」→ 「offer」
  const eventKeywords = ['offer', '面试', '招聘', '崩溃', '风景', '心动', '令人心动']
  for (const keyword of eventKeywords) {
    if (cleanTopic.includes(keyword.toLowerCase())) {
      cleanTopic = keyword.toLowerCase()
      break
    }
  }

  // 从发布时间提取日期，如果没有则使用当前日期
  let dateStr = 'YYYYMMDD'
  if (publishTime) {
    try {
      const date = new Date(publishTime)
      dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    } catch {
      dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    }
  } else {
    dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  }

  return `EVT_${dateStr}_${cleanTopic}`
}

/**
 * 从数据项中提取事件ID
 * 优先从话题标签中提取，如果没有则从关键词中生成
 */
export function extractEventId(item: WebMediaData | WeiboData): string | null {
  const content = 'title' in item ? `${item.title} ${item.content}` : item.content

  // 1. 从话题标签中提取（#xxx# 格式）
  const topicTags = extractTopicTags(content)
  if (topicTags.length > 0) {
    // 使用第一个话题标签生成事件ID
    return generateEventId(topicTags[0], item.publishTime)
  }

  // 2. 从 AI 分析的话题中提取
  if (item.topics && item.topics.length > 0) {
    // 查找包含常见事件关键词的话题
    const eventKeywords = ['offer', '面试', '招聘', '崩溃', '风景', '心动', '令人心动']
    const eventTopic = item.topics.find((topic) =>
      eventKeywords.some((keyword) => topic.toLowerCase().includes(keyword.toLowerCase()))
    )
    if (eventTopic) {
      return generateEventId(eventTopic, item.publishTime)
    }
    // 如果没有匹配，使用第一个话题
    return generateEventId(item.topics[0], item.publishTime)
  }

  // 3. 从关键词中提取（如果关键词包含明显的事件标识）
  const keywords = item.keywords || item.aiKeywords || []
  if (keywords.length > 0) {
    const eventKeywords = ['offer', '面试', '招聘', '崩溃', '风景', '心动', '令人心动']
    const eventKeyword = keywords.find((kw) =>
      eventKeywords.some((ek) => kw.toLowerCase().includes(ek.toLowerCase()))
    )
    if (eventKeyword) {
      return generateEventId(eventKeyword, item.publishTime)
    }
  }

  return null
}

/**
 * 批量提取事件ID并建立事件映射
 */
export function buildEventMap(
  webmediaData: WebMediaData[],
  weiboData: WeiboData[]
): Map<string, Array<{ type: 'webmedia' | 'weibo'; id: string | number }>> {
  const eventMap = new Map<string, Array<{ type: 'webmedia' | 'weibo'; id: string | number }>>()

  // 处理网媒数据
  webmediaData.forEach((item) => {
    const eventId = extractEventId(item)
    if (eventId) {
      if (!eventMap.has(eventId)) {
        eventMap.set(eventId, [])
      }
      eventMap.get(eventId)!.push({ type: 'webmedia', id: item.id! })
    }
  })

  // 处理微博数据
  weiboData.forEach((item) => {
    const eventId = extractEventId(item)
    if (eventId) {
      if (!eventMap.has(eventId)) {
        eventMap.set(eventId, [])
      }
      eventMap.get(eventId)!.push({ type: 'weibo', id: item.id! })
    }
  })

  return eventMap
}

