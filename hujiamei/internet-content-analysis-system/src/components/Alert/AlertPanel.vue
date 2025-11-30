<template>
  <div class="alert-panel">
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <n-card class="stat-card">
        <div class="stat-value">{{ stats.total }}</div>
        <div class="stat-label">总预警数</div>
      </n-card>
      <n-card class="stat-card">
        <div class="stat-value text-red-500">{{ stats.unhandled }}</div>
        <div class="stat-label">未处理</div>
      </n-card>
      <n-card class="stat-card">
        <div class="stat-value text-orange-500">{{ stats.processing }}</div>
        <div class="stat-label">处理中</div>
      </n-card>
      <n-card class="stat-card">
        <div class="stat-value text-green-500">{{ stats.resolved }}</div>
        <div class="stat-label">已解决</div>
      </n-card>
      <n-card class="stat-card">
        <div class="stat-value text-red-600">{{ stats.byLevel.critical }}</div>
        <div class="stat-label">严重</div>
      </n-card>
      <n-card class="stat-card">
        <div class="stat-value text-orange-500">{{ stats.byLevel.warning }}</div>
        <div class="stat-label">警告</div>
      </n-card>
    </div>

    <!-- 筛选和操作 -->
    <div class="toolbar">
      <n-space>
        <n-select
          v-model:value="filterLevel"
          :options="levelOptions"
          placeholder="按级别筛选"
          clearable
          style="width: 120px"
        />
        <n-select
          v-model:value="filterStatus"
          :options="statusOptions"
          placeholder="按状态筛选"
          clearable
          style="width: 120px"
        />
        <n-select
          v-model:value="filterType"
          :options="typeOptions"
          placeholder="按类型筛选"
          clearable
          style="width: 120px"
        />
        <n-button @click="handleExport">导出</n-button>
        <n-button @click="handleRefresh">刷新</n-button>
      </n-space>
    </div>

    <!-- 预警列表 -->
    <n-card class="alert-list-card">
      <n-list>
        <n-list-item v-for="alert in filteredAlerts" :key="alert.id">
          <div class="alert-item">
            <div class="alert-header">
              <AlertBadge :level="alert.level" />
              <n-tag :type="getStatusTag(alert.status)">{{ getStatusName(alert.status) }}</n-tag>
              <n-tag :type="getTypeTag(getRuleType(alert))">{{ getTypeName(getRuleType(alert)) }}</n-tag>
              <span class="alert-time">{{ formatTime(alert.triggeredAt) }}</span>
            </div>
            <div class="alert-title">{{ alert.title }}</div>
            <div class="alert-message">{{ alert.description }}</div>
            
            <!-- AI 分析结果 -->
            <div v-if="alert.cause || alert.advice" class="alert-analysis">
              <div v-if="alert.cause" class="analysis-cause">
                <strong>原因：</strong>{{ alert.cause }}
              </div>
              <div v-if="alert.advice && alert.advice.length > 0" class="analysis-advice">
                <strong>建议：</strong>
                <ul>
                  <li v-for="(item, index) in alert.advice" :key="index">{{ item }}</li>
                </ul>
              </div>
            </div>
            
            <!-- 操作按钮 -->
            <div class="alert-actions">
              <n-button
                v-if="!alert.cause"
                size="small"
                type="primary"
                @click="handleAnalyze(alert)"
                :loading="analyzingId === alert.id"
              >
                AI诊断
              </n-button>
              <n-button
                v-if="alert.status === 'unhandled'"
                size="small"
                type="warning"
                @click="handleUpdateStatus(alert.id, 'processing')"
              >
                开始处理
              </n-button>
              <n-button
                v-if="alert.status === 'processing'"
                size="small"
                type="success"
                @click="handleUpdateStatus(alert.id, 'resolved')"
              >
                标记已解决
              </n-button>
              <n-button
                size="small"
                @click="handleViewDetails(alert)"
              >
                查看详情
              </n-button>
            </div>
          </div>
        </n-list-item>
      </n-list>
      
      <!-- 空状态 -->
      <n-empty v-if="filteredAlerts.length === 0" description="暂无预警记录" />
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { NCard, NList, NListItem, NTag, NButton, NSelect, NSpace, NEmpty, useMessage, useDialog } from 'naive-ui'
import AlertBadge from '@/components/ui/AlertBadge.vue'
import { useAlertStore } from '@/stores/alertStore'
import { createAlertAdvisor } from '@/ai/alertAdvisor'
import { useDataStore } from '@/stores/data'
import type { AlertEvent, AlertLevel, AlertStatus } from '@/interfaces/alert'
import dayjs from 'dayjs'

const alertStore = useAlertStore()
const dataStore = useDataStore()
const message = useMessage()
const dialog = useDialog()

const filterLevel = ref<AlertLevel | null>(null)
const filterStatus = ref<AlertStatus | null>(null)
const filterType = ref<string | null>(null)
const analyzingId = ref<string | null>(null)

const levelOptions = [
  { label: '严重', value: 'critical' },
  { label: '警告', value: 'warning' },
  { label: '信息', value: 'info' },
]

const statusOptions = [
  { label: '未处理', value: 'unhandled' },
  { label: '处理中', value: 'processing' },
  { label: '已解决', value: 'resolved' },
]

const typeOptions = [
  { label: '关键词', value: 'keyword' },
  { label: '情感', value: 'sentiment' },
  { label: '量激增', value: 'volume' },
  { label: '传播', value: 'propagation' },
]

const stats = computed(() => alertStore.alertStats)

const filteredAlerts = computed(() => {
  let result = alertStore.alerts
  
  if (filterLevel.value) {
    result = result.filter((a) => a.level === filterLevel.value)
  }
  
  if (filterStatus.value) {
    result = result.filter((a) => a.status === filterStatus.value)
  }
  
  if (filterType.value) {
    // 从 ruleId 获取规则类型
    result = result.filter((a) => {
      const rule = alertStore.rules.find((r) => r.id === a.ruleId)
      return rule?.type === filterType.value
    })
  }
  
  return result
})

onMounted(async () => {
  await alertStore.loadAlerts()
})

const formatTime = (time: string) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

const getStatusName = (status: AlertStatus) => {
  const map: Record<AlertStatus, string> = {
    unhandled: '未处理',
    processing: '处理中',
    resolved: '已解决',
  }
  return map[status]
}

const getStatusTag = (status: AlertStatus) => {
  const map: Record<AlertStatus, string> = {
    unhandled: 'error',
    processing: 'warning',
    resolved: 'success',
  }
  return map[status]
}

const getTypeName = (type: string) => {
  const map: Record<string, string> = {
    keyword: '关键词',
    sentiment: '情感',
    volume: '量激增',
    propagation: '传播',
  }
  return map[type] || type
}

const getTypeTag = (type: string) => {
  const map: Record<string, string> = {
    keyword: 'success',
    sentiment: 'warning',
    volume: 'info',
    propagation: 'error',
  }
  return map[type] || 'default'
}

const getRuleType = (alert: AlertEvent): string => {
  const rule = alertStore.rules.find((r) => r.id === alert.ruleId)
  return rule?.type || 'unknown'
}

const handleAnalyze = async (alert: AlertEvent) => {
  analyzingId.value = alert.id
  
  try {
    // 获取关联的数据
    const alertData: any[] = []
    
    // 从 IndexedDB 获取数据
    const { db } = await import('@/db/indexedDB')
    
    for (const dataId of alert.dataIds) {
      // 尝试从 webmedia 表获取
      try {
        const webmediaId = typeof dataId === 'string' && dataId.startsWith('WM') 
          ? parseInt(dataId.replace('WM', ''), 10) 
          : typeof dataId === 'number' ? dataId : parseInt(String(dataId), 10)
        if (!isNaN(webmediaId)) {
          const webmedia = await db.webmedia.get(webmediaId)
          if (webmedia) {
            alertData.push(webmedia)
            continue
          }
        }
      } catch (e) {
        // 忽略错误，继续尝试 weibo
      }
      
      // 尝试从 weibos 表获取
      try {
        const weiboId = typeof dataId === 'string' && dataId.startsWith('WB')
          ? parseInt(dataId.replace('WB', ''), 10)
          : typeof dataId === 'number' ? dataId : parseInt(String(dataId), 10)
        if (!isNaN(weiboId)) {
          const weibo = await db.weibos.get(weiboId)
          if (weibo) {
            alertData.push(weibo)
            continue
          }
        }
      } catch (e) {
        // 忽略错误
      }
    }
    
    if (alertData.length === 0) {
      message.warning('未找到关联数据')
      return
    }
    
    // 调用 AI 分析
    const advisor = createAlertAdvisor()
    const ruleType = getRuleType(alert) as 'keyword' | 'sentiment' | 'volume' | 'spread'
    const analysis = await advisor.analyze(alertData, ruleType, alert.level)
    
    // 更新预警记录
    await alertStore.updateAlertAnalysis(alert.id, analysis.cause, analysis.advice)
    
    message.success('AI 分析完成')
  } catch (err) {
    message.error('AI 分析失败: ' + (err instanceof Error ? err.message : '未知错误'))
  } finally {
    analyzingId.value = null
  }
}

const handleUpdateStatus = async (id: string, status: AlertStatus) => {
  try {
    await alertStore.updateAlertStatus(id, status)
    message.success('状态更新成功')
  } catch (err) {
    message.error('状态更新失败')
  }
}

const handleViewDetails = (alert: AlertEvent) => {
  dialog.info({
    title: '预警详情',
    content: `
      <div>
        <p><strong>标题：</strong>${alert.title}</p>
        <p><strong>详情：</strong>${alert.description}</p>
        <p><strong>级别：</strong>${alert.level}</p>
        <p><strong>状态：</strong>${getStatusName(alert.status)}</p>
        <p><strong>类型：</strong>${getTypeName(getRuleType(alert))}</p>
        <p><strong>触发时间：</strong>${formatTime(alert.triggeredAt)}</p>
        ${alert.cause ? `<p><strong>原因：</strong>${alert.cause}</p>` : ''}
        ${alert.advice && alert.advice.length > 0 ? `<p><strong>建议：</strong><ul>${alert.advice.map(a => `<li>${a}</li>`).join('')}</ul></p>` : ''}
      </div>
    `,
    positiveText: '关闭',
  })
}

const handleExport = () => {
  // TODO: 实现导出功能
  message.info('导出功能开发中')
}

const handleRefresh = async () => {
  await alertStore.loadAlerts()
  message.success('刷新成功')
}
</script>

<style scoped>
.alert-panel {
  @apply w-full space-y-4;
}

.stats-grid {
  @apply grid grid-cols-3 md:grid-cols-6 gap-4;
}

.stat-card {
  @apply bg-gray-800 text-gray-200 text-center;
}

.stat-value {
  @apply text-2xl font-bold mb-1;
}

.stat-label {
  @apply text-sm text-gray-400;
}

.toolbar {
  @apply flex justify-between items-center;
}

.alert-list-card {
  @apply bg-gray-800 text-gray-200;
}

.alert-item {
  @apply space-y-2;
}

.alert-header {
  @apply flex items-center gap-2 flex-wrap;
}

.alert-time {
  @apply text-xs text-gray-400 ml-auto;
}

.alert-title {
  @apply font-semibold text-base;
}

.alert-message {
  @apply text-sm text-gray-300;
}

.alert-analysis {
  @apply bg-gray-700 p-3 rounded mt-2;
}

.analysis-cause {
  @apply text-sm mb-2;
}

.analysis-advice {
  @apply text-sm;
}

.analysis-advice ul {
  @apply list-disc list-inside mt-1 space-y-1;
}

.alert-actions {
  @apply flex gap-2 mt-2;
}
</style>

