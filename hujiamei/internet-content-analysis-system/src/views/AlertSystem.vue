<template>
  <div class="alert-system-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          <span class="title-icon">⚠️</span>
          智能预警系统
        </h1>
        <p class="page-subtitle">实时监控舆情动态，智能预警风险事件</p>
      </div>
      <n-space>
        <n-button @click="handleRefresh" :loading="loading">
          <template #icon>
            <span>🔄</span>
          </template>
          刷新
        </n-button>
        <n-button 
          type="primary" 
          @click="showRuleEditor = !showRuleEditor"
          :class="{ 'active': showRuleEditor }"
        >
          <template #icon>
            <span>{{ showRuleEditor ? '📝' : '⚙️' }}</span>
          </template>
          {{ showRuleEditor ? '隐藏规则配置' : '规则配置' }}
        </n-button>
      </n-space>
    </div>

    <!-- 快速统计卡片 -->
    <div class="quick-stats">
      <n-card class="stat-card">
        <div class="stat-icon critical">🔴</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.byLevel.critical }}</div>
          <div class="stat-label">严重预警</div>
        </div>
      </n-card>
      <n-card class="stat-card">
        <div class="stat-icon warning">🟠</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.byLevel.warning }}</div>
          <div class="stat-label">警告预警</div>
        </div>
      </n-card>
      <n-card class="stat-card">
        <div class="stat-icon unhandled">⏳</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.unhandled }}</div>
          <div class="stat-label">未处理</div>
        </div>
      </n-card>
      <n-card class="stat-card">
        <div class="stat-icon total">📊</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">总预警数</div>
        </div>
      </n-card>
    </div>

    <!-- 规则配置器 -->
    <Transition name="slide">
      <div v-if="showRuleEditor" class="rule-editor-section">
        <AlertRuleEditor />
      </div>
    </Transition>

    <!-- 预警看板 -->
    <div class="alert-panel-section">
      <AlertPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { NButton, NSpace, NCard, useMessage } from 'naive-ui'
import AlertRuleEditor from '@/components/Alert/AlertRuleEditor.vue'
import AlertPanel from '@/components/Alert/AlertPanel.vue'
import { useAlertStore } from '@/stores/alertStore'

const alertStore = useAlertStore()
const message = useMessage()
const showRuleEditor = ref(false)
const loading = ref(false)

const stats = computed(() => alertStore.alertStats)

const handleRefresh = async () => {
  loading.value = true
  try {
    await Promise.all([alertStore.loadRules(), alertStore.loadAlerts()])
    message.success('刷新成功')
  } catch (err) {
    message.error('刷新失败')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await alertStore.init()
})
</script>

<style scoped>
.alert-system-page {
  @apply min-h-screen bg-gray-900 text-gray-200 p-6;
  background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1419 100%);
}

.page-header {
  @apply flex justify-between items-start mb-6;
  padding: 1.5rem;
  background: rgba(26, 31, 58, 0.6);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.header-left {
  @apply flex-1;
}

.page-title {
  @apply text-3xl font-bold text-white mb-2;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.title-icon {
  @apply text-4xl;
  animation: pulse 2s ease-in-out infinite;
}

.page-subtitle {
  @apply text-gray-400 text-sm;
}

.quick-stats {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6;
}

.stat-card {
  @apply bg-gray-800 text-gray-200;
  border: 1px solid rgba(59, 130, 246, 0.2);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
  border-color: rgba(59, 130, 246, 0.5);
}

.stat-card {
  @apply flex items-center gap-4 p-4;
}

.stat-icon {
  @apply text-3xl;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(59, 130, 246, 0.1);
}

.stat-icon.critical {
  background: rgba(239, 68, 68, 0.2);
  animation: blink 2s ease-in-out infinite;
}

.stat-icon.warning {
  background: rgba(249, 115, 22, 0.2);
}

.stat-icon.unhandled {
  background: rgba(234, 179, 8, 0.2);
}

.stat-icon.total {
  background: rgba(59, 130, 246, 0.2);
}

.stat-content {
  @apply flex-1;
}

.stat-value {
  @apply text-2xl font-bold mb-1;
}

.stat-label {
  @apply text-sm text-gray-400;
}

.rule-editor-section {
  @apply mb-6;
}

.alert-panel-section {
  @apply w-full;
}

/* 过渡动画 */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
  max-height: 2000px;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
  margin-bottom: 0;
}

/* 动画 */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.1);
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
</style>

