<template>
  <div class="ai-chat-panel">
    <n-card class="chat-card">
      <!-- 顶部：标题 + 清空按钮 -->
      <div class="chat-header">
        <h3 class="chat-title">舆情分析助手</h3>
        <n-button size="small" quaternary @click="handleClear">
          <template #icon>
            <span>🗑️</span>
          </template>
          清空
        </n-button>
      </div>

      <!-- 中部：消息列表（虚拟滚动） -->
      <div class="chat-messages" ref="messagesRef">
        <div
          v-for="(message, index) in messages"
          :key="message.timestamp || index"
          class="message"
          :class="{
            'message-user': message.role === 'user',
            'message-assistant': message.role === 'assistant',
          }"
        >
          <div class="message-content">
            <n-avatar
              :size="32"
              :style="{
                backgroundColor: message.role === 'user' ? '#3b82f6' : '#6b7280',
              }"
            >
              {{ message.role === 'user' ? '我' : 'AI' }}
            </n-avatar>
            <div class="message-bubble" :class="message.role">
              <div v-if="message.role === 'assistant'" class="message-markdown" v-html="renderMarkdown(message.content)"></div>
              <div v-else class="message-text">{{ message.content }}</div>
              <div class="message-time">{{ formatTime(message.timestamp || '') }}</div>
            </div>
          </div>
        </div>
        
        <!-- 加载中提示 -->
        <div v-if="loading" class="message message-assistant">
          <div class="message-content">
            <n-avatar :size="32" style="background-color: #6b7280">AI</n-avatar>
            <div class="message-bubble assistant">
              <n-spin size="small" />
              <span class="ml-2">AI正在思考...</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部：输入框 + 按钮 -->
      <div class="chat-input-area">
        <div class="input-wrapper">
          <n-input
            v-model:value="inputText"
            type="textarea"
            :rows="3"
            :placeholder="inputPlaceholder"
            @keydown="handleKeyDown"
            :disabled="loading"
            class="chat-input"
          />
          <div class="input-actions">
            <n-button
              quaternary
              size="small"
              title="语音输入（占位）"
              :disabled="true"
            >
              <template #icon>
                <span>🎤</span>
              </template>
            </n-button>
            <n-button
              type="primary"
              @click="handleSend"
              :loading="loading"
              :disabled="!inputText.trim()"
            >
              发送
            </n-button>
          </div>
        </div>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, computed } from 'vue'
import { NCard, NInput, NButton, NAvatar, NSpin, useMessage } from 'naive-ui'
import type { ChatMessage } from '@/interfaces/ai'
import dayjs from 'dayjs'

interface Props {
  onSend?: (msg: string, history?: ChatMessage[]) => Promise<{ content: string }> | void
}

const props = withDefaults(defineProps<Props>(), {
  onSend: undefined,
})

const message = useMessage()
const messagesRef = ref<HTMLElement | null>(null)
const inputRef = ref<any>(null)

const messages = ref<ChatMessage[]>([
  {
    role: 'assistant',
    content: '您好！我是舆情分析助手。我可以帮您查询数据统计、分析趋势、提供洞察建议。\n\n**可用命令：**\n- `/clear` - 清空对话\n- `/help` - 显示帮助信息\n\n请告诉我您需要什么帮助？',
    timestamp: new Date().toISOString(),
  },
])

const inputText = ref('')
const loading = ref(false)
const errorMode = ref(false)

const inputPlaceholder = computed(() => {
  if (errorMode.value) {
    return '网络异常，已启用模拟模式。请输入您的问题...'
  }
  return '输入您的问题，按 Enter 发送，Ctrl+Enter 换行'
})

/**
 * 简单的 Markdown 渲染（基础支持）
 */
function renderMarkdown(text: string): string {
  if (!text) return ''
  
  // 转义 HTML
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  
  // 粗体 **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  
  // 斜体 *text*
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  
  // 代码块 ```code```
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
  
  // 行内代码 `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  
  // 链接 [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
  
  // 换行
  html = html.replace(/\n/g, '<br>')
  
  // 列表
  html = html.replace(/^\- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
  
  return html
}

/**
 * 处理键盘事件
 */
function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
  // Ctrl+Enter 或 Shift+Enter 允许换行
}

/**
 * 发送消息
 */
async function handleSend() {
  if (!inputText.value.trim() || loading.value) return

  const text = inputText.value.trim()
  inputText.value = ''

  // 处理命令
  if (text.startsWith('/')) {
    handleCommand(text)
    return
  }

  // 添加用户消息
  const userMessage: ChatMessage = {
    role: 'user',
    content: text,
    timestamp: new Date().toISOString(),
  }
  messages.value.push(userMessage)

  // 滚动到底部
  await nextTick()
  scrollToBottom()

  // 调用 onSend 回调
  if (props.onSend) {
    loading.value = true
    try {
      // 获取历史消息（排除系统消息）
      const history = messages.value
        .filter((m) => m.role !== 'assistant' || !m.content.includes('您好！我是舆情分析助手'))
        .slice(-10) // 只保留最近10条
      
      const reply = await props.onSend(text, history)
      
      // 如果 onSend 返回了回复消息，添加到消息列表
      if (reply) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: typeof reply === 'string' ? reply : reply.content || '已处理您的请求',
          timestamp: new Date().toISOString(),
        }
        messages.value.push(assistantMessage)
      }
    } catch (error) {
      console.error('发送消息失败:', error)
      errorMode.value = true
      message.error('网络异常，已启用模拟模式')
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: '抱歉，处理您的请求时出现了错误。网络异常，已启用模拟模式。',
        timestamp: new Date().toISOString(),
      }
      messages.value.push(errorMessage)
    } finally {
      loading.value = false
      // 确保输入框重新可用
      await nextTick()
      scrollToBottom()
      // 重新聚焦输入框
      if (inputRef.value?.$el) {
        const textarea = inputRef.value.$el.querySelector('textarea')
        if (textarea) {
          textarea.focus()
        }
      }
    }
  } else {
    // 如果没有 onSend 回调，使用内置的 chatEngine
    loading.value = true
    try {
      const { createChatEngine } = await import('@/ai/chatEngine')
      const { db } = await import('@/db/indexedDB')
      const engine = createChatEngine(db)
      
      // 获取历史消息（排除系统消息）
      const history = messages.value
        .filter((m) => m.role !== 'assistant' || !m.content.includes('您好！我是舆情分析助手'))
        .slice(-10) // 只保留最近10条
      
      const reply = await engine.sendMessage(text, history)
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: reply.content,
        timestamp: new Date().toISOString(),
      }
      messages.value.push(assistantMessage)
    } catch (error) {
      console.error('发送消息失败:', error)
      errorMode.value = true
      message.error('网络异常，已启用模拟模式')
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: '抱歉，处理您的请求时出现了错误。请稍后重试。',
        timestamp: new Date().toISOString(),
      }
      messages.value.push(errorMessage)
    } finally {
      loading.value = false
      // 确保输入框重新可用
      await nextTick()
      scrollToBottom()
      // 重新聚焦输入框
      if (inputRef.value?.$el) {
        const textarea = inputRef.value.$el.querySelector('textarea')
        if (textarea) {
          textarea.focus()
        }
      }
    }
  }
}

/**
 * 处理命令
 */
function handleCommand(cmd: string) {
  const command = cmd.toLowerCase().trim()

  if (command === '/clear') {
    handleClear()
  } else if (command === '/help') {
    const helpMessage: ChatMessage = {
      role: 'assistant',
      content: `**可用命令：**

- \`/clear\` - 清空对话历史
- \`/help\` - 显示帮助信息

**示例问题：**

1. 今天负面舆情有多少条？
2. 详细分析产品质量问题
3. 最近一周的舆情趋势
4. 网媒数据统计
5. 微博情感分布`,
      timestamp: new Date().toISOString(),
    }
    messages.value.push(helpMessage)
    nextTick(() => {
      scrollToBottom()
    })
  } else {
    const unknownMessage: ChatMessage = {
      role: 'assistant',
      content: `未知命令：\`${cmd}\`\n\n输入 \`/help\` 查看可用命令。`,
      timestamp: new Date().toISOString(),
    }
    messages.value.push(unknownMessage)
    nextTick(() => {
      scrollToBottom()
    })
  }
}

/**
 * 清空消息
 */
function handleClear() {
  messages.value = [
    {
      role: 'assistant',
      content: '对话已清空。我可以帮您查询数据统计、分析趋势、提供洞察建议。',
      timestamp: new Date().toISOString(),
    },
  ]
  errorMode.value = false
}

/**
 * 滚动到底部
 */
function scrollToBottom() {
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

/**
 * 格式化时间
 */
function formatTime(time: string): string {
  if (!time) return ''
  return dayjs(time).format('HH:mm:ss')
}

// 监听消息变化，自动滚动
watch(
  () => messages.value.length,
  () => {
    nextTick(() => {
      scrollToBottom()
    })
  }
)
</script>

<style scoped>
.ai-chat-panel {
  @apply h-full w-full;
  display: flex;
  flex-direction: column;
}

.chat-card {
  @apply bg-gray-900 text-gray-200;
  display: flex !important;
  flex-direction: column !important;
  height: 100% !important;
  overflow: hidden;
}

.chat-card :deep(.n-card__content) {
  display: flex !important;
  flex-direction: column !important;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 0 !important;
}

.chat-header {
  @apply flex items-center justify-between border-b border-gray-700;
  flex-shrink: 0;
  padding: 1rem;
  background-color: #1f2937;
}

.chat-title {
  @apply text-lg font-bold text-white;
}

.chat-messages {
  @apply flex-1 overflow-y-auto;
  min-height: 0;
  scroll-behavior: smooth;
  padding: 1rem;
  flex: 1 1 auto;
  overflow-y: auto;
  overflow-x: hidden;
}

/* 自定义滚动条 */
.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.5);
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.7);
}

.message {
  @apply mb-4;
}

.message-user {
  @apply flex justify-end;
}

.message-assistant {
  @apply flex justify-start;
}

.message-content {
  @apply flex items-start gap-3;
  max-width: 85%;
}

.message-user .message-content {
  @apply flex-row-reverse;
}

.message-bubble {
  @apply px-4 py-2 rounded-lg shadow-sm;
  word-wrap: break-word;
  word-break: break-word;
}

.message-bubble.user {
  @apply bg-blue-500 text-white;
}

.message-bubble.assistant {
  @apply bg-gray-700 text-gray-200;
}

.message-markdown {
  @apply text-sm;
  line-height: 1.6;
}

.message-markdown :deep(strong) {
  @apply font-bold text-white;
}

.message-markdown :deep(em) {
  @apply italic;
}

.message-markdown :deep(code) {
  @apply bg-gray-800 px-1 py-0.5 rounded text-xs font-mono;
}

.message-markdown :deep(pre) {
  @apply bg-gray-800 p-2 rounded my-2 overflow-x-auto;
}

.message-markdown :deep(pre code) {
  @apply bg-transparent p-0;
}

.message-markdown :deep(ul) {
  @apply list-disc list-inside my-2 space-y-1;
}

.message-markdown :deep(a) {
  @apply text-blue-400 hover:text-blue-300 underline;
}

.message-text {
  @apply text-sm;
  white-space: pre-wrap;
}

.message-time {
  @apply text-xs opacity-60 mt-1;
}

.chat-input-area {
  @apply border-t border-gray-700;
  flex-shrink: 0;
  padding: 1rem;
  background-color: #1f2937;
}

.input-wrapper {
  @apply space-y-2;
  width: 100%;
}

.chat-input {
  @apply w-full;
}

.chat-input :deep(.n-input__textarea-el) {
  @apply bg-gray-800 text-gray-200;
  border-color: #4b5563;
}

.chat-input :deep(.n-input__textarea-el:focus) {
  border-color: #3b82f6;
}

.input-actions {
  @apply flex items-center justify-end gap-2;
  margin-top: 8px;
}

.input-actions .n-button {
  @apply flex-shrink-0;
}
</style>
