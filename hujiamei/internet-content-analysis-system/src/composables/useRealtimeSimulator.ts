import { ref, computed, onUnmounted } from 'vue'
import { getRandomUnanalyzedWebMedia, getRandomUnanalyzedWeibo } from '@/db/indexedDB'
import type { WebMediaData, WeiboData } from '@/interfaces/data'
import { createAnalysisEngine } from '@/ai/analysisEngine'
import { useDataStore } from '@/stores/data'
import { useMessage } from 'naive-ui'

/**
 * 实时模拟器返回的数据项
 */
export interface SimulatedDataItem {
  id: string | number
  type: 'webmedia' | 'weibo'
  data: WebMediaData | WeiboData
  isNew: boolean
  timestamp: string
}

/**
 * 实时模拟器状态
 */
export type SimulatorStatus = 'idle' | 'running' | 'paused'

/**
 * 实时统计信息
 */
export interface RealtimeStats {
  webmediaNew: number // 新增报道数
  weiboNew: number // 新增微博数
  webmediaActive: number // 媒体活跃度（按 source 统计）
  weiboActive: number // 用户活跃度（按 userName 统计）
  webmediaInteraction: number // 网媒互动量（viewCount + shareCount）
  weiboInteraction: number // 微博互动量（likeCount + commentCount + repostCount）
}

/**
 * 实时模拟器 Composable
 * 方案A：前端模拟实时推送，满足文档 4.1.3 所有要求
 */
export function useRealtimeSimulator() {
  const status = ref<SimulatorStatus>('idle')
  const latest = ref<SimulatedDataItem | null>(null)
  const simulatedData = ref<SimulatedDataItem[]>([])
  const stats = ref<RealtimeStats>({
    webmediaNew: 0,
    weiboNew: 0,
    webmediaActive: 0,
    weiboActive: 0,
    webmediaInteraction: 0,
    weiboInteraction: 0,
  })

  const dataStore = useDataStore()
  const message = useMessage()
  let intervalId: number | null = null
  let timeoutId: number | null = null

  /**
   * 启动实时模拟
   */
  const start = () => {
    if (status.value === 'running') {
      return
    }

    status.value = 'running'
    simulatedData.value = []
    stats.value = {
      webmediaNew: 0,
      weiboNew: 0,
      webmediaActive: 0,
      weiboActive: 0,
      webmediaInteraction: 0,
      weiboInteraction: 0,
    }

    // 立即推送第一条
    pushNext()
  }

  /**
   * 暂停实时模拟
   */
  const pause = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    status.value = 'paused'
  }

  /**
   * 继续实时模拟
   */
  const resume = () => {
    if (status.value === 'paused') {
      status.value = 'running'
      pushNext()
    }
  }

  /**
   * 停止实时模拟
   */
  const stop = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    status.value = 'idle'
  }

  /**
   * 重置模拟器
   */
  const reset = () => {
    stop()
    latest.value = null
    simulatedData.value = []
    stats.value = {
      webmediaNew: 0,
      weiboNew: 0,
      webmediaActive: 0,
      weiboActive: 0,
      webmediaInteraction: 0,
      weiboInteraction: 0,
    }
  }

  /**
   * 推送下一条数据
   */
  const pushNext = async () => {
    if (status.value !== 'running') {
      return
    }

    try {
      // 随机选择网媒或微博（50%概率）
      const isWebMedia = Math.random() > 0.5
      const item = isWebMedia
        ? await getRandomUnanalyzedWebMedia()
        : await getRandomUnanalyzedWeibo()

      // 无数据可抽时自动暂停 + toast 提示
      if (!item || !item.id) {
        status.value = 'idle'
        message.warning('暂无未分析数据，实时推送已暂停')
        return
      }

      // 规范化 item.id 为 number 类型（在分析前确保 id 正确）
      let normalizedId: number | null = null
      if (typeof item.id === 'number') {
        normalizedId = item.id
      } else if (typeof item.id === 'string') {
        // 尝试从字符串中提取数字（处理 "WM123" 格式）
        const match = item.id.match(/\d+/)
        if (match) {
          const parsed = parseInt(match[0], 10)
          if (!isNaN(parsed) && parsed > 0) {
            normalizedId = parsed
          }
        }
        // 如果无法提取，尝试直接解析
        if (normalizedId === null) {
          const directParsed = parseInt(item.id, 10)
          if (!isNaN(directParsed) && directParsed > 0) {
            normalizedId = directParsed
          }
        }
      }
      
      if (normalizedId === null || normalizedId <= 0) {
        console.warn('无法规范化 item.id，跳过:', item.id)
        return
      }
      
      // 确保 item.id 是 number 类型
      const normalizedItem = {
        ...item,
        id: normalizedId,
      }

      // 创建分析引擎（使用真实AI API）
      const engine = createAnalysisEngine()

      // 执行AI分析（会更新数据库）- 使用规范化后的 item
      await engine.analyzeSingle(normalizedItem)

      // 刷新数据存储（获取最新的分析结果）
      await dataStore.loadAll()

      // 使用已经规范化的 id
      const itemId = normalizedId
      
      // 从数据存储中获取更新后的数据（使用规范化后的 id）
      const updatedItem = isWebMedia
        ? dataStore.webmediaData.find((d) => {
            const dId = typeof d.id === 'number' ? d.id : (typeof d.id === 'string' ? parseInt(d.id.toString().replace(/^[A-Z]+/, ''), 10) : null)
            return dId === itemId
          })
        : dataStore.weiboData.find((d) => {
            const dId = typeof d.id === 'number' ? d.id : (typeof d.id === 'string' ? parseInt(d.id.toString().replace(/^[A-Z]+/, ''), 10) : null)
            return dId === itemId
          })

      // 使用更新后的数据，如果没有找到则使用规范化后的原始数据
      const finalItem = updatedItem || normalizedItem
      
      // 确保 finalItem.id 是 number 类型
      const finalItemId = typeof finalItem.id === 'number' 
        ? finalItem.id 
        : (typeof finalItem.id === 'string' 
          ? parseInt(finalItem.id.toString().replace(/^[A-Z]+/, ''), 10) 
          : itemId)
      
      if (!finalItemId || isNaN(finalItemId)) {
        console.warn('无法规范化 finalItem.id，跳过:', finalItem.id)
        return
      }

      // 创建模拟数据项（确保 id 是 number）
      const simulatedItem: SimulatedDataItem = {
        id: finalItemId,
        type: isWebMedia ? 'webmedia' : 'weibo',
        data: finalItem,
        isNew: true,
        timestamp: new Date().toISOString(),
      }

      // 添加到列表（最新在前）
      simulatedData.value.unshift(simulatedItem)
      latest.value = simulatedItem

      // 限制列表长度（保留最近50条）
      if (simulatedData.value.length > 50) {
        simulatedData.value = simulatedData.value.slice(0, 50)
      }

      // 更新实时统计
      if (isWebMedia) {
        stats.value.webmediaNew++
        const wm = finalItem as WebMediaData
        // 互动量：viewCount + shareCount
        stats.value.webmediaInteraction += (wm.viewCount || 0) + (wm.shareCount || 0)
        // 媒体活跃度：统计不同 source 的数量
        const sources = new Set(dataStore.webmediaData.map((d) => d.source).filter(Boolean))
        stats.value.webmediaActive = sources.size
      } else {
        stats.value.weiboNew++
        const wb = finalItem as WeiboData
        // 互动量：likeCount + commentCount + repostCount
        stats.value.weiboInteraction += (wb.likeCount || 0) + (wb.commentCount || 0) + (wb.repostCount || 0)
        // 用户活跃度：统计不同 userName 的数量
        const users = new Set(dataStore.weiboData.map((d) => d.userName).filter(Boolean))
        stats.value.weiboActive = users.size
      }

      // 3秒后移除NEW标记（自动淡出）
      setTimeout(() => {
        const index = simulatedData.value.findIndex(
          (d) => {
            const dId = typeof d.id === 'number' ? d.id : (typeof d.id === 'string' ? parseInt(d.id.toString().replace(/^[A-Z]+/, ''), 10) : null)
            return dId === finalItemId && d.type === simulatedItem.type
          }
        )
        if (index !== -1) {
          simulatedData.value[index].isNew = false
        }
      }, 3000)
    } catch (error) {
      console.error('实时模拟推送失败:', error)
      message.error('实时推送失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }

    // 随机间隔5-15秒（5000 + Math.random() * 10000）
    if (status.value === 'running') {
      const nextInterval = 5000 + Math.random() * 10000
      timeoutId = window.setTimeout(pushNext, nextInterval)
    }
  }

  // 组件卸载时清理
  onUnmounted(() => {
    stop()
  })

  return {
    // 状态
    status,
    latest,
    simulatedData,
    stats,
    isRunning: computed(() => status.value === 'running'),
    isPaused: computed(() => status.value === 'paused'),

    // 方法
    start,
    pause,
    resume,
    stop,
    reset,
  }
}
