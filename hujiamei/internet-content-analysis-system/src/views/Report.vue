<template>
  <div class="report-view p-6">
    <n-card>
      <template #header>
        <h2 class="text-2xl font-bold">数据分析报告</h2>
      </template>

      <n-space vertical>
        <n-space>
          <n-select
            v-model:value="reportType"
            :options="reportTypeOptions"
            style="width: 200px"
          />
          <n-date-picker
            v-model:value="dateRange"
            type="daterange"
            clearable
            placeholder="选择时间范围"
          />
          <n-button type="primary" @click="handleGenerateReport" :loading="generating">
            生成报告
          </n-button>
        </n-space>

        <n-card v-if="reportContent" title="报告内容">
          <div class="report-content whitespace-pre-wrap">{{ reportContent }}</div>
          <template #footer>
            <n-space justify="end">
              <n-button @click="handleCopyReport">复制报告</n-button>
              <n-button type="primary" @click="handleDownloadReport">下载报告</n-button>
            </n-space>
          </template>
        </n-card>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  NCard,
  NSpace,
  NSelect,
  NDatePicker,
  NButton,
  useMessage,
} from 'naive-ui'
import { createAIAnalyzer } from '@/ai/client'
import { getReportPrompt } from '@/ai/prompts/report'
import { useDataStore } from '@/stores/data'
import { getSentimentStats } from '@/db/indexedDB'
import dayjs from 'dayjs'

const message = useMessage()
const dataStore = useDataStore()

const reportType = ref<'webmedia' | 'weibo' | 'all'>('all')
const dateRange = ref<[number, number] | null>(null)
const reportContent = ref('')
const generating = ref(false)

const reportTypeOptions = [
  { label: '全部数据', value: 'all' },
  { label: '网媒数据', value: 'webmedia' },
  { label: '微博数据', value: 'weibo' },
]

const handleGenerateReport = async () => {
  generating.value = true
  reportContent.value = ''

  try {
    const stats = await getSentimentStats()
    const timeRange = dateRange.value
      ? `${dayjs(dateRange.value[0]).format('YYYY-MM-DD')} 至 ${dayjs(dateRange.value[1]).format('YYYY-MM-DD')}`
      : '全部时间'

    if (reportType.value === 'all') {
      // 生成综合报告
      const total = stats.webmedia.positive + stats.webmedia.neutral + stats.webmedia.negative
        + stats.weibos.positive + stats.weibos.neutral + stats.weibos.negative

      const prompt = getReportPrompt('webmedia', {
        total,
        positive: stats.webmedia.positive + stats.weibos.positive,
        neutral: stats.webmedia.neutral + stats.weibos.neutral,
        negative: stats.webmedia.negative + stats.weibos.negative,
        topKeywords: [],
        timeRange,
      })

      const analyzer = createAIAnalyzer({ mock: true })
      reportContent.value = await analyzer.chat([{ role: 'user', content: prompt }])
    } else {
      const typeStats = reportType.value === 'webmedia' ? stats.webmedia : stats.weibos
      const total = typeStats.positive + typeStats.neutral + typeStats.negative

      const prompt = getReportPrompt(reportType.value, {
        total,
        positive: typeStats.positive,
        neutral: typeStats.neutral,
        negative: typeStats.negative,
        topKeywords: [],
        timeRange,
      })

      const analyzer = createAIAnalyzer({ mock: true })
      reportContent.value = await analyzer.chat([{ role: 'user', content: prompt }])
    }
  } catch (error) {
    message.error('生成报告失败')
    console.error(error)
  } finally {
    generating.value = false
  }
}

const handleCopyReport = async () => {
  try {
    await navigator.clipboard.writeText(reportContent.value)
    message.success('报告已复制到剪贴板')
  } catch (error) {
    message.error('复制失败')
  }
}

const handleDownloadReport = () => {
  const blob = new Blob([reportContent.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `数据分析报告_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.txt`
  a.click()
  URL.revokeObjectURL(url)
  message.success('报告下载成功')
}
</script>

<style scoped>
.report-view {
  max-width: 1200px;
  margin: 0 auto;
}

.report-content {
  line-height: 1.8;
  padding: 1rem;
  background-color: #f9fafb;
  border-radius: 6px;
}
</style>

