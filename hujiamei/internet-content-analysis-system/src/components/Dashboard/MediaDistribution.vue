<template>
  <div class="chart-card">
    <div class="chart-header">
      <span class="chart-icon">📰</span>
      <span class="chart-title">媒体来源分布</span>
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
import { BarChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, GridComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { useDataStore } from '@/stores/data'

use([CanvasRenderer, BarChart, TitleComponent, TooltipComponent, GridComponent])

const dataStore = useDataStore()

const chartOption = computed(() => {
  // 网媒来源分布
  const sourceMap = new Map<string, number>()
  dataStore.webmediaData.forEach((item) => {
    const source = item.source || '未知'
    sourceMap.set(source, (sourceMap.get(source) || 0) + 1)
  })

  const sorted = Array.from(sourceMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  if (sorted.length === 0) {
    return {
      backgroundColor: 'transparent',
      textStyle: { color: '#ffffff' },
      xAxis: { type: 'value', axisLine: { lineStyle: { color: '#00ffff' } }, axisLabel: { color: '#ffffff' } },
      yAxis: { type: 'category', data: ['暂无数据'], inverse: true, axisLine: { lineStyle: { color: '#00ffff' } }, axisLabel: { color: '#ffffff' } },
      series: [{ type: 'bar', data: [0], itemStyle: { color: '#666666' } }],
    }
  }

  return {
    backgroundColor: 'transparent',
    textStyle: { color: '#ffffff' },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      borderColor: '#00ffff',
      borderWidth: 2,
      textStyle: { color: '#ffffff' },
    },
    grid: { left: '20%', right: '10%', bottom: '10%', top: '10%' },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#00ffff', width: 2 } },
      axisLabel: { color: '#ffffff', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(0, 255, 255, 0.1)' } },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(([s]) => s),
      inverse: true,
      axisLine: { lineStyle: { color: '#00ffff', width: 2 } },
      axisLabel: { color: '#ffffff', fontSize: 10 },
    },
    series: [
      {
        type: 'bar',
        data: sorted.map(([, count]) => count),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#00ffff' },
              { offset: 1, color: '#8a2be2' },
            ],
          },
          borderRadius: [0, 4, 4, 0],
        },
        label: {
          show: true,
          position: 'right',
          color: '#ffffff',
          fontSize: 11,
          fontWeight: 'bold',
        },
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
