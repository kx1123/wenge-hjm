<template>
  <Transition name="slide-up">
    <div v-if="visible" class="alert-toast" :class="`alert-toast-${level}`">
      <div class="toast-header">
        <span class="toast-icon">{{ levelIcon }}</span>
        <span class="toast-title">{{ title }}</span>
        <n-button text @click="close" class="close-btn">✕</n-button>
      </div>
      <div class="toast-content">{{ message }}</div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { NButton } from 'naive-ui'

const props = defineProps<{
  level: 'high' | 'medium' | 'low'
  title: string
  message: string
  duration?: number
}>()

const emit = defineEmits<{
  close: []
}>()

const visible = ref(true)
const duration = props.duration || (props.level === 'high' ? 0 : 5000)

const levelIcon = computed(() => {
  const icons: Record<string, string> = {
    high: '🔴',
    medium: '🟠',
    low: '🔵',
  }
  return icons[props.level] || '🔵'
})

function close() {
  visible.value = false
  setTimeout(() => emit('close'), 300)
}

onMounted(() => {
  if (duration > 0) {
    setTimeout(() => close(), duration)
  }
})
</script>

<style scoped>
.alert-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  min-width: 300px;
  max-width: 500px;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  z-index: 2000;
  backdrop-filter: blur(10px);
}

.alert-toast-high {
  background: linear-gradient(135deg, rgba(255, 68, 68, 0.9) 0%, rgba(204, 0, 0, 0.9) 100%);
  border: 2px solid rgba(255, 68, 68, 0.5);
  color: white;
}

.alert-toast-medium {
  background: linear-gradient(135deg, rgba(255, 170, 0, 0.9) 0%, rgba(204, 136, 0, 0.9) 100%);
  border: 2px solid rgba(255, 170, 0, 0.5);
  color: white;
}

.alert-toast-low {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(37, 99, 235, 0.9) 100%);
  border: 2px solid rgba(59, 130, 246, 0.5);
  color: white;
}

.toast-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.toast-icon {
  font-size: 1.25rem;
}

.toast-title {
  flex: 1;
}

.close-btn {
  color: white !important;
  opacity: 0.8;
}

.close-btn:hover {
  opacity: 1;
}

.toast-content {
  font-size: 0.875rem;
  line-height: 1.5;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>

