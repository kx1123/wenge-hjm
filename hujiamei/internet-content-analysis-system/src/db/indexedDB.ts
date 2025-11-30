import Dexie, { type Table } from 'dexie'
import type { WebMediaData, WeiboData, DataSource } from '@/interfaces/data'
import type { AlertRecord, AlertRule } from '@/interfaces/alert'

/**
 * AI缓存接口
 */
export interface AICache {
  id?: number
  cacheKey: string // `${hash(content)}_${dataType}_${promptVersion}`
  dataType: 'webmedia' | 'weibo'
  promptType: 'sentiment' | 'keywords' | 'summary' | 'category' | 'topic' | 'full'
  promptVersion: string
  result: string // JSON stringified result
  createdAt: string
  expiresAt: string
}

/**
 * IndexedDB数据库类
 */
class ContentAnalysisDB extends Dexie {
  webmedia!: Table<WebMediaData, number>
  weibos!: Table<WeiboData, number>
  aiCache!: Table<AICache, number>
  alerts!: Table<AlertEvent, string>
  alertRules!: Table<AlertRule, string>

  constructor() {
    super('ContentAnalysisDB')
    this.version(4).stores({
      // 表 webmedia：字段 + 索引 ['publishTime', 'sentiment', 'source']
      webmedia: '++id, publishTime, sentiment, source',
      // 表 weibos：字段 + 索引 ['publishTime', 'sentiment', 'userName']
      weibos: '++id, publishTime, sentiment, userName',
      // AI缓存表：key = `${hash(content)}_${dataType}_${promptVersion}`
      aiCache: '++id, cacheKey, dataType, promptType, expiresAt',
      // 预警记录表：id 为字符串，索引 triggeredAt, level, status, ruleId
      alerts: 'id, triggeredAt, level, status, ruleId',
      // 预警规则表：id 为字符串，索引 type, enabled
      alertRules: 'id, type, enabled',
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
    // 移除 id 字段，让 Dexie 自动生成 number 类型的主键
    const dataWithoutId = data.map(({ id, ...rest }) => rest)
    return await db.webmedia.bulkAdd(dataWithoutId)
  } catch (error) {
    // 如果存在重复键，使用 bulkPut
    if (error instanceof Error && error.name === 'ConstraintError') {
      const dataWithoutId = data.map(({ id, ...rest }) => rest)
      return await db.webmedia.bulkPut(dataWithoutId)
    }
    throw error
  }
}

/**
 * 批量插入微博数据
 */
export async function insertWeibos(data: WeiboData[]): Promise<number[]> {
  try {
    // 移除 id 字段，让 Dexie 自动生成 number 类型的主键
    const dataWithoutId = data.map(({ id, ...rest }) => rest)
    return await db.weibos.bulkAdd(dataWithoutId)
  } catch (error) {
    // 如果存在重复键，使用 bulkPut
    if (error instanceof Error && error.name === 'ConstraintError') {
      const dataWithoutId = data.map(({ id, ...rest }) => rest)
      return await db.weibos.bulkPut(dataWithoutId)
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
 * 将 id 转换为 number 类型（用于 Dexie 主键）
 * Dexie 主键必须是 number 类型，所以需要确保 id 是有效的数字
 */
function normalizeId(id: string | number | undefined | null): number | null {
  if (id === undefined || id === null) {
    return null
  }
  
  // 如果已经是 number 类型，直接验证并返回
  if (typeof id === 'number') {
    // Dexie 主键必须是正整数
    if (isNaN(id) || !isFinite(id) || id <= 0 || !Number.isInteger(id)) {
      console.warn('Invalid numeric id:', id)
      return null
    }
    return id
  }
  
  // 如果是字符串，尝试解析
  if (typeof id === 'string') {
    // 先尝试直接解析（处理纯数字字符串）
    const directNum = parseInt(id, 10)
    if (!isNaN(directNum) && isFinite(directNum) && directNum > 0 && Number.isInteger(directNum)) {
      return directNum
    }
    
    // 尝试提取数字部分（处理 "WM123" 或 "WB123" 格式）
    const match = id.match(/\d+/)
    if (match) {
      const num = parseInt(match[0], 10)
      if (!isNaN(num) && isFinite(num) && num > 0 && Number.isInteger(num)) {
        return num
      }
    }
    
    console.warn('Cannot parse string id to number:', id)
    return null
  }
  
  console.warn('Unknown id type:', typeof id, id)
  return null
}

/**
 * 更新网媒数据（用于AI分析结果）
 */
export async function updateWebMediaData(
  id: string | number | undefined | null,
  updates: Partial<WebMediaData>
): Promise<number> {
  const numericId = normalizeId(id)
  
  if (numericId === null) {
    throw new Error(`Invalid id: ${id}. Expected number or numeric string.`)
  }
  
  try {
    return await db.webmedia.update(numericId, updates)
  } catch (error) {
    console.error('更新网媒数据失败:', { id, numericId, error })
    throw error
  }
}

/**
 * 更新微博数据（用于AI分析结果）
 */
export async function updateWeiboData(
  id: string | number | undefined | null,
  updates: Partial<WeiboData>
): Promise<number> {
  const numericId = normalizeId(id)
  
  if (numericId === null) {
    throw new Error(`Invalid id: ${id}. Expected number or numeric string.`)
  }
  
  try {
    return await db.weibos.update(numericId, updates)
  } catch (error) {
    console.error('更新微博数据失败:', { id, numericId, error })
    throw error
  }
}

/**
 * 获取未分析的网媒数据
 */
export async function getUnanalyzedWebMedia(limit?: number): Promise<WebMediaData[]> {
  const data = await db.webmedia
    .where('sentiment')
    .equals(undefined)
    .limit(limit || 100)
    .toArray()
  // 确保所有数据的 id 都是 number 类型（Dexie 主键始终是 number）
  return data.map((item) => {
    // Dexie 返回的数据，id 应该已经是 number 类型
    // 但为了安全，我们确保它是 number
    let id: number
    if (typeof item.id === 'number') {
      id = item.id
    } else if (typeof item.id === 'string') {
      const parsed = normalizeId(item.id)
      if (parsed === null) {
        console.warn('无法解析 id，跳过该数据:', item.id)
        return null
      }
      id = parsed
    } else {
      console.warn('无效的 id 类型，跳过该数据:', item.id)
      return null
    }
    return {
      ...item,
      id,
    }
  }).filter((item): item is WebMediaData => item !== null)
}

/**
 * 获取未分析的微博数据
 */
export async function getUnanalyzedWeibos(limit?: number): Promise<WeiboData[]> {
  const data = await db.weibos
    .where('sentiment')
    .equals(undefined)
    .limit(limit || 100)
    .toArray()
  // 确保所有数据的 id 都是 number 类型（Dexie 主键始终是 number）
  return data.map((item) => {
    // Dexie 返回的数据，id 应该已经是 number 类型
    // 但为了安全，我们确保它是 number
    let id: number
    if (typeof item.id === 'number') {
      id = item.id
    } else if (typeof item.id === 'string') {
      const parsed = normalizeId(item.id)
      if (parsed === null) {
        console.warn('无法解析 id，跳过该数据:', item.id)
        return null
      }
      id = parsed
    } else {
      console.warn('无效的 id 类型，跳过该数据:', item.id)
      return null
    }
    return {
      ...item,
      id,
    }
  }).filter((item): item is WeiboData => item !== null)
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
