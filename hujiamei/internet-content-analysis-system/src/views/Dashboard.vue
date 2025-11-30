<template>
  <div class="dashboard-view p-6">
    <n-card>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold">数据大屏</h2>
          <n-space>
            <n-button
              :type="simulator.isRunning ? 'error' : 'primary'"
              @click="simulator.isRunning ? simulator.stop() : simulator.start()"
            >
              {{ simulator.isRunning ? '停止模拟实时' : '启动模拟实时' }}
            </n-button>
            <n-tag v-if="simulator.latestItem" type="info" :bordered="false">
              最新: {{ simulator.latestItem.type === 'webmedia' ? '网媒' : '微博' }}
              <span v-if="simulator.latestItem.isNew" class="ml-2 text-red-500">NEW</span>
            </n-tag>
          </n-space>
        </div>
      </template>

      <!-- 实时数据流 -->
      <n-card v-if="simulator.isRunning" title="实时数据流" class="mb-4">
        <div class="realtime-stream">
          <div
            v-for="item in simulator.simulatedData.slice(0, 10)"
            :key="`${item.type}-${item.id}`"
            class="stream-item"
            :class="{ 'stream-item-new': item.isNew }"
          >
            <n-tag :type="item.type === 'webmedia' ? 'primary' : 'success'" size="small">
              {{ item.type === 'webmedia' ? '网媒' : '微博' }}
            </n-tag>
            <span v-if="item.isNew" class="new-badge">NEW</span>
            <span class="ml-2 text-sm">
              {{ item.type === 'webmedia' ? (item.data as any).title : (item.data as any).content.substring(0, 50) }}
            </span>
            <span class="ml-auto text-xs text-gray-500">
              {{ formatTime(item.timestamp) }}
            </span>
          </div>
        </div>
      </n-card>

      <!-- 图表面板 -->
      <EchartsPanel />

      <!-- 预警面板 -->
      <AlertPanel />
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { NCard, NButton, NSpace, NTag } from 'naive-ui'
import EchartsPanel from '@/components/Dashboard/EchartsPanel.vue'
import AlertPanel from '@/components/Dashboard/AlertPanel.vue'
import { useRealtimeSimulator } from '@/composables/useRealtimeSimulator'
import dayjs from 'dayjs'

const simulator = useRealtimeSimulator()

const formatTime = (time: string) => {
  return dayjs(time).format('HH:mm:ss')
}
</script>

<style scoped>
.dashboard-view {
  width: 100%;
}

.realtime-stream {
  max-height: 400px;
  overflow-y: auto;
}

.stream-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background-color: #f9fafb;
  border-radius: 6px;
  transition: all 0.3s;
}

.stream-item-new {
  background-color: #fef3c7;
  border: 2px solid #f59e0b;
  animation: highlight 2s ease-in-out;
}

@keyframes highlight {
  0%,
  100% {
    background-color: #fef3c7;
  }
  50% {
    background-color: #fde68a;
  }
}

.new-badge {
  display: inline-block;
  padding: 2px 6px;
  background-color: #ef4444;
  color: white;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
  margin-left: 0.5rem;
}
</style>

