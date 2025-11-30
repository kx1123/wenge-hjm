/**
 * 预警规则类型
 */
export type AlertRuleType = 'keyword' | 'sentiment' | 'volume' | 'spread'

/**
 * 预警级别
 */
export type AlertLevel = 'critical' | 'warning' | 'info'

/**
 * 预警状态
 */
export type AlertStatus = 'unhandled' | 'processing' | 'resolved'

/**
 * 预警规则配置
 * 严格对齐 4.1.4 节要求
 */
export interface AlertRule {
  id: string
  name: string
  enabled: boolean
  type: AlertRuleType
  config: {
    // keyword 类型配置
    keywords?: string[] // ['投诉','泄露','爆炸']
    useRegex?: boolean // 支持正则（如 /.*泄露.*/i）

    // sentiment 类型配置
    threshold?: number // 0~100，score < threshold 触发
    minConfidence?: number // 0~1

    // volume 类型配置
    count?: number // 5分钟内 > count 条
    windowMinutes?: number

    // spread 类型配置
    minSources?: number // 跨源数（≥2 = 网媒+微博）
    timeWindowMinutes?: number
  }
  createdAt?: string
  updatedAt?: string
}

/**
 * 预警事件
 * 严格对齐 4.1.4 节要求
 */
export interface AlertEvent {
  id: string
  level: AlertLevel // 严重/警告/提示
  status: AlertStatus
  title: string // 如「负面舆情激增」
  description: string // 如「5分钟内出现12条负面微博」
  triggeredAt: string // ISO 8601
  dataIds: string[] // 关联的 SentimentData.id
  ruleId: string
  // AI 辅助字段（异步填充）
  cause?: string // AI 分析原因
  advice?: string[] // AI 建议（数组）
  processedBy?: string // 处理人
  resolvedAt?: string
}

/**
 * 预警统计
 */
export interface AlertStats {
  total: number
  unhandled: number
  processing: number
  resolved: number
  byLevel: {
    critical: number
    warning: number
    info: number
  }
  byType: {
    keyword: number
    sentiment: number
    volume: number
    spread: number
  }
  recent24h: number // 最近24小时新增预警数
}

/**
 * AI 分析结果（用于预警）
 */
export interface AlertAnalysis {
  cause: string // 原因分析
  advice: string[] // 建议措施
  confidence: number // 分析置信度（0-1）
}

/**
 * 兼容旧接口的类型别名（向后兼容）
 * @deprecated 使用 AlertEvent 代替
 */
export type AlertRecord = AlertEvent

/**
 * 兼容旧接口的类型别名（向后兼容）
 * @deprecated 使用 AlertRule 代替
 */
export type KeywordAlertRule = AlertRule & {
  type: 'keyword'
  config: {
    keywords: string[]
    useRegex?: boolean
  }
}

/**
 * 兼容旧接口的类型别名（向后兼容）
 * @deprecated 使用 AlertRule 代替
 */
export type SentimentAlertRule = AlertRule & {
  type: 'sentiment'
  config: {
    threshold: number
    minConfidence: number
  }
}

/**
 * 兼容旧接口的类型别名（向后兼容）
 * @deprecated 使用 AlertRule 代替
 */
export type VolumeAlertRule = AlertRule & {
  type: 'volume'
  config: {
    count: number
    windowMinutes: number
  }
}

/**
 * 兼容旧接口的类型别名（向后兼容）
 * @deprecated 使用 AlertRule 代替
 */
export type PropagationAlertRule = AlertRule & {
  type: 'spread'
  config: {
    minSources: number
    timeWindowMinutes: number
  }
}
