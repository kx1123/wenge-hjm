import { useAlertStore } from '@/stores/alertStore'
import { useDataStore } from '@/stores/data'
import type { WebMediaData, WeiboData } from '@/interfaces/data'
import type { AlertLevel } from '@/interfaces/alert'

/**
 * 预警检查服务
 * 检查新数据是否触发预警规则
 */
export class AlertChecker {
  private alertStore = useAlertStore()
  private dataStore = useDataStore()
  
  // 滑动窗口：用于量激增预警
  private volumeWindow: Array<{ time: number; count: number }> = []
  
  // 事件时间窗口：用于传播预警
  private eventWindow: Map<string, { webmedia: number; weibo: number; time: number }> = new Map()

  /**
   * 检查单条数据是否触发预警
   */
  async checkData(data: WebMediaData | WeiboData): Promise<void> {
    const rules = this.alertStore.enabledRules
    
    for (const rule of rules) {
      let triggered = false
      let level: AlertLevel = 'info'
      let title = ''
      let message = ''
      const dataIds: (string | number)[] = [data.id!]
      
      // 检查关键词预警
      if (rule.type === 'keyword') {
        triggered = this.alertStore.checkKeywordRule(rule, data)
        if (triggered) {
          level = rule.severity
          title = '关键词预警'
          message = `检测到敏感关键词：${rule.keywords.join('、')}`
        }
      }
      
      // 检查情感预警
      else if (rule.type === 'sentiment') {
        triggered = this.alertStore.checkSentimentRule(rule, data)
        if (triggered) {
          level = rule.severity
          title = '情感预警'
          const content = 'title' in data ? data.title : data.content
          message = `检测到${rule.sentiment === 'negative' ? '负面' : '中性'}情感，得分：${data.sentimentScore}，置信度：${(data.sentimentConfidence || 0).toFixed(2)}`
        }
      }
      
      // 检查量激增预警
      else if (rule.type === 'volume') {
        const now = Date.now()
        const windowStart = now - rule.timeWindow * 60 * 1000
        
        // 更新滑动窗口
        this.volumeWindow = this.volumeWindow.filter((item) => item.time >= windowStart)
        this.volumeWindow.push({ time: now, count: 1 })
        
        const count = this.volumeWindow.reduce((sum, item) => sum + item.count, 0)
        triggered = this.alertStore.checkVolumeRule(rule, count)
        
        if (triggered) {
          level = rule.severity
          title = '量激增预警'
          message = `在${rule.timeWindow}分钟内新增${count}条数据，超过阈值${rule.threshold}`
        }
      }
      
      // 检查传播预警
      else if (rule.type === 'propagation') {
        if (data.eventId) {
          const now = Date.now()
          const windowStart = now - rule.timeWindow * 60 * 1000
          
          let eventData = this.eventWindow.get(data.eventId)
          if (!eventData || eventData.time < windowStart) {
            eventData = { webmedia: 0, weibo: 0, time: now }
          }
          
          if ('title' in data) {
            eventData.webmedia++
          } else {
            eventData.weibo++
          }
          
          this.eventWindow.set(data.eventId, eventData)
          
          // 清理过期事件
          for (const [eventId, ed] of this.eventWindow.entries()) {
            if (ed.time < windowStart) {
              this.eventWindow.delete(eventId)
            }
          }
          
          triggered = this.alertStore.checkPropagationRule(rule, {
            webmediaCount: eventData.webmedia,
            weiboCount: eventData.weibo,
          })
          
          if (triggered) {
            level = rule.severity
            title = '传播预警'
            message = `事件 ${data.eventId} 在${rule.timeWindow}分钟内跨源传播（网媒：${eventData.webmedia}条，微博：${eventData.weibo}条）`
          }
        }
      }
      
      // 如果触发预警，创建预警记录
      if (triggered) {
        const dataType = 'title' in data ? 'webmedia' : 'weibo'
        await this.alertStore.createAlert(
          rule.id,
          rule.type,
          level,
          title,
          message,
          dataIds,
          dataType,
          data.eventId
        )
      }
    }
  }

  /**
   * 清理过期窗口数据
   */
  cleanup(maxAge: number = 60 * 60 * 1000) {
    const now = Date.now()
    const cutoff = now - maxAge
    
    this.volumeWindow = this.volumeWindow.filter((item) => item.time >= cutoff)
    
    for (const [eventId, eventData] of this.eventWindow.entries()) {
      if (eventData.time < cutoff) {
        this.eventWindow.delete(eventId)
      }
    }
  }
}

/**
 * 创建预警检查器实例
 */
export function createAlertChecker(): AlertChecker {
  return new AlertChecker()
}

