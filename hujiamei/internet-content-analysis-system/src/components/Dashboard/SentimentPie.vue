<template>
  <div class="chart-card">
    <div class="chart-header">
      <span class="chart-icon">🎯</span>
      <span class="chart-title">情感分布对比</span>
    </div>
    <div class="chart-content">
      <v-chart :option="chartOption" class="h-full" autoresize />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { useDataStore } from '@/stores/data'
import { getSentimentStats } from '@/db/indexedDB'
import { ref, watch } from 'vue'

use([CanvasRenderer, PieChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

const dataStore = useDataStore()
const webmediaStats = ref({ positive: 0, neutral: 0, negative: 0 })
const weiboStats = ref({ positive: 0, neutral: 0, negative: 0 })

const updateStats = async () => {
  const stats = await getSentimentStats()
  webmediaStats.value = stats.webmedia
  weiboStats.value = stats.weibos
}

watch(() => [dataStore.webmediaData.length, dataStore.weiboData.length], updateStats, { immediate: true })

const chartOption = computed(() => {
  const webmediaTotal = webmediaStats.value.positive + webmediaStats.value.neutral + webmediaStats.value.negative
  const weiboTotal = weiboStats.value.positive + weiboStats.value.neutral + weiboStats.value.negative

  return {
    backgroundColor: 'transparent',
    textStyle: { color: '#ffffff' },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      borderColor: '#00ffff',
      borderWidth: 2,
      textStyle: { color: '#ffffff' },
      formatter: (params: any) => {
        const total = params.seriesName === '网媒情感' ? webmediaTotal : weiboTotal
        const percent = total > 0 ? ((params.value / total) * 100).toFixed(1) : 0
        return `${params.name}<br/>${params.value} (${percent}%)`
      },
    },
    grid: [
      { left: '5%', top: '10%', width: '45%', height: '80%' },
      { right: '5%', top: '10%', width: '45%', height: '80%' },
    ],
    legend: {
      show: false,
    },
    series: [
      {
        name: '网媒情感',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['25%', '50%'],
        itemStyle: { borderRadius: 10, borderColor: 'rgba(0, 0, 0, 0.5)', borderWidth: 2 },
        label: {
          show: true,
          formatter: '{b}\n{c} ({d}%)',
          color: '#ffffff',
          fontSize: 11,
          fontWeight: 'bold',
        },
        labelLine: { show: true, lineStyle: { color: '#ffffff' } },
        data: [
          { value: webmediaStats.value.positive, name: '正面', itemStyle: { color: '#60a5fa' } },
          { value: webmediaStats.value.neutral, name: '中性', itemStyle: { color: '#94a3b8' } },
          { value: webmediaStats.value.negative, name: '负面', itemStyle: { color: '#64748b' } },
        ],
      },
      {
        name: '微博情感',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['75%', '50%'],
        itemStyle: { borderRadius: 10, borderColor: 'rgba(0, 0, 0, 0.5)', borderWidth: 2 },
        label: {
          show: true,
          formatter: '{b}\n{c} ({d}%)',
          color: '#ffffff',
          fontSize: 11,
          fontWeight: 'bold',
        },
        labelLine: { show: true, lineStyle: { color: '#ffffff' } },
        data: [
          { value: weiboStats.value.positive, name: '正面', itemStyle: { color: '#10b981' } },
          { value: weiboStats.value.neutral, name: '中性', itemStyle: { color: '#fbbf24' } },
          { value: weiboStats.value.negative, name: '负面', itemStyle: { color: '#ef4444' } },
        ],
      },
    ],
  }
})
</script>

<style scoped>
.chart-card {
  @apply bg-gray-800/80 border border-blue-500/30 rounded-lg p-4 shadow-[0_0_10px_rgba(59,130,246,0.3)] backdrop-blur-sm;
  transition: all 0.3s ease;
  position: relative;
  overflow: visible;
  display: flex;
  flex-direction: column;
}

.chart-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, #3b82f6, transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.chart-card:hover {
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
  transform: translateY(-2px);
}

.chart-card:hover::before {
  opacity: 1;
}

.chart-header {
  @apply flex items-center gap-2 mb-3 text-gray-200;
}

.chart-icon {
  @apply text-xl;
}

.chart-title {
  @apply text-sm font-semibold;
}

.chart-content {
  flex: 1;
  min-height: 0;
  width: 100%;
}

</style>
