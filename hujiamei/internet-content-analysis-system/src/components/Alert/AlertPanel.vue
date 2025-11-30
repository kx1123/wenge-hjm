<template>
  <div class="alert-panel">
    <n-card title="预警记录" class="alert-card">
      <template #header-extra>
        <n-space>
          <n-tag :type="stats.unhandled > 0 ? 'error' : 'success'">
            未处理: {{ stats.unhandled }}
          </n-tag>
          <n-tag type="info">总计: {{ stats.total }}</n-tag>
        </n-space>
      </template>

      <!-- 筛选栏 -->
      <div class="filter-bar mb-4">
        <n-space>
          <n-input
            v-model:value="searchKeyword"
            placeholder="搜索预警消息..."
            clearable
            style="width: 300px"
          />
          <n-select
            v-model:value="filterSeverity"
            placeholder="筛选级别"
            clearable
            style="width: 150px"
            :options="severityFilterOptions"
          />
          <n-select
            v-model:value="filterStatus"
            placeholder="筛选状态"
            clearable
            style="width: 150px"
            :options="statusFilterOptions"
          />
        </n-space>
      </div>

      <n-data-table
        :columns="columns"
        :data="filteredAlerts"
        :pagination="pagination"
        :loading="loading"
      />
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, h, computed } from 'vue'
import { NCard, NDataTable, NTag, NSpace, NButton, NInput, NSelect, useMessage } from 'naive-ui'
import { useAlertStore } from '@/stores/alertStore'
import { createAlertAdvisor } from '@/ai/alertAdvisor'
import type { AlertRecord } from '@/interfaces/alert'
import dayjs from 'dayjs'

const alertStore = useAlertStore()
const message = useMessage()
const loading = ref(false)
const alertAdvisor = createAlertAdvisor()

const stats = alertStore.alertStats

const pagination = {
  pageSize: 10,
}

// 筛选
const searchKeyword = ref('')
const filterSeverity = ref<'high' | 'medium' | 'low' | null>(null)
const filterStatus = ref<'unhandled' | 'handled' | null>(null)

const severityFilterOptions = [
  { label: '严重', value: 'high' },
  { label: '警告', value: 'medium' },
  { label: '提示', value: 'low' },
]

const statusFilterOptions = [
  { label: '未处理', value: 'unhandled' },
  { label: '已处理', value: 'handled' },
]

const filteredAlerts = computed(() => {
  let result = alertStore.alerts

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(alert => 
      alert.message.toLowerCase().includes(keyword) ||
      alert.ruleType.toLowerCase().includes(keyword)
    )
  }

  if (filterSeverity.value) {
    result = result.filter(alert => alert.severity === filterSeverity.value)
  }

  if (filterStatus.value) {
    if (filterStatus.value === 'unhandled') {
      result = result.filter(alert => !alert.acknowledged)
    } else {
      result = result.filter(alert => alert.acknowledged)
    }
  }

  return result
})

const columns = [
  {
    title: '时间',
    key: 'createdAt',
    width: 180,
    render: (row: AlertRecord) => dayjs(row.createdAt).format('YYYY-MM-DD HH:mm:ss'),
  },
  {
    title: '类型',
    key: 'ruleType',
    width: 100,
    render: (row: AlertRecord) => {
      const typeMap: Record<string, string> = {
        keyword: '关键词',
        sentiment: '情感',
        volume: '量激增',
      }
      return typeMap[row.ruleType] || row.ruleType
    },
  },
  {
    title: '级别',
    key: 'severity',
    width: 100,
    render: (row: AlertRecord) => {
      const typeMap: Record<string, any> = {
        high: { type: 'error', text: '严重' },
        medium: { type: 'warning', text: '警告' },
        low: { type: 'info', text: '提示' },
      }
      const config = typeMap[row.severity] || { type: 'default', text: row.severity }
      return h(NTag, { type: config.type }, { default: () => config.text })
    },
  },
  {
    title: '消息',
    key: 'message',
    ellipsis: { tooltip: true },
  },
  {
    title: '状态',
    key: 'acknowledged',
    width: 100,
    render: (row: AlertRecord) => {
      return h(
        NTag,
        { type: row.acknowledged ? 'success' : 'error' },
        { default: () => (row.acknowledged ? '已处理' : '未处理') }
      )
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 250,
    render: (row: AlertRecord) => {
      return h(NSpace, { size: 'small' }, {
        default: () => [
          h(
            NButton,
            {
              size: 'small',
              type: 'info',
              onClick: () => handleAnalyze(row),
              loading: analyzingIds.value.includes(row.id),
            },
            { default: () => 'AI诊断' }
          ),
          h(
            NButton,
            {
              size: 'small',
              type: row.acknowledged ? 'default' : 'primary',
              onClick: () => handleAcknowledge(row),
            },
            { default: () => (row.acknowledged ? '取消处理' : '标记处理') }
          ),
        ],
      })
    },
  },
]

const analyzingIds = ref<string[]>([])
const analysisResults = ref<Record<string, { cause: string; advice: string[] }>>({})

async function handleAnalyze(alert: AlertRecord) {
  if (analyzingIds.value.includes(alert.id)) return

  analyzingIds.value.push(alert.id)
  
  try {
    // 获取关联的数据样本
    const dataSamples: any[] = []
    // 这里应该从数据库获取实际数据，暂时使用空数组
    // const dataSamples = await fetchAlertData(alert.dataIds)
    
    const result = await alertAdvisor.analyzeCauseAndAdvice(alert, dataSamples)
    analysisResults.value[alert.id] = result
    
    // 显示分析结果
    message.info({
      content: `原因：${result.cause}\n建议：${result.advice.join('；')}`,
      duration: 5000,
    })
  } catch (error) {
    console.error('AI诊断失败:', error)
    message.error('AI诊断失败，请稍后重试')
  } finally {
    analyzingIds.value = analyzingIds.value.filter(id => id !== alert.id)
  }
}

function handleAcknowledge(alert: AlertRecord) {
  alertStore.updateAlertStatus(alert.id, !alert.acknowledged)
  message.success(alert.acknowledged ? '已取消处理' : '已标记为处理')
}
</script>

<style scoped>
.alert-panel {
  margin-top: 2rem;
}

.alert-card {
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}
</style>

