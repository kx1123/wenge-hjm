<template>
  <span :class="['alert-badge', `alert-badge-${level}`]">
    <slot>{{ label }}</slot>
  </span>
</template>

<script setup lang="ts">
import type { AlertLevel } from '@/interfaces/alert'

interface Props {
  level: AlertLevel
  label?: string
}

withDefaults(defineProps<Props>(), {
  label: '',
})
</script>

<style scoped>
.alert-badge {
  @apply inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold;
}

.alert-badge-critical {
  @apply bg-red-600 text-white;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
}

.alert-badge-warning {
  @apply bg-orange-500 text-white;
  box-shadow: 0 0 8px rgba(249, 115, 22, 0.4);
}

.alert-badge-info {
  @apply bg-blue-600 text-white;
  box-shadow: 0 0 8px rgba(37, 99, 235, 0.4);
}
</style>

