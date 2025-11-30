import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AlertRule, AlertRecord } from '@/interfaces/alert'

/**
 * 预警系统 Store
 */
export const useAlertStore = defineStore('alert', () => {
  // 状态
  const rules = ref<AlertRule[]>([])
  const alerts = ref<AlertRecord[]>([])

  // 初始化默认规则
  const defaultRules: AlertRule[] = [
    {
      id: 'rule-1',
      type: 'keyword',
      keywords: ['投诉', '泄露', '爆炸', '召回', '诈骗'],
      enabled: true,
      severity: 'high',
      description: '敏感词监控',
    },
    {
      id: 'rule-2',
      type: 'sentiment',
      sentiment: 'negative',
      threshold: 30,
      timeWindow: 60,
      enabled: true,
      severity: 'high',
      description: '高危负面舆情',
    },
    {
      id: 'rule-3',
      type: 'volume',
      threshold: 50,
      timeWindow: 5,
      enabled: true,
      severity: 'medium',
      description: '舆情量激增',
    },
  ]

  // 加载规则
  async function loadRules() {
    try {
      // 从IndexedDB加载（如果已实现）
      // const stored = await db.alertRules.toArray()
      // rules.value = stored.length > 0 ? stored : defaultRules
      rules.value = defaultRules
    } catch (error) {
      console.error('加载预警规则失败:', error)
      rules.value = defaultRules
    }
  }

  // 加载预警记录
  async function loadAlerts() {
    try {
      // 从IndexedDB加载（如果已实现）
      // alerts.value = await db.alerts.toArray()
      alerts.value = []
    } catch (error) {
      console.error('加载预警记录失败:', error)
      alerts.value = []
    }
  }

  // 添加规则
  function addRule(rule: AlertRule) {
    rules.value.push(rule)
    // 保存到IndexedDB
    // db.alertRules.add(rule)
  }

  // 更新规则
  function updateRule(id: string, updates: Partial<AlertRule>) {
    const index = rules.value.findIndex((r) => r.id === id)
    if (index !== -1) {
      rules.value[index] = { ...rules.value[index], ...updates }
      // 保存到IndexedDB
      // db.alertRules.update(id, updates)
    }
  }

  // 删除规则
  function deleteRule(id: string) {
    rules.value = rules.value.filter((r) => r.id !== id)
    // 从IndexedDB删除
    // db.alertRules.delete(id)
  }

  // 添加预警记录
  function addAlert(alert: AlertRecord) {
    alerts.value.unshift(alert)
    // 保存到IndexedDB
    // db.alerts.add(alert)
  }

  // 更新预警状态
  function updateAlertStatus(id: string, acknowledged: boolean) {
    const alert = alerts.value.find((a) => a.id === id)
    if (alert) {
      alert.acknowledged = acknowledged
      alert.acknowledgedAt = acknowledged ? new Date().toISOString() : undefined
      // 更新到IndexedDB
      // db.alerts.update(id, { acknowledged, acknowledgedAt: alert.acknowledgedAt })
    }
  }

  // 检查数据是否触发预警
  function checkData(data: any) {
    const enabledRules = rules.value.filter((r) => r.enabled)
    
    for (const rule of enabledRules) {
      let triggered = false
      let message = ''

      if (rule.type === 'keyword') {
        // 关键词匹配
        const content = (data.title || '') + (data.content || '')
        triggered = rule.keywords.some((keyword) => content.includes(keyword))
        if (triggered) {
          message = `检测到敏感词：${rule.keywords.find((k) => content.includes(k))}`
        }
      } else if (rule.type === 'sentiment') {
        // 情感预警
        if (data.sentiment === rule.sentiment && data.sentimentScore !== undefined) {
          triggered = data.sentimentScore < rule.threshold
          if (triggered) {
            message = `检测到${rule.sentiment === 'negative' ? '负面' : '中性'}舆情，情感分数：${data.sentimentScore}`
          }
        }
      } else if (rule.type === 'volume') {
        // 量激增预警（需要时间窗口统计，这里简化处理）
        // 实际应该统计最近timeWindow分钟内的数据量
        message = '舆情量激增预警（需要时间窗口统计）'
      }

      if (triggered) {
        const alert: AlertRecord = {
          id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          ruleId: rule.id,
          ruleType: rule.type,
          severity: rule.severity,
          message,
          dataIds: [String(data.id)],
          createdAt: new Date().toISOString(),
          acknowledged: false,
        }
        addAlert(alert)
      }
    }
  }

  // 计算属性
  const activeAlerts = computed(() => alerts.value.filter((a) => !a.acknowledged))
  const alertStats = computed(() => {
    const total = alerts.value.length
    const unhandled = activeAlerts.value.length
    const bySeverity = {
      high: alerts.value.filter((a) => a.severity === 'high').length,
      medium: alerts.value.filter((a) => a.severity === 'medium').length,
      low: alerts.value.filter((a) => a.severity === 'low').length,
    }
    return { total, unhandled, bySeverity }
  })

  // 初始化
  async function init() {
    await loadRules()
    await loadAlerts()
  }

  return {
    rules,
    alerts,
    activeAlerts,
    alertStats,
    loadRules,
    loadAlerts,
    addRule,
    updateRule,
    deleteRule,
    addAlert,
    updateAlertStatus,
    checkData,
    init,
  }
})

