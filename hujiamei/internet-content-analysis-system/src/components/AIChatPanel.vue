<template>
  <div class="ai-chat-panel">
    <n-card title="AI对话助手" class="h-full flex flex-col">
      <div class="chat-messages flex-1 overflow-y-auto mb-4" ref="messagesRef">
        <div
          v-for="message in messages"
          :key="message.timestamp"
          class="message mb-4"
          :class="{ 'message-user': message.role === 'user', 'message-assistant': message.role === 'assistant' }"
        >
          <div class="message-content">
            <n-avatar
              :size="32"
              :style="{ backgroundColor: message.role === 'user' ? '#0ea5e9' : '#10b981' }"
            >
              {{ message.role === 'user' ? '我' : 'AI' }}
            </n-avatar>
            <div class="message-text">
              <div class="text-sm text-gray-500 mb-1">
                {{ formatTime(message.timestamp || '') }}
              </div>
              <div class="text-base">{{ message.content }}</div>
            </div>
          </div>
        </div>
        <div v-if="loading" class="message message-assistant">
          <div class="message-content">
            <n-avatar :size="32" style="background-color: #10b981">AI</n-avatar>
            <div class="message-text">
              <n-spin size="small" />
              <span class="ml-2">AI正在思考...</span>
            </div>
          </div>
        </div>
      </div>

      <n-input
        v-model:value="inputText"
        type="textarea"
        :rows="3"
        placeholder="输入您的问题，例如：今天负面舆情有多少条？"
        @keydown.enter.exact.prevent="handleSend"
        :disabled="loading"
      />
      <div class="flex justify-end mt-2">
        <n-button type="primary" @click="handleSend" :loading="loading" :disabled="!inputText.trim()">
          发送
        </n-button>
        <n-button class="ml-2" @click="clearMessages">清空</n-button>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { NCard, NInput, NButton, NAvatar, NSpin, useMessage } from 'naive-ui'
import { createAIAnalyzer } from '@/ai/client'
import type { ChatMessage } from '@/interfaces/ai'
import dayjs from 'dayjs'

const message = useMessage()
const messagesRef = ref<HTMLElement | null>(null)

const messages = ref<ChatMessage[]>([
  {
    role: 'assistant',
    content: '您好！我是AI内容分析助手。我可以帮您查询数据统计、分析趋势、提供洞察建议。请告诉我您需要什么帮助？',
    timestamp: new Date().toISOString(),
  },
])

const inputText = ref('')
const loading = ref(false)

const analyzer = createAIAnalyzer({ mock: true })

const handleSend = async () => {
  if (!inputText.value.trim() || loading.value) return

  const userMessage: ChatMessage = {
    role: 'user',
    content: inputText.value.trim(),
    timestamp: new Date().toISOString(),
  }

  messages.value.push(userMessage)
  const question = inputText.value.trim()
  inputText.value = ''
  loading.value = true

  // 滚动到底部
  await nextTick()
  scrollToBottom()

  try {
    const response = await analyzer.chat([userMessage])
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString(),
    }
    messages.value.push(assistantMessage)
  } catch (error) {
    message.error('AI对话失败，请稍后重试')
    const errorMessage: ChatMessage = {
      role: 'assistant',
      content: '抱歉，处理您的请求时出现了错误。请稍后重试。',
      timestamp: new Date().toISOString(),
    }
    messages.value.push(errorMessage)
  } finally {
    loading.value = false
    await nextTick()
    scrollToBottom()
  }
}

const clearMessages = () => {
  messages.value = [
    {
      role: 'assistant',
      content: '对话已清空。我可以帮您查询数据统计、分析趋势、提供洞察建议。',
      timestamp: new Date().toISOString(),
    },
  ]
}

const scrollToBottom = () => {
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

const formatTime = (time: string) => {
  return dayjs(time).format('HH:mm:ss')
}

onMounted(() => {
  scrollToBottom()
})
</script>

<style scoped>
.ai-chat-panel {
  height: 100%;
}

.chat-messages {
  min-height: 300px;
  max-height: 500px;
  padding: 1rem;
  background-color: #f9fafb;
  border-radius: 8px;
}

.message {
  display: flex;
}

.message-user {
  justify-content: flex-end;
}

.message-assistant {
  justify-content: flex-start;
}

.message-content {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  max-width: 80%;
}

.message-user .message-content {
  flex-direction: row-reverse;
}

.message-text {
  flex: 1;
  padding: 0.75rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.message-user .message-text {
  background-color: #0ea5e9;
  color: white;
}
</style>

