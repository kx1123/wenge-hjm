import Dexie, { type Table } from 'dexie'
import type { WebMediaData, WeiboData, DataSource } from '@/interfaces/data'

/**
 * IndexedDB数据库类
 */
class ContentAnalysisDB extends Dexie {
  webmedia!: Table<WebMediaData, number>
  weibos!: Table<WeiboData, number>

  constructor() {
    super('ContentAnalysisDB')
    this.version(1).stores({
      // 表 webmedia：字段 + 索引 ['publishTime', 'sentiment', 'source']
      webmedia: '++id, publishTime, sentiment, source',
      // 表 weibos：字段 + 索引 ['publishTime', 'sentiment', 'userName']
      weibos: '++id, publishTime, sentiment, userName',
    })
  }
}

/**
 * 数据库实例
 */
export const db = new ContentAnalysisDB()

/**
 * 搜索参数接口
 */
export interface SearchParams {
  type: DataSource
  keyword?: string
  startTime?: string
  endTime?: string
  sentiment?: 'positive' | 'neutral' | 'negative'
  source?: string // 仅用于网媒
  userName?: string // 仅用于微博
}

/**
 * 搜索结果接口
 */
export interface SearchResult {
  data: (WebMediaData | WeiboData)[]
  total: number
  page: number
  size: number
}

/**
 * 统计数据接口
 */
export interface Stats {
  webmedia: {
    total: number
    analyzed: number
    unanalyzed: number
    bySentiment: {
      positive: number
      neutral: number
      negative: number
    }
  }
  weibos: {
    total: number
    analyzed: number
    unanalyzed: number
    bySentiment: {
      positive: number
      neutral: number
      negative: number
    }
  }
}

/**
 * 批量插入网媒数据
 */
export async function insertWebMedia(data: WebMediaData[]): Promise<number[]> {
  try {
    return await db.webmedia.bulkAdd(data)
  } catch (error) {
    // 如果存在重复键，使用 bulkPut
    if (error instanceof Error && error.name === 'ConstraintError') {
      return await db.webmedia.bulkPut(data)
    }
    throw error
  }
}

/**
 * 批量插入微博数据
 */
export async function insertWeibos(data: WeiboData[]): Promise<number[]> {
  try {
    return await db.weibos.bulkAdd(data)
  } catch (error) {
    // 如果存在重复键，使用 bulkPut
    if (error instanceof Error && error.name === 'ConstraintError') {
      return await db.weibos.bulkPut(data)
    }
    throw error
  }
}

/**
 * 获取统计数据
 */
export async function getStats(): Promise<Stats> {
  const [webmediaAll, weibosAll] = await Promise.all([
    db.webmedia.toArray(),
    db.weibos.toArray(),
  ])

  // 网媒统计
  const webmediaAnalyzed = webmediaAll.filter((d) => d.sentiment !== undefined)
  const webmediaBySentiment = {
    positive: webmediaAll.filter((d) => d.sentiment === 'positive').length,
    neutral: webmediaAll.filter((d) => d.sentiment === 'neutral').length,
    negative: webmediaAll.filter((d) => d.sentiment === 'negative').length,
  }

  // 微博统计
  const weibosAnalyzed = weibosAll.filter((d) => d.sentiment !== undefined)
  const weibosBySentiment = {
    positive: weibosAll.filter((d) => d.sentiment === 'positive').length,
    neutral: weibosAll.filter((d) => d.sentiment === 'neutral').length,
    negative: weibosAll.filter((d) => d.sentiment === 'negative').length,
  }

  return {
    webmedia: {
      total: webmediaAll.length,
      analyzed: webmediaAnalyzed.length,
      unanalyzed: webmediaAll.length - webmediaAnalyzed.length,
      bySentiment: webmediaBySentiment,
    },
    weibos: {
      total: weibosAll.length,
      analyzed: weibosAnalyzed.length,
      unanalyzed: weibosAll.length - weibosAnalyzed.length,
      bySentiment: weibosBySentiment,
    },
  }
}

/**
 * 搜索数据
 * @param params 搜索参数
 * @param page 页码（从1开始）
 * @param size 每页大小
 */
export async function search(
  params: SearchParams,
  page: number = 1,
  size: number = 20
): Promise<SearchResult> {
  const { type, keyword, startTime, endTime, sentiment, source, userName } = params

  if (type === 'webmedia') {
    // 网媒数据搜索
    let query = db.webmedia.toCollection()

    // 先获取所有数据，然后应用过滤条件
    let allData = await query.toArray()

    // 按时间范围过滤
    if (startTime || endTime) {
      allData = allData.filter((item) => {
        if (startTime && endTime) {
          return item.publishTime >= startTime && item.publishTime <= endTime
        }
        if (startTime) {
          return item.publishTime >= startTime
        }
        if (endTime) {
          return item.publishTime <= endTime
        }
        return true
      })
    }

    // 按情感过滤（使用索引）
    if (sentiment) {
      allData = allData.filter((item) => item.sentiment === sentiment)
    }

    // 按来源过滤（使用索引）
    if (source) {
      allData = allData.filter((item) => item.source.includes(source))
    }

    // 按关键词搜索
    if (keyword) {
      const searchText = keyword.toLowerCase()
      allData = allData.filter((item) => {
        return (
          item.title?.toLowerCase().includes(searchText) ||
          item.content?.toLowerCase().includes(searchText) ||
          item.tags?.toLowerCase().includes(searchText) ||
          item.keywords?.some((kw) => kw.toLowerCase().includes(searchText))
        )
      })
    }

    // 排序
    allData.sort((a, b) => {
      return b.publishTime.localeCompare(a.publishTime)
    })

    const total = allData.length

    // 分页
    const startIndex = (page - 1) * size
    const endIndex = startIndex + size
    const data = allData.slice(startIndex, endIndex)

    return {
      data,
      total,
      page,
      size,
    }
  } else {
    // 微博数据搜索
    let query = db.weibos.toCollection()

    // 先获取所有数据，然后应用过滤条件
    let allData = await query.toArray()

    // 按时间范围过滤
    if (startTime || endTime) {
      allData = allData.filter((item) => {
        if (startTime && endTime) {
          return item.publishTime >= startTime && item.publishTime <= endTime
        }
        if (startTime) {
          return item.publishTime >= startTime
        }
        if (endTime) {
          return item.publishTime <= endTime
        }
        return true
      })
    }

    // 按情感过滤（使用索引）
    if (sentiment) {
      allData = allData.filter((item) => item.sentiment === sentiment)
    }

    // 按用户名过滤（使用索引）
    if (userName) {
      allData = allData.filter((item) => item.userName.includes(userName))
    }

    // 按关键词搜索
    if (keyword) {
      const searchText = keyword.toLowerCase()
      allData = allData.filter((item) => {
        return (
          item.content?.toLowerCase().includes(searchText) ||
          item.keywords?.some((kw) => kw.toLowerCase().includes(searchText))
        )
      })
    }

    // 排序
    allData.sort((a, b) => {
      return b.publishTime.localeCompare(a.publishTime)
    })

    const total = allData.length

    // 分页
    const startIndex = (page - 1) * size
    const endIndex = startIndex + size
    const data = allData.slice(startIndex, endIndex)

    return {
      data,
      total,
      page,
      size,
    }
  }
}

// ========== 兼容旧方法的导出 ==========

/**
 * 批量添加网媒数据（兼容旧方法）
 * @deprecated 使用 insertWebMedia 代替
 */
export async function addWebMediaData(data: WebMediaData[]): Promise<number[]> {
  return insertWebMedia(data)
}

/**
 * 批量添加微博数据（兼容旧方法）
 * @deprecated 使用 insertWeibos 代替
 */
export async function addWeiboData(data: WeiboData[]): Promise<number[]> {
  return insertWeibos(data)
}

/**
 * 更新网媒数据（用于AI分析结果）
 */
export async function updateWebMediaData(
  id: number,
  updates: Partial<WebMediaData>
): Promise<number> {
  return await db.webmedia.update(id, updates)
}

/**
 * 更新微博数据（用于AI分析结果）
 */
export async function updateWeiboData(id: number, updates: Partial<WeiboData>): Promise<number> {
  return await db.weibos.update(id, updates)
}

/**
 * 获取未分析的网媒数据
 */
export async function getUnanalyzedWebMedia(limit?: number): Promise<WebMediaData[]> {
  return await db.webmedia
    .where('sentiment')
    .equals(undefined)
    .limit(limit || 100)
    .toArray()
}

/**
 * 获取未分析的微博数据
 */
export async function getUnanalyzedWeibos(limit?: number): Promise<WeiboData[]> {
  return await db.weibos
    .where('sentiment')
    .equals(undefined)
    .limit(limit || 100)
    .toArray()
}

/**
 * 获取随机未分析的数据（用于模拟实时）
 */
export async function getRandomUnanalyzedWebMedia(): Promise<WebMediaData | null> {
  const unanalyzed = await getUnanalyzedWebMedia(100)
  if (unanalyzed.length === 0) return null
  return unanalyzed[Math.floor(Math.random() * unanalyzed.length)]
}

export async function getRandomUnanalyzedWeibo(): Promise<WeiboData | null> {
  const unanalyzed = await getUnanalyzedWeibos(100)
  if (unanalyzed.length === 0) return null
  return unanalyzed[Math.floor(Math.random() * unanalyzed.length)]
}

/**
 * 按情感统计（兼容旧方法）
 * @deprecated 使用 getStats 代替
 */
export async function getSentimentStats(): Promise<{
  webmedia: { positive: number; neutral: number; negative: number }
  weibos: { positive: number; neutral: number; negative: number }
}> {
  const stats = await getStats()
  return {
    webmedia: stats.webmedia.bySentiment,
    weibos: stats.weibos.bySentiment,
  }
}

/**
 * 获取所有网媒数据（分页）
 */
export async function getAllWebMedia(
  page: number = 1,
  pageSize: number = 50
): Promise<{ data: WebMediaData[]; total: number }> {
  const result = await search({ type: 'webmedia' }, page, pageSize)
  return {
    data: result.data as WebMediaData[],
    total: result.total,
  }
}

/**
 * 获取所有网媒数据（不分页，获取全部）
 */
export async function getAllWebMediaAll(): Promise<WebMediaData[]> {
  return await db.webmedia.orderBy('publishTime').reverse().toArray()
}

/**
 * 获取所有微博数据（分页）
 */
export async function getAllWeibos(
  page: number = 1,
  pageSize: number = 50
): Promise<{ data: WeiboData[]; total: number }> {
  const result = await search({ type: 'weibo' }, page, pageSize)
  return {
    data: result.data as WeiboData[],
    total: result.total,
  }
}

/**
 * 获取所有微博数据（不分页，获取全部）
 */
export async function getAllWeibosAll(): Promise<WeiboData[]> {
  return await db.weibos.orderBy('publishTime').reverse().toArray()
}

/**
 * 清空网媒数据
 */
export async function clearWebMedia(): Promise<void> {
  await db.webmedia.clear()
}

/**
 * 清空微博数据
 */
export async function clearWeibos(): Promise<void> {
  await db.weibos.clear()
}

/**
 * 清空所有数据
 */
export async function clearAll(): Promise<void> {
  await Promise.all([db.webmedia.clear(), db.weibos.clear()])
}
