<template>
  <Transition name="toast">
    <div
      v-if="visible"
      :class="['alert-toast', `alert-toast-${alert.level}`]"
      @click="handleClick"
    >
      <div class="toast-icon">
        <span v-if="alert.level === 'critical'">🔴</span>
        <span v-else-if="alert.level === 'warning'">🟠</span>
        <span v-else>ℹ️</span>
      </div>
      
      <div class="toast-content">
        <div class="toast-header">
          <div class="toast-title">{{ alert.title }}</div>
          <button class="toast-close" @click.stop="handleClose">×</button>
        </div>
        <div class="toast-description">{{ alert.description }}</div>
        
        <!-- AI 分析结果 -->
        <div v-if="alert.cause || alert.advice" class="toast-analysis">
          <div v-if="alert.cause" class="analysis-cause">
            <strong>原因：</strong>{{ alert.cause }}
          </div>
          <div v-if="alert.advice && alert.advice.length > 0" class="analysis-advice">
            <strong>建议：</strong>
            <ul>
              <li v-for="(item, index) in alert.advice.slice(0, 2)" :key="index">{{ item }}</li>
            </ul>
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="toast-actions">
          <n-button
            v-if="!alert.cause"
            size="tiny"
            type="primary"
            @click.stop="handleAnalyze"
            :loading="analyzing"
          >
            AI诊断
          </n-button>
          <n-button
            v-if="alert.status === 'unhandled'"
            size="tiny"
            type="warning"
            @click.stop="handleUpdateStatus('processing')"
          >
            处理中
          </n-button>
          <n-button
            v-if="alert.status === 'processing'"
            size="tiny"
            type="success"
            @click.stop="handleUpdateStatus('resolved')"
          >
            已解决
          </n-button>
        </div>
      </div>
      
      <div v-if="isNew" class="toast-badge">NEW</div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { NButton, useMessage } from 'naive-ui'
import { useRouter } from 'vue-router'
import { useAlertStore } from '@/stores/alertStore'
import { createAlertAdvisor } from '@/ai/alertAdvisor'
import { useDataStore } from '@/stores/data'
import type { AlertEvent } from '@/interfaces/alert'

interface Props {
  alert: AlertEvent
  autoClose?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoClose: true,
})

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()
const alertStore = useAlertStore()
const dataStore = useDataStore()
const message = useMessage()

const visible = ref(false)
const isNew = ref(true)
const analyzing = ref(false)

let closeTimer: number | null = null
let audioContext: AudioContext | null = null

onMounted(() => {
  visible.value = true
  
  // 3秒后移除 NEW 标记
  setTimeout(() => {
    isNew.value = false
  }, 3000)
  
  // 自动关闭（critical 不自动关闭）
  if (props.autoClose && props.alert.level !== 'critical') {
    closeTimer = window.setTimeout(() => {
      handleClose()
    }, 8000)
  }
  
  // critical 级别播放音效（可选）
  if (props.alert.level === 'critical') {
    playSound().catch(() => {
      // 忽略音效播放失败
    })
  }
})

onUnmounted(() => {
  if (closeTimer) {
    clearTimeout(closeTimer)
  }
  if (audioContext) {
    audioContext.close().catch(() => {})
  }
})

/**
 * 播放音效（可选）
 */
async function playSound() {
  try {
    // 使用 Web Audio API 生成简单的提示音
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
  } catch (err) {
    // 忽略音效播放失败（可能浏览器不支持或用户未交互）
    console.debug('音效播放失败:', err)
  }
}

/**
 * 点击 Toast（进入详情页）
 */
function handleClick() {
  router.push(`/alert-system?alertId=${props.alert.id}`)
}

/**
 * 关闭 Toast
 */
function handleClose() {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
  visible.value = false
  setTimeout(() => {
    emit('close')
  }, 300) // 等待动画完成
}

/**
 * AI 诊断
 */
async function handleAnalyze() {
  analyzing.value = true
  
  try {
    // 获取关联的数据
    const alertData: any[] = []
    
    for (const dataId of props.alert.dataIds) {
      // 尝试从网媒数据中查找
      const webmedia = dataStore.webmediaData.find((d) => String(d.id) === String(dataId))
      if (webmedia) {
        alertData.push(webmedia)
        continue
      }
      
      // 尝试从微博数据中查找
      const weibo = dataStore.weiboData.find((d) => String(d.id) === String(dataId))
      if (weibo) {
        alertData.push(weibo)
      }
    }
    
    if (alertData.length === 0) {
      message.warning('未找到关联数据')
      return
    }
    
    // 调用 AI 分析
    const advisor = createAlertAdvisor()
    const result = await advisor.analyzeCauseAndAdvice(
      alertData,
      `预警级别：${props.alert.level}，规则ID：${props.alert.ruleId}`
    )
    
    // 更新预警记录（这里需要更新 AlertEvent，但 AlertEvent 没有 cause 和 advice 字段的更新方法）
    // 我们需要通过 store 更新
    const rule = alertStore.rules.find((r) => r.id === props.alert.ruleId)
    const ruleType = rule?.type || 'keyword'
    
    // 直接更新 alert 对象（响应式）
    // 注意：这里需要确保 alert 是响应式的
    if (props.alert) {
      ;(props.alert as any).cause = result.cause
      ;(props.alert as any).advice = result.advice
    }
    
    // 同时更新数据库
    await alertStore.updateAlertAnalysis(props.alert.id, result.cause, result.advice)
    
    message.success('AI 分析完成')
  } catch (err) {
    message.error('AI 分析失败: ' + (err instanceof Error ? err.message : '未知错误'))
  } finally {
    analyzing.value = false
  }
}

/**
 * 更新预警状态
 */
async function handleUpdateStatus(status: 'processing' | 'resolved') {
  try {
    await alertStore.updateAlertStatus(props.alert.id, status)
    message.success('状态更新成功')
    
    // 如果已解决，3秒后自动关闭
    if (status === 'resolved') {
      setTimeout(() => {
        handleClose()
      }, 3000)
    }
  } catch (err) {
    message.error('状态更新失败')
  }
}
</script>

<style scoped>
.alert-toast {
  @apply fixed bottom-6 right-6 z-50 flex items-start gap-3 p-4 rounded-lg shadow-2xl cursor-pointer transition-all duration-300;
  min-width: 360px;
  max-width: 480px;
  backdrop-filter: blur(10px);
  animation: slideInRight 0.3s ease-out;
}

.alert-toast-critical {
  @apply bg-red-500 text-white;
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
  animation: slideInRight 0.3s ease-out, pulse 2s ease-in-out infinite;
}

.alert-toast-warning {
  @apply bg-orange-500 text-white;
  box-shadow: 0 0 20px rgba(249, 115, 22, 0.5);
}

.alert-toast-info {
  @apply bg-blue-500 text-white;
  box-shadow: 0 0 20px rgba(37, 99, 235, 0.5);
}

.toast-icon {
  @apply text-2xl flex-shrink-0;
  animation: blink 1.5s ease-in-out infinite;
}

.toast-content {
  @apply flex-1 min-w-0;
}

.toast-header {
  @apply flex items-start justify-between mb-2;
}

.toast-title {
  @apply font-bold text-base flex-1;
}

.toast-close {
  @apply text-xl font-bold opacity-70 hover:opacity-100 transition-opacity flex-shrink-0 ml-2;
  width: 24px;
  height: 24px;
  line-height: 24px;
}

.toast-description {
  @apply text-sm opacity-90 mb-2;
}

.toast-analysis {
  @apply bg-black bg-opacity-20 p-2 rounded mt-2 mb-2;
}

.analysis-cause {
  @apply text-xs mb-1;
}

.analysis-advice {
  @apply text-xs;
}

.analysis-advice ul {
  @apply list-disc list-inside mt-1 space-y-0.5;
}

.toast-actions {
  @apply flex gap-2 mt-2;
}

.toast-badge {
  @apply absolute -top-2 -right-2 bg-yellow-400 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded;
  animation: pulse 1.2s ease-in-out infinite;
}

/* 动画 */
@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
