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
            </n-space>
          </div>
        </n-layout-header>

        <n-layout-content class="app-content">
          <router-view />
        </n-layout-content>

        <!-- AI聊天助手（固定在底部） -->
        <!-- <div class="ai-chat-container">
          <AIChatPanel />
        </div> -->
      </n-layout>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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

const route = useRoute()
const router = useRouter()

const currentRoute = computed(() => route.path)
const theme = darkTheme
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
  bottom: 0;
  right: 0;
  width: 400px;
  height: 500px;
  z-index: 1000;
  box-shadow: -2px -2px 10px rgba(0, 0, 0, 0.3);
}
</style>

