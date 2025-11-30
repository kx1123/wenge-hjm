<template>
  <div
    v-show="internalVisible"
    class="new-badge absolute top-0 right-0 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded z-10"
  >
    NEW
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

/**
 * Props
 */
interface Props {
  /**
   * 控制显示
   */
  visible?: boolean
  /**
   * 自动隐藏毫秒数（默认 3000ms）
   */
  duration?: number
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  duration: 3000,
})

/**
 * 内部可见性状态
 */
const internalVisible = ref(props.visible)

/**
 * 监听 visible 变化
 * 当设为 true 时，自动在 duration 后设为 false
 */
watch(
  () => props.visible,
  (newValue) => {
    if (newValue) {
      internalVisible.value = true
      // 自动隐藏
      setTimeout(() => {
        internalVisible.value = false
      }, props.duration)
    } else {
      internalVisible.value = false
    }
  },
  { immediate: true }
)

/**
 * 显示徽章（供外部调用）
 */
const show = () => {
  internalVisible.value = true
  setTimeout(() => {
    internalVisible.value = false
  }, props.duration)
}

/**
 * 暴露方法
 */
defineExpose({
  show,
})
</script>

<style scoped>
.new-badge {
  background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%);
  font-weight: bold;
  box-shadow: 0 0 10px rgba(255, 68, 68, 0.5);
  animation: pulse 1.2s ease-in-out infinite;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.15);
  }
}
</style>

