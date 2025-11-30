/**
 * 预警规则类型
 */
export type AlertRuleType = 'keyword' | 'sentiment' | 'volume'

/**
 * 关键词预警规则
 */
export interface KeywordAlertRule {
  id: string
  type: 'keyword'
  keywords: string[] // 关键词列表
  enabled: boolean
  severity: 'low' | 'medium' | 'high'
  description?: string
}

/**
 * 情感预警规则
 */
export interface SentimentAlertRule {
  id: string
  type: 'sentiment'
  sentiment: 'negative' | 'neutral' // 触发的情感类型
  threshold: number // 阈值（条数/百分比）
  timeWindow: number // 时间窗口（分钟）
  enabled: boolean
  severity: 'low' | 'medium' | 'high'
  description?: string
}

/**
 * 热度预警规则
 */
export interface VolumeAlertRule {
  id: string
  type: 'volume'
  threshold: number // 阈值（条数）
  timeWindow: number // 时间窗口（分钟）
  enabled: boolean
  severity: 'low' | 'medium' | 'high'
  description?: string
}

/**
 * 预警规则联合类型
 */
export type AlertRule = KeywordAlertRule | SentimentAlertRule | VolumeAlertRule

/**
 * 预警记录
 */
export interface AlertRecord {
  id: string
  ruleId: string
  ruleType: AlertRuleType
  severity: 'low' | 'medium' | 'high'
  message: string
  dataIds: string[] // 关联的数据ID
  createdAt: string
  acknowledged: boolean
  acknowledgedAt?: string
}

