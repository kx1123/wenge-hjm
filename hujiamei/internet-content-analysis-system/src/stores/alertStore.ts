import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '@/db/indexedDB'
import type {
  AlertRule,
  AlertEvent,
  AlertLevel,
  AlertStatus,
} from '@/interfaces/alert'
import type { WebMediaData, WeiboData } from '@/interfaces/data'

// 统一的数据类型
type SentimentData = WebMediaData | WeiboData

export const useAlertStore = defineStore('alert', () => {
  // ========== State ==========
  
  // 预警规则列表（含默认规则）
  const rules = ref<AlertRule[]>([])
  
  // 预警事件列表
  const alerts = ref<AlertEvent[]>([])
  
  // 活跃预警（status !== 'resolved'）
  const activeAlerts = computed(() => {
    return alerts.value.filter((a) => a.status !== 'resolved')
  })
  
  // 5分钟滑动窗口计数器
  const volumeCounter = ref<{ count: number; startTime: number }>({
    count: 0,
    startTime: Date.now(),
  })
  
  // 事件源追踪（用于 spread 检查）
  const eventSources = ref<Map<string, Set<'webmedia' | 'weibo'>>>(new Map())
  
  // 加载状态
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ========== Getters ==========
  
  /**
   * 预警统计
   */
  const alertStats = computed(() => {
    return {
      total: alerts.value.length,
      critical: alerts.value.filter((a) => a.level === 'critical').length,
      warning: alerts.value.filter((a) => a.level === 'warning').length,
      info: alerts.value.filter((a) => a.level === 'info').length,
    }
  })
  
  /**
   * 未解决预警数
   */
  const unresolvedCount = computed(() => {
    return alerts.value.filter((a) => a.status !== 'resolved').length
  })
  
  /**
   * 近7天趋势
   */
  const dailyTrend = computed(() => {
    const now = Date.now()
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
    
    // 按日期分组统计
    const dateMap = new Map<string, number>()
    
    alerts.value.forEach((alert) => {
      const alertTime = new Date(alert.triggeredAt).getTime()
      if (alertTime >= sevenDaysAgo) {
        const date = new Date(alert.triggeredAt).toISOString().split('T')[0]
        dateMap.set(date, (dateMap.get(date) || 0) + 1)
      }
    })
    
    // 生成近7天的数据
    const result: { date: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
      result.push({
        date,
        count: dateMap.get(date) || 0,
      })
    }
    
    return result
  })
  
  // 启用的规则
  const enabledRules = computed(() => {
    return rules.value.filter((r) => r.enabled)
  })

  // ========== Actions ==========
  
  /**
   * 添加预警事件
   * 自动保存到数据库并显示 Toast
   */
  async function addAlert(alert: AlertEvent) {
    try {
      // 保存到数据库
      await db.alerts.add(alert)
      
      // 添加到列表（最新在前）
      alerts.value.unshift(alert)
      
      // 触发 Toast 显示（通过事件或直接调用）
      // 这里可以通过 emit 或直接调用 Toast 组件
      // 由于在 Pinia store 中，我们通过返回 alert 让调用方处理 Toast
      
      return alert
    } catch (err) {
      error.value = err instanceof Error ? err.message : '添加预警失败'
      console.error('添加预警失败:', err)
      throw err
    }
  }
  
  /**
   * 更新预警状态
   */
  async function updateAlertStatus(
    id: string,
    status: 'processing' | 'resolved',
    processedBy?: string
  ) {
    try {
      const alert = alerts.value.find((a) => a.id === id)
      if (!alert) {
        throw new Error(`预警不存在: ${id}`)
      }
      
      const updates: Partial<AlertEvent> = {
        status,
      }
      
      if (status === 'resolved') {
        updates.resolvedAt = new Date().toISOString()
        updates.processedBy = processedBy
      }
      
      await db.alerts.update(id, updates)
      
      const index = alerts.value.findIndex((a) => a.id === id)
      if (index !== -1) {
        alerts.value[index] = { ...alerts.value[index], ...updates }
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新预警状态失败'
      console.error('更新预警状态失败:', err)
      throw err
    }
  }
  
  /**
   * 更新预警的 AI 分析结果
   */
  async function updateAlertAnalysis(
    id: string,
    cause: string,
    advice: string[]
  ) {
    try {
      const updates: Partial<AlertEvent> = {
        cause,
        advice,
      }
      
      await db.alerts.update(id, updates)
      
      const index = alerts.value.findIndex((a) => a.id === id)
      if (index !== -1) {
        alerts.value[index] = { ...alerts.value[index], ...updates }
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新预警分析失败'
      console.error('更新预警分析失败:', err)
      throw err
    }
  }
  
  /**
   * 检查数据是否触发预警
   */
  function checkData(data: SentimentData): void {
    const enabled = enabledRules.value
    
    for (const rule of enabled) {
      let triggered = false
      let level: AlertLevel = 'info'
      let title = ''
      let description = ''
      const dataIds: string[] = [String(data.id || '')]
      
      // 检查关键词预警
      if (rule.type === 'keyword' && rule.config.keywords) {
        const content = 'title' in data ? `${data.title} ${data.content}` : data.content
        
        if (rule.config.useRegex) {
          // 正则匹配
          try {
            triggered = rule.config.keywords.some((keyword) => {
              const regex = new RegExp(keyword, 'i')
              return regex.test(content)
            })
          } catch (err) {
            console.warn('正则表达式错误:', err)
            triggered = false
          }
        } else {
          // 普通关键词匹配
          triggered = rule.config.keywords.some((keyword) =>
            content.toLowerCase().includes(keyword.toLowerCase())
          )
        }
        
        if (triggered) {
          title = '关键词预警'
          description = `检测到敏感关键词：${rule.config.keywords.join('、')}`
          level = 'warning' // 纯关键词 → warning
        }
      }
      
      // 检查情感预警
      else if (rule.type === 'sentiment' && rule.config.threshold !== undefined) {
        if (
          data.sentiment === 'negative' &&
          data.sentimentScore !== undefined &&
          data.sentimentConfidence !== undefined
        ) {
          const scoreMatch = data.sentimentScore < rule.config.threshold
          const confidenceMatch =
            rule.config.minConfidence === undefined ||
            data.sentimentConfidence >= rule.config.minConfidence
          
          triggered = scoreMatch && confidenceMatch
          
          if (triggered) {
            title = '负面舆情预警'
            description = `情感得分：${data.sentimentScore}，置信度：${(data.sentimentConfidence * 100).toFixed(1)}%`
            
            // 如果同时触发关键词预警，升级为 critical
            const hasKeyword = enabled.some(
              (r) =>
                r.type === 'keyword' &&
                r.enabled &&
                r.config.keywords &&
                (() => {
                  const content = 'title' in data ? `${data.title} ${data.content}` : data.content
                  if (r.config.useRegex) {
                    try {
                      return r.config.keywords.some((k) => new RegExp(k, 'i').test(content))
                    } catch {
                      return false
                    }
                  }
                  return r.config.keywords.some((k) => content.toLowerCase().includes(k.toLowerCase()))
                })()
            )
            
            level = hasKeyword ? 'critical' : 'warning' // keyword+情感负面 → critical
          }
        }
      }
      
      // 检查量激增预警
      else if (rule.type === 'volume' && rule.config.count !== undefined) {
        const windowMinutes = rule.config.windowMinutes || 5
        const windowMs = windowMinutes * 60 * 1000
        const now = Date.now()
        
        // 重置滑动窗口
        if (now - volumeCounter.value.startTime > windowMs) {
          volumeCounter.value = {
            count: 0,
            startTime: now,
          }
        }
        
        // 增加计数
        volumeCounter.value.count++
        
        // 检查是否超阈值
        triggered = volumeCounter.value.count >= rule.config.count
        
        if (triggered) {
          title = '量激增预警'
          description = `${windowMinutes}分钟内新增${volumeCounter.value.count}条数据，超过阈值${rule.config.count}`
          level = 'info' // 量激增 → info
        }
      }
      
      // 检查传播预警
      else if (rule.type === 'spread' && data.eventId) {
        const timeWindowMinutes = rule.config.timeWindowMinutes || 10
        const minSources = rule.config.minSources || 2
        const windowMs = timeWindowMinutes * 60 * 1000
        
        // 获取或创建事件源集合
        let sources = eventSources.value.get(data.eventId)
        if (!sources) {
          sources = new Set()
          eventSources.value.set(data.eventId, sources)
        }
        
        // 添加当前数据源
        const dataType = 'title' in data ? 'webmedia' : 'weibo'
        sources.add(dataType)
        
        // 检查是否达到最小源数
        triggered = sources.size >= minSources
        
        if (triggered) {
          title = '传播预警'
          description = `事件 ${data.eventId} 在${timeWindowMinutes}分钟内跨${sources.size}个数据源传播`
          level = 'warning'
        }
        
        // 清理过期事件（超过时间窗口）
        // 这里简化处理，实际应该记录每个事件的时间戳
        setTimeout(() => {
          eventSources.value.delete(data.eventId)
        }, windowMs)
      }
      
      // 如果触发预警，创建预警事件
      if (triggered) {
        const alert: AlertEvent = {
          id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          level,
          status: 'unhandled',
          title,
          description,
          triggeredAt: new Date().toISOString(),
          dataIds,
          ruleId: rule.id,
        }
        
        // 异步添加预警（不阻塞）
        addAlert(alert).catch((err) => {
          console.error('添加预警失败:', err)
        })
      }
    }
  }
  
  /**
   * 初始化默认规则
   * 满足文档 4.1.4 节要求
   */
  function initDefaultRules() {
    const defaultRules: AlertRule[] = [
      {
        id: 'rule-1',
        name: '敏感词监控',
        enabled: true,
        type: 'keyword',
        config: {
          keywords: ['投诉', '泄露', '爆炸', '召回', '诈骗'],
          useRegex: false,
        },
      },
      {
        id: 'rule-2',
        name: '高危负面舆情',
        enabled: true,
        type: 'sentiment',
        config: {
          threshold: 30,
          minConfidence: 0.8,
        },
      },
      {
        id: 'rule-3',
        name: '舆情量激增',
        enabled: true,
        type: 'volume',
        config: {
          count: 20,
          windowMinutes: 5,
        },
      },
      {
        id: 'rule-4',
        name: '跨源快速传播',
        enabled: true,
        type: 'spread',
        config: {
          minSources: 2, // 网媒+微博 = 2
          timeWindowMinutes: 10,
        },
      },
    ]
    
    // 如果数据库中没有规则，添加默认规则
    if (rules.value.length === 0) {
      defaultRules.forEach((rule) => {
        db.alertRules.add(rule).catch(() => {
          // 忽略重复添加错误（可能已存在）
        })
      })
      rules.value.push(...defaultRules)
    }
  }
  
  /**
   * 加载所有规则
   */
  async function loadRules() {
    try {
      loading.value = true
      error.value = null
      const loadedRules = await db.alertRules.toArray()
      
      if (loadedRules.length === 0) {
        initDefaultRules()
      } else {
        rules.value = loadedRules
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载规则失败'
      console.error('加载预警规则失败:', err)
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 加载所有预警记录
   */
  async function loadAlerts() {
    try {
      loading.value = true
      error.value = null
      alerts.value = await db.alerts.orderBy('triggeredAt').reverse().toArray()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载预警失败'
      console.error('加载预警记录失败:', err)
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 添加规则
   */
  async function addRule(rule: Omit<AlertRule, 'id'>) {
    try {
      const newRule: AlertRule = {
        ...rule,
        id: `${rule.type}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      }
      
      await db.alertRules.add(newRule)
      rules.value.push(newRule)
      return newRule
    } catch (err) {
      error.value = err instanceof Error ? err.message : '添加规则失败'
      console.error('添加预警规则失败:', err)
      throw err
    }
  }
  
  /**
   * 更新规则
   */
  async function updateRule(id: string, updates: Partial<AlertRule>) {
    try {
      const rule = rules.value.find((r) => r.id === id)
      if (!rule) {
        throw new Error(`规则不存在: ${id}`)
      }
      
      const updatedRule = { ...rule, ...updates }
      await db.alertRules.update(id, updatedRule)
      
      const index = rules.value.findIndex((r) => r.id === id)
      if (index !== -1) {
        rules.value[index] = updatedRule
      }
      return updatedRule
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新规则失败'
      console.error('更新预警规则失败:', err)
      throw err
    }
  }
  
  /**
   * 删除规则
   */
  async function deleteRule(id: string) {
    try {
      await db.alertRules.delete(id)
      rules.value = rules.value.filter((r) => r.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除规则失败'
      console.error('删除预警规则失败:', err)
      throw err
    }
  }
  
  /**
   * 初始化：加载规则和预警记录
   */
  async function init() {
    await Promise.all([loadRules(), loadAlerts()])
  }

  return {
    // State
    rules,
    alerts,
    activeAlerts,
    volumeCounter,
    loading,
    error,
    
    // Getters
    alertStats,
    unresolvedCount,
    dailyTrend,
    enabledRules,
    
    // Actions
    init,
    loadRules,
    loadAlerts,
    addRule,
    updateRule,
    deleteRule,
    addAlert,
    updateAlertStatus,
    updateAlertAnalysis,
    checkData,
  }
})
