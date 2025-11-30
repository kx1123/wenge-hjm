<template>
  <div class="chart-card">
    <div class="chart-header">
      <span class="chart-icon">📊</span>
      <span class="chart-title">数据源占比</span>
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
import { TitleComponent, TooltipComponent, LegendComponent, GraphicComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { useDataStore } from '@/stores/data'
import dayjs from 'dayjs'

use([CanvasRenderer, PieChart, TitleComponent, TooltipComponent, LegendComponent, GraphicComponent])

const dataStore = useDataStore()

const chartOption = computed(() => {
  const webmediaCount = dataStore.webmediaData.length
  const weiboCount = dataStore.weiboData.length
  const total = webmediaCount + weiboCount
  const updateTime = dayjs().format('HH:mm:ss')

  if (total === 0) {
    return {
      backgroundColor: 'transparent',
      textStyle: { color: '#ffffff' },
      graphic: [{ type: 'text', left: 'center', top: 'center', style: { text: '暂无数据', fontSize: 16, fill: '#ffffff', textAlign: 'center' } }],
    }
  }

  return {
    backgroundColor: 'transparent',
    textStyle: { color: '#ffffff' },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      borderColor: '#00ffff',
      borderWidth: 2,
      textStyle: { color: '#ffffff' },
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      textStyle: { color: '#ffffff', fontSize: 12 },
      data: ['网媒', '微博'],
    },
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: '45%',
        style: {
          text: `总舆情数\n${total}`,
          fontSize: 18,
          fontWeight: 'bold',
          fill: '#00ffff',
          textAlign: 'center',
          textVerticalAlign: 'middle',
        },
      },
      {
        type: 'text',
        left: 'center',
        top: '60%',
        style: {
          text: `更新: ${updateTime}`,
          fontSize: 12,
          fill: '#9ca3af',
          textAlign: 'center',
        },
      },
    ],
    series: [
      {
        name: '数据源',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['60%', '50%'],
        itemStyle: { borderRadius: 10, borderColor: 'rgba(0, 0, 0, 0.5)', borderWidth: 2 },
        label: {
          show: true,
          formatter: '{b}\n{c} ({d}%)',
          color: '#ffffff',
          fontSize: 12,
          fontWeight: 'bold',
        },
        labelLine: { show: true, lineStyle: { color: '#ffffff', width: 2 } },
        data: [
          { value: webmediaCount, name: '网媒', itemStyle: { color: '#00ffff' } },
          { value: weiboCount, name: '微博', itemStyle: { color: '#00ff88' } },
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
