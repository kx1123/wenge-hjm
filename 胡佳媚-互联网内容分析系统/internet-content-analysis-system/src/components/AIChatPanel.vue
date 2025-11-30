<template>
  <div class="ai-chat-panel">
    <n-card title="AI对话助手" class="chat-card">
      <div class="chat-messages" ref="messagesRef">
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
              <div class="message-time">
                {{ formatTime(message.timestamp || '') }}
              </div>
              <div class="message-content-text">{{ message.content }}</div>
            </div>
          </div>
        </div>
        <div v-if="loading" class="message message-assistant">
          <div class="message-content">
            <n-avatar :size="32" style="background-color: #10b981">AI</n-avatar>
            <div class="message-text">
              <n-spin size="small" />
              <span class="loading-text">AI正在思考...</span>
            </div>
          </div>
        </div>
      </div>

      <div class="chat-input-area">
        <n-input
          v-model:value="inputText"
          type="textarea"
          :rows="3"
          placeholder="输入您的问题，例如：今天负面舆情有多少条？"
          @keydown.enter.exact.prevent="handleSend"
          :disabled="loading"
          class="chat-textarea"
        />
        <div class="button-group">
          <n-button type="primary" @click="handleSend" :loading="loading" :disabled="!inputText.trim()" size="medium">
            发送
          </n-button>
          <n-button @click="clearMessages" size="medium">清空</n-button>
        </div>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { NCard, NInput, NButton, NAvatar, NSpin, useMessage } from 'naive-ui'
import { createChatEngine } from '@/ai/chatEngine'
import { db } from '@/db/indexedDB'
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

const chatEngine = createChatEngine(db)

// 支持外部传入的onSend回调（用于App.vue）
const props = defineProps<{
  onSend?: (message: string, history: ChatMessage[]) => Promise<{ content: string }>
}>()

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
    let response: string
    
    if (props.onSend) {
      // 使用外部传入的回调
      const history = messages.value.filter(m => m.role !== 'system')
      const result = await props.onSend(question, history)
      response = result.content
    } else {
      // 使用内置的chatEngine
      const reply = await chatEngine.sendMessage(question, messages.value)
      response = reply.content
    }
    
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString(),
    }
    messages.value.push(assistantMessage)
  } catch (error) {
    console.error('AI对话失败:', error)
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
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-card :deep(.n-card__content) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 1rem;
  min-height: 0;
}

.chat-messages {
  flex: 1;
  min-height: 200px;
  max-height: none;
  padding: 1rem;
  background-color: #ffffff;
  border-radius: 8px;
  overflow-y: auto;
  margin-bottom: 1rem;
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
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  color: #1f2937;
  font-size: 14px;
  line-height: 1.6;
}

.message-user .message-text {
  background-color: #0ea5e9;
  color: #ffffff;
}

.message-assistant .message-text {
  background-color: #f3f4f6;
  color: #1f2937;
  border: 1px solid #e5e7eb;
}

.message-time {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.message-content-text {
  font-size: 14px;
  color: #1f2937;
  line-height: 1.6;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.message-user .message-time {
  color: rgba(255, 255, 255, 0.8);
}

.message-user .message-content-text {
  color: #ffffff;
}

.loading-text {
  color: #1f2937;
  margin-left: 8px;
  font-size: 14px;
}

/* 自定义滚动条 */
.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #9ca3af;
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}

/* 输入框区域 */
.chat-input-area {
  flex-shrink: 0;
  margin-top: auto;
  padding-top: 1rem;
  padding-bottom: 0.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.button-group {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  width: 100%;
  flex-shrink: 0;
  padding-top: 0.5rem;
}

.button-group :deep(.n-button) {
  min-width: 80px;
  height: 36px;
  font-size: 14px;
}

.chat-textarea :deep(.n-input__textarea-el) {
  color: #fff !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
}

.chat-textarea :deep(.n-input__textarea-el::placeholder) {
  color: #9ca3af !important;
  opacity: 1 !important;
}

.chat-textarea :deep(.n-input--disabled .n-input__textarea-el) {
  color: #6b7280 !important;
  background-color: #f3f4f6 !important;
}

/* 确保输入框在深色主题下也清晰可见 */
.chat-textarea :deep(.n-input) {
  background-color: #ffffff !important;
}

.chat-textarea :deep(.n-input__border) {
  border-color: #d1d5db !important;
}

.chat-textarea :deep(.n-input:hover .n-input__border) {
  border-color: #9ca3af !important;
}

.chat-textarea :deep(.n-input--focus .n-input__border) {
  border-color: #3b82f6 !important;
}
</style>

