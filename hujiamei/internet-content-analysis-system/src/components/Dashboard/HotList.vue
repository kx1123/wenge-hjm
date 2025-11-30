<template>
  <div class="chart-card">
    <div class="chart-header">
      <span class="chart-icon">⭐</span>
      <span class="chart-title">{{ title }}</span>
    </div>
    <div class="chart-content">
      <div v-if="hotItems.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-text">暂无数据</div>
      </div>
      <TransitionGroup v-else name="list" tag="div" class="hot-list">
        <div
          v-for="(item, index) in hotItems"
          :key="item.id"
          class="hot-item"
          :class="{ 'hot-item-new': item.isNew }"
        >
          <div class="hot-rank">{{ index + 1 }}</div>
          <div class="hot-info">
            <div class="hot-title" v-if="type === 'webmedia'">
              {{ (item as any).title || (item as any).content || '无标题' }}
            </div>
            <div class="hot-content" v-else>
              {{ (item as any).content || '无内容' }}
            </div>
            <div class="hot-meta">
              <span v-if="type === 'webmedia'" class="hot-source">
                {{ (item as any).source || '未知来源' }}
              </span>
              <span v-else class="hot-user">
                {{ (item as any).userName || '未知用户' }}
              </span>
              <span class="hot-count">
                {{ type === 'webmedia' ? `转发: ${(item as any).shareCount || 0}` : `互动: ${getInteractionCount(item)}` }}
              </span>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, TransitionGroup } from 'vue'
import { useDataStore } from '@/stores/data'
import type { WebMediaData, WeiboData } from '@/interfaces/data'

interface Props {
  title: string
  type: 'webmedia' | 'weibo'
}

const props = defineProps<Props>()
const dataStore = useDataStore()
const previousIds = ref<Set<string | number>>(new Set())

interface HotItem {
  id: string | number
  isNew: boolean
  [key: string]: any
}

const hotItems = computed<HotItem[]>(() => {
  const data = props.type === 'webmedia' ? dataStore.webmediaData : dataStore.weiboData

  if (data.length === 0) {
    return []
  }

  const items = data
    .map((item) => {
      if (props.type === 'webmedia') {
        const wm = item as WebMediaData
        // 计算热度分数：优先使用 shareCount，如果没有则使用 viewCount，都没有则使用 1（确保有数据展示）
        const score = (wm.shareCount || 0) + (wm.viewCount || 0) * 0.1 || 1
        return {
          id: wm.id!,
          ...wm,
          score,
        }
      } else {
        const wb = item as WeiboData
        // 计算热度分数：互动量，如果没有则使用 1（确保有数据展示）
        const score = (wb.likeCount || 0) + (wb.commentCount || 0) * 2 + (wb.repostCount || 0) * 3 || 1
        return {
          id: wb.id!,
          ...wb,
          score,
        }
      }
    })
    .filter((item) => item.id) // 确保有 id
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((item) => ({
      ...item,
      isNew: !previousIds.value.has(item.id),
    }))

  // 更新 previousIds
  const currentIds = new Set(items.map((i) => i.id))
  previousIds.value = currentIds

  // 3秒后移除NEW标记
  items.forEach((item) => {
    if (item.isNew) {
      setTimeout(() => {
        item.isNew = false
      }, 3000)
    }
  })

  return items
})

const getInteractionCount = (item: any): number => {
  return (item.likeCount || 0) + (item.commentCount || 0) + (item.repostCount || 0)
}

watch(
  () => [dataStore.webmediaData.length, dataStore.weiboData.length],
  () => {
    // 数据变化时触发重新计算
  },
  { deep: true }
)
</script>

<style scoped>
.chart-card {
  @apply bg-gray-800/80 border border-blue-500/30 rounded-lg p-4 shadow-[0_0_10px_rgba(59,130,246,0.3)] backdrop-blur-sm;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
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
  overflow-y: auto;
  overflow-x: hidden;
}

.hot-list {
  @apply space-y-2;
}

.hot-item {
  @apply flex items-start gap-3 p-3 bg-gray-700/50 rounded-lg border border-gray-600/30 transition-all;
}

.hot-item-new {
  @apply border-orange-500/50 bg-orange-500/10;
  animation: slideIn 0.5s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.hot-rank {
  @apply flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/30 border border-blue-500/50 flex items-center justify-center text-blue-300 font-bold text-sm;
}

.hot-info {
  @apply flex-1 min-w-0;
}

.hot-title,
.hot-content {
  @apply text-sm text-gray-200 font-medium mb-1 truncate;
}

.hot-meta {
  @apply flex items-center gap-3 text-xs text-gray-400;
}

.hot-source,
.hot-user {
  @apply text-blue-300;
}

.hot-count {
  @apply text-green-300;
}

/* TransitionGroup 动画 */
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.list-move {
  transition: transform 0.5s ease;
}

/* 自定义滚动条样式 */
.chart-content::-webkit-scrollbar {
  width: 6px;
}

.chart-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
}

.chart-content::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #3b82f6 0%, #8b5cf6 100%);
  border-radius: 3px;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
}

.chart-content::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #2563eb 0%, #7c3aed 100%);
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.6);
}

/* 空状态样式 */
.empty-state {
  @apply flex flex-col items-center justify-center h-full text-gray-400;
  min-height: 200px;
}

.empty-icon {
  @apply text-4xl mb-2 opacity-50;
}

.empty-text {
  @apply text-sm font-medium;
}
</style>
