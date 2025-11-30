<template>
  <n-config-provider :theme="theme">
    <n-message-provider>
      <n-dialog-provider>
        <n-layout class="app-layout">
        <n-layout-header class="app-header" bordered>
          <div class="header-content">
            <h1 class="text-2xl font-bold">互联网内容分析系统</h1>
            <n-space>
              <n-button
                quaternary
                :type="currentRoute === '/upload' ? 'primary' : 'default'"
                @click="$router.push('/upload')"
              >
                数据上传
              </n-button>
              <n-button
                quaternary
                :type="currentRoute === '/dashboard' ? 'primary' : 'default'"
                @click="$router.push('/dashboard')"
              >
                数据大屏
              </n-button>
            <n-button
              quaternary
              :type="currentRoute === '/report' ? 'primary' : 'default'"
              @click="$router.push('/report')"
            >
              分析报告
            </n-button>
            <n-button
              quaternary
              :type="currentRoute === '/data-list' ? 'primary' : 'default'"
              @click="$router.push('/data-list')"
            >
              数据列表
            </n-button>
            <n-button
              quaternary
              :type="currentRoute === '/ai-analysis' ? 'primary' : 'default'"
              @click="$router.push('/ai-analysis')"
            >
              AI智能分析
            </n-button>
            <n-button
              quaternary
              :type="currentRoute === '/alert-system' ? 'primary' : 'default'"
              @click="$router.push('/alert-system')"
            >
              智能预警
            </n-button>
            </n-space>
          </div>
        </n-layout-header>

        <n-layout-content class="app-content">
          <router-view />
        </n-layout-content>

        <!-- 预警 Toast -->
        <AlertToast
          v-for="toast in activeToasts"
          :key="toast.id"
          :level="toast.level"
          :title="toast.title"
          :message="toast.message"
          :duration="toast.duration"
          @close="removeToast(toast.id)"
        />

        <!-- AI聊天助手（固定在底部） -->
        <Transition name="slide-up">
          <div v-if="showChatPanel" class="ai-chat-container">
            <AIChatPanel :on-send="handleChatSend" />
            <n-button
              class="close-chat-btn"
              circle
              size="small"
              type="error"
              @click="showChatPanel = false"
            >
              <template #icon>
                <span>✕</span>
              </template>
            </n-button>
          </div>
        </Transition>
        
        <!-- 打开聊天助手按钮（当面板关闭时显示） -->
        <Transition name="fade">
          <n-button
            v-if="!showChatPanel"
            class="open-chat-btn"
            circle
            type="primary"
            size="large"
            @click="showChatPanel = true"
          >
            <template #icon>
              <span>💬</span>
            </template>
          </n-button>
        </Transition>
      </n-layout>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NLayout,
  NLayoutHeader,
  NLayoutContent,
  NButton,
  NSpace,
  darkTheme,
} from 'naive-ui'
import AIChatPanel from '@/components/AIChatPanel.vue'
import AlertToast from '@/components/Alert/AlertToast.vue'
import { useAlertStore } from '@/stores/alertStore'
import { createChatEngine } from '@/ai/chatEngine'
import { db } from '@/db/indexedDB'
import type { AlertLevel } from '@/interfaces/alert'

const route = useRoute()
const router = useRouter()
const alertStore = useAlertStore()

const currentRoute = computed(() => route.path)
const theme = darkTheme

// 聊天助手状态
const showChatPanel = ref(true) // 默认显示
const chatEngine = createChatEngine(db)

// 处理聊天消息
async function handleChatSend(message: string, history: any[] = []): Promise<{ content: string }> {
  try {
    // 使用 chatEngine 发送消息并返回回复，传递历史消息以支持多轮对话
    const reply = await chatEngine.sendMessage(message, history)
    return reply
  } catch (error) {
    console.error('聊天发送失败:', error)
    throw error
  }
}

// 预警 Toast 管理
interface ToastItem {
  id: string
  level: AlertLevel
  title: string
  message: string
  duration: number
}

const activeToasts = ref<ToastItem[]>([])
let lastAlertCount = 0

// 监听新预警
watch(
  () => alertStore.alerts.length,
  (newCount) => {
    if (newCount > lastAlertCount) {
      // 有新预警，显示 Toast
      const newAlerts = alertStore.alerts.slice(0, newCount - lastAlertCount)
      for (const alert of newAlerts.reverse()) {
        // 只显示未处理的严重和警告级别预警
        if (alert.status === 'unhandled' && (alert.level === 'critical' || alert.level === 'warning')) {
          activeToasts.value.push({
            id: alert.id,
            level: alert.level,
            title: alert.title,
            message: alert.message,
            duration: alert.level === 'critical' ? 8000 : 5000,
          })
        }
      }
    }
    lastAlertCount = newCount
  }
)

const removeToast = (id: string) => {
  const index = activeToasts.value.findIndex((t) => t.id === id)
  if (index !== -1) {
    activeToasts.value.splice(index, 1)
  }
}

onMounted(async () => {
  await alertStore.init()
  lastAlertCount = alertStore.alerts.length
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    sans-serif;
}

#app {
  width: 100%;
  height: 100vh;
}

.app-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  padding: 1rem 2rem;
  background-color: #1a1a1a;
  color: white;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.app-content {
  flex: 1;
  overflow-y: auto;
  background-color: #0a0a0a;
}

.ai-chat-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 400px;
  height: 500px;
  max-height: calc(100vh - 40px);
  z-index: 1000;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  overflow: hidden;
}

.close-chat-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1001;
  background-color: rgba(239, 68, 68, 0.9) !important;
  border: none !important;
  width: 28px;
  height: 28px;
  min-width: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-chat-btn:hover {
  background-color: rgba(239, 68, 68, 1) !important;
}

.open-chat-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 999;
  width: 56px;
  height: 56px;
  min-width: 56px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  border-radius: 50%;
}

/* 动画 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-up-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

