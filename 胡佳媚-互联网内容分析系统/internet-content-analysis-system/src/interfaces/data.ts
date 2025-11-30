/**
 * 网媒数据接口
 * 严格对齐竞赛文档 6.5 节数据结构
 */
export interface WebMediaData {
  id?: string | number // ID（支持字符串格式：WM${timestamp}${index}）
  title: string // 标题
  content: string // 正文
  source: string // 来源（站点名称或媒体渠道）
  publishTime: string // 发布时间（ISO 8601格式）
  url: string // 文章链接
  author: string // 文章作者
  category: string // 分类（初始为空字符串）
  tags: string // 标签（初始为空字符串）
  viewCount: number // 阅读量
  likeCount: number // 点赞数
  commentCount: number // 评论数
  shareCount: number // 转发量
  region: string // 地区
  // AI分析字段（可选）
  sentiment?: 'positive' | 'neutral' | 'negative'
  sentimentScore?: number // 情感得分（0-100）
  keywords?: string[] // AI提取的关键词
  aiKeywords?: string[] // AI关键词（别名）
  summary?: string // AI生成的摘要
  aiSummary?: string // AI摘要（别名）
  aiCategory?: string // AI分类（投诉/建议/咨询/表扬/中性报道等）
  topics?: string[] // 话题标签（用于聚类分析）
  isWarning?: boolean // 是否预警
  warningLevel?: 'low' | 'medium' | 'high' // 预警级别
  analyzedAt?: string // 分析时间
}

/**
 * 微博数据接口
 * 严格对齐竞赛文档 6.5 节数据结构
 */
export interface WeiboData {
  id?: string | number // ID（支持字符串格式：WB${timestamp}${index}）
  content: string // 正文
  userName: string // 账号名称
  publishTime: string // 发布时间（ISO 8601格式）
  url: string // 原文链接
  repostCount: number // 转发量
  commentCount: number // 评论量
  likeCount: number // 点赞量
  device: string // 设备（初始为空字符串）
  location: string // ip属地
  verified: boolean // 是否认证（从文章作者推导）
  followers: number // 粉丝数（初始为0）
  region: string // 地区
  // AI分析字段（可选）
  sentiment?: 'positive' | 'neutral' | 'negative'
  sentimentScore?: number // 情感得分（0-100）
  keywords?: string[] // AI提取的关键词
  aiKeywords?: string[] // AI关键词（别名）
  summary?: string // AI生成的摘要
  aiSummary?: string // AI摘要（别名）
  aiCategory?: string // AI分类（投诉/建议/咨询/表扬/中性报道等）
  topics?: string[] // 话题标签（用于聚类分析）
  isWarning?: boolean // 是否预警
  warningLevel?: 'low' | 'medium' | 'high' // 预警级别
  analyzedAt?: string // 分析时间
}

/**
 * 数据源类型
 */
export type DataSource = 'webmedia' | 'weibo'

/**
 * 情感类型
 */
export type SentimentType = 'positive' | 'neutral' | 'negative'

/**
 * 预警级别
 */
export type WarningLevel = 'low' | 'medium' | 'high'

/**
 * 统一数据接口（带类型标识）
 * 用于合并展示网媒和微博数据
 */
export interface UnifiedData {
  // 类型标识
  type: DataSource
  // 通用字段
  id?: string | number
  content: string // 网媒的title或微博的content
  publishTime: string // 发布时间（ISO 8601格式）
  url: string // 链接
  region: string // 地区
  // 统计字段（统一）
  viewCount?: number // 浏览量/阅读量
  likeCount: number // 点赞数
  commentCount: number // 评论数
  shareCount?: number // 转发量/分享数
  // 来源信息
  source?: string // 网媒：来源；微博：userName
  author?: string // 网媒：作者；微博：userName
  userName?: string // 微博：用户名
  // 网媒特有字段（可选）
  title?: string // 网媒标题
  category?: string // 网媒分类
  tags?: string // 网媒标签
  // 微博特有字段（可选）
  device?: string // 微博设备
  location?: string // 微博位置
  verified?: boolean // 微博认证
  followers?: number // 微博粉丝数
  // AI分析字段（统一）
  sentiment?: SentimentType
  sentimentScore?: number
  keywords?: string[]
  aiKeywords?: string[]
  summary?: string
  aiSummary?: string
  aiCategory?: string
  topics?: string[]
  isWarning?: boolean
  warningLevel?: WarningLevel
  analyzedAt?: string
}

/**
 * 数据项（联合类型，用于类型守卫）
 */
export type DataItem = WebMediaData | WeiboData

/**
 * 带类型的数据项（用于合并展示）
 */
export type TypedDataItem =
  | (WebMediaData & { type: 'webmedia' })
  | (WeiboData & { type: 'weibo' })

/**
 * 数据统计接口
 */
export interface DataStats {
  total: number // 总数
  webmedia: number // 网媒数量
  weibo: number // 微博数量
  analyzed: number // 已分析数量
  unanalyzed: number // 未分析数量
  bySentiment: {
    positive: number
    neutral: number
    negative: number
  }
}

/**
 * 将网媒数据转换为统一格式
 */
export function toUnifiedData(data: WebMediaData): UnifiedData {
  return {
    type: 'webmedia',
    id: data.id,
    content: data.title || data.content, // 优先使用title作为显示内容
    publishTime: data.publishTime,
    url: data.url,
    region: data.region,
    viewCount: data.viewCount,
    likeCount: data.likeCount,
    commentCount: data.commentCount,
    shareCount: data.shareCount,
    source: data.source,
    author: data.author,
    title: data.title,
    category: data.category,
    tags: data.tags,
    sentiment: data.sentiment,
    sentimentScore: data.sentimentScore,
    keywords: data.keywords || data.aiKeywords,
    aiKeywords: data.aiKeywords,
    summary: data.summary || data.aiSummary,
    aiSummary: data.aiSummary,
    aiCategory: data.aiCategory,
    topics: data.topics,
    isWarning: data.isWarning,
    warningLevel: data.warningLevel,
    analyzedAt: data.analyzedAt,
  }
}

/**
 * 将微博数据转换为统一格式
 */
export function toUnifiedDataFromWeibo(data: WeiboData): UnifiedData {
  return {
    type: 'weibo',
    id: data.id,
    content: data.content,
    publishTime: data.publishTime,
    url: data.url,
    region: data.region,
    likeCount: data.likeCount,
    commentCount: data.commentCount,
    shareCount: data.repostCount,
    source: data.userName,
    author: data.userName,
    userName: data.userName,
    device: data.device,
    location: data.location,
    verified: data.verified,
    followers: data.followers,
    sentiment: data.sentiment,
    sentimentScore: data.sentimentScore,
    keywords: data.keywords || data.aiKeywords,
    aiKeywords: data.aiKeywords,
    summary: data.summary || data.aiSummary,
    aiSummary: data.aiSummary,
    aiCategory: data.aiCategory,
    topics: data.topics,
    isWarning: data.isWarning,
    warningLevel: data.warningLevel,
    analyzedAt: data.analyzedAt,
  }
}

/**
 * 类型守卫：判断是否为网媒数据
 */
export function isWebMediaData(data: DataItem | TypedDataItem): data is WebMediaData {
  return 'title' in data && 'source' in data
}

/**
 * 类型守卫：判断是否为微博数据
 */
export function isWeiboData(data: DataItem | TypedDataItem): data is WeiboData {
  return 'userName' in data && !('title' in data)
}

/**
 * 合并网媒和微博数据为统一格式
 */
export function mergeData(
  webMedia: WebMediaData[],
  weibo: WeiboData[]
): UnifiedData[] {
  const unified: UnifiedData[] = []

  // 转换网媒数据
  webMedia.forEach((item) => {
    unified.push(toUnifiedData(item))
  })

  // 转换微博数据
  weibo.forEach((item) => {
    unified.push(toUnifiedDataFromWeibo(item))
  })

  // 按发布时间排序（最新的在前）
  return unified.sort((a, b) => {
    return b.publishTime.localeCompare(a.publishTime)
  })
}

/**
 * 数据列表响应接口（用于分页）
 */
export interface DataListResponse<T = UnifiedData> {
  data: T[]
  total: number
  page: number
  size: number
  hasMore: boolean
}

/**
 * 数据筛选条件
 */
export interface DataFilter {
  type?: DataSource // 数据类型
  keyword?: string // 关键词搜索
  startTime?: string // 开始时间（ISO 8601）
  endTime?: string // 结束时间（ISO 8601）
  sentiment?: SentimentType // 情感类型
  source?: string // 来源（网媒）或用户名（微博）
  isWarning?: boolean // 是否预警
  warningLevel?: WarningLevel // 预警级别
}
