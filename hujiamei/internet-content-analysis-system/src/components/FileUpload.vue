<template>
  <div class="file-upload">
    <!-- 拖拽上传区域 -->
    <div
      ref="dropZoneRef"
      class="drop-zone"
      :class="{ 'drop-zone-active': isDragging, 'drop-zone-disabled': uploading }"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
      @click="handleClick"
    >
      <input
        ref="fileInputRef"
        type="file"
        accept=".xlsx,.xls"
        multiple
        class="file-input"
        @change="handleFileSelect"
      />
      <div class="upload-content">
        <n-icon size="64" :depth="3" class="upload-icon">
          <svg viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"
            />
          </svg>
        </n-icon>
        <p class="text-xl font-semibold mt-4">
          {{ isDragging ? '松开鼠标上传文件' : '拖拽Excel文件到此处或点击上传' }}
        </p>
        <p class="text-sm text-gray-500 mt-2">支持网媒数据和微博数据（.xlsx 或 .xls 格式，最多2个文件）</p>
      </div>
    </div>

    <!-- 文件列表 -->
    <div v-if="files.length > 0" class="file-list mt-4">
      <div v-for="(file, index) in files" :key="index" class="file-item">
        <div class="file-info">
          <n-icon size="20" class="file-icon">
            <svg viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"
              />
            </svg>
          </n-icon>
          <span class="file-name">{{ file.name }}</span>
          <n-tag :type="getFileType(file.name) === 'webmedia' ? 'primary' : 'success'" size="small">
            {{ getFileType(file.name) === 'webmedia' ? '网媒' : '微博' }}
          </n-tag>
        </div>
        <div class="file-progress">
          <n-progress
            :percentage="file.progress"
            :status="file.status"
            :show-indicator="false"
            class="progress-bar"
          />
          <span class="progress-text">{{ file.progress }}%</span>
        </div>
      </div>
    </div>

    <!-- 总进度 -->
    <div v-if="uploading" class="total-progress mt-4">
      <n-progress
        :percentage="totalProgress"
        :status="totalProgressStatus"
        :show-indicator="true"
      />
      <p class="text-sm text-gray-500 mt-2 text-center">
        {{ uploadStatusText }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NIcon, NProgress, NTag, useMessage } from 'naive-ui'
import { parseExcelFile } from '@/utils/excelParser'
import { useDataStore } from '@/stores/data'

const message = useMessage()
const dataStore = useDataStore()

// 定义事件
const emit = defineEmits<{
  uploadSuccess: []
  uploadError: [error: string]
}>()

const dropZoneRef = ref<HTMLElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const uploading = ref(false)

interface FileItem {
  file: File
  name: string
  progress: number
  status?: 'success' | 'error' | undefined
  type?: 'webmedia' | 'weibo'
}

const files = ref<FileItem[]>([])

// 总进度
const totalProgress = computed(() => {
  if (files.value.length === 0) return 0
  const sum = files.value.reduce((acc, f) => acc + f.progress, 0)
  return Math.round(sum / files.value.length)
})

const totalProgressStatus = computed(() => {
  if (files.value.some((f) => f.status === 'error')) return 'error'
  if (files.value.every((f) => f.status === 'success')) return 'success'
  return undefined
})

const uploadStatusText = computed(() => {
  const successCount = files.value.filter((f) => f.status === 'success').length
  const errorCount = files.value.filter((f) => f.status === 'error').length
  const total = files.value.length

  if (errorCount > 0) {
    return `上传完成：成功 ${successCount}，失败 ${errorCount} / 总计 ${total}`
  }
  if (successCount === total) {
    return `上传完成：${successCount} 个文件已成功上传`
  }
  return `正在上传：${successCount} / ${total}`
})

// 获取文件类型
const getFileType = (fileName: string): 'webmedia' | 'weibo' | 'unknown' => {
  const name = fileName.toLowerCase()
  if (name.includes('网媒') || name.includes('webmedia')) return 'webmedia'
  if (name.includes('微博') || name.includes('weibo')) return 'weibo'
  return 'unknown'
}

// 处理点击上传
const handleClick = () => {
  if (!uploading.value && fileInputRef.value) {
    fileInputRef.value.click()
  }
}

// 处理文件选择
const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files) {
    processFiles(Array.from(target.files))
  }
  // 清空input，允许重复选择同一文件
  if (target) {
    target.value = ''
  }
}

// 处理拖拽悬停
const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  if (!uploading.value) {
    isDragging.value = true
  }
}

// 处理拖拽离开
const handleDragLeave = (e: DragEvent) => {
  e.preventDefault()
  // 检查是否真的离开了拖拽区域
  if (!dropZoneRef.value?.contains(e.relatedTarget as Node)) {
    isDragging.value = false
  }
}

// 处理拖拽放下
const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false

  if (uploading.value) {
    message.error('正在上传中，请稍候...')
    return
  }

  const droppedFiles = Array.from(e.dataTransfer?.files || [])
  processFiles(droppedFiles)
}

// 处理文件列表（最多2个）
const processFiles = (fileList: File[]) => {
  // 过滤Excel文件
  const excelFiles = fileList.filter(
    (file) =>
      file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
  )

  if (excelFiles.length === 0) {
    message.error('请选择Excel文件（.xlsx 或 .xls）')
    return
  }

  // 只取前2个文件
  const filesToProcess = excelFiles.slice(0, 2)

  // 检查文件类型
  const hasWebMedia = filesToProcess.some((f) => getFileType(f.name) === 'webmedia')
  const hasWeibo = filesToProcess.some((f) => getFileType(f.name) === 'weibo')

  if (!hasWebMedia && !hasWeibo) {
    message.error('文件名应包含"网媒"或"微博"关键字')
    return
  }

  // 初始化文件列表
  files.value = filesToProcess.map((file) => ({
    file,
    name: file.name,
    progress: 0,
    type: getFileType(file.name) as 'webmedia' | 'weibo',
  }))

  // 开始上传
  uploadFiles()
}

// 上传文件
const uploadFiles = async () => {
  uploading.value = true

  try {
    // 并行上传所有文件
    const uploadPromises = files.value.map((fileItem, index) =>
      uploadSingleFile(fileItem, index)
    )

    await Promise.all(uploadPromises)

    // 刷新数据
    await dataStore.loadAll()

    message.success('所有文件上传成功！')
    emit('uploadSuccess')
  } catch (error) {
    console.error('上传失败:', error)
    const errorMessage = error instanceof Error ? error.message : '上传失败'
    emit('uploadError', errorMessage)
  } finally {
    uploading.value = false
    // 2秒后清空文件列表
    setTimeout(() => {
      files.value = []
    }, 2000)
  }
}

// 上传单个文件
const uploadSingleFile = (fileItem: FileItem, _index: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    // 进度监听（读取阶段：0-80%）
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        // 读取阶段占80%，解析阶段占20%
        const readProgress = Math.round((e.loaded / e.total) * 80)
        fileItem.progress = readProgress
      }
    }

    // 读取完成
    reader.onload = async () => {
      try {
        // 读取完成，进入解析阶段（80-100%）
        fileItem.progress = 85

        // 创建 File 对象用于 parseExcelFile
        const arrayBuffer = reader.result as ArrayBuffer
        const blob = new Blob([arrayBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        const file = new File([blob], fileItem.name, {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })

        fileItem.progress = 90

        // 使用 parseExcelFile 解析
        const result = await parseExcelFile(file)

        fileItem.progress = 95

        // 保存数据
        if (result.webMedia.length > 0) {
          await dataStore.addWebMedia(result.webMedia)
          message.success(`成功上传 ${result.webMedia.length} 条网媒数据`)
        }

        if (result.weibo.length > 0) {
          await dataStore.addWeibo(result.weibo)
          message.success(`成功上传 ${result.weibo.length} 条微博数据`)
        }

        fileItem.progress = 100
        fileItem.status = 'success'
        resolve()
      } catch (error) {
        fileItem.status = 'error'
        let errorMessage = '上传失败'
        
        if (error instanceof Error) {
          errorMessage = error.message
          // 处理 IndexedDB 版本错误
          if (error.name === 'VersionError' || error.message.includes('VersionError')) {
            errorMessage = '数据库版本不匹配，请刷新页面后重试。如果问题持续，请清除浏览器缓存。'
            console.error('IndexedDB 版本错误:', error)
          }
        }
        
        message.error(`${fileItem.name}: ${errorMessage}`)
        reject(error)
      }
    }

    // 错误处理
    reader.onerror = () => {
      fileItem.status = 'error'
      const errorMessage = '读取文件失败'
      message.error(`${fileItem.name}: ${errorMessage}`)
      reject(new Error(errorMessage))
    }

    // 开始读取
    reader.readAsArrayBuffer(fileItem.file)
  })
}
</script>

<style scoped>
.file-upload {
  width: 100%;
}

.drop-zone {
  position: relative;
  border: 2px dashed rgba(0, 255, 255, 0.3);
  border-radius: 12px;
  padding: 4rem 3rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 100%);
  backdrop-filter: blur(10px);
  overflow: hidden;
}

.drop-zone::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(0, 255, 255, 0.1) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.drop-zone:hover::before {
  opacity: 1;
}

.drop-zone:hover {
  border-color: rgba(0, 255, 255, 0.6);
  box-shadow: 0 8px 32px rgba(0, 255, 255, 0.2);
  transform: translateY(-2px);
}

.drop-zone-active {
  border-color: #00ffff;
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.1) 0%, rgba(138, 43, 226, 0.1) 100%);
  transform: scale(1.02);
  box-shadow: 0 8px 40px rgba(0, 255, 255, 0.4);
  animation: pulse 1.5s ease-in-out infinite;
}

.drop-zone-active::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(0, 255, 255, 0.2) 50%,
    transparent 100%
  );
  animation: shine 2s infinite;
}

@keyframes shine {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

.drop-zone-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(0.5);
}

@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 8px 40px rgba(0, 255, 255, 0.4);
  }
  50% {
    box-shadow: 0 8px 60px rgba(0, 255, 255, 0.6);
  }
}

.file-input {
  display: none;
}

.upload-content {
  pointer-events: none;
  position: relative;
  z-index: 1;
}

.upload-icon {
  color: #00ffff;
  filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.5));
  transition: transform 0.3s ease;
}

.drop-zone-active .upload-icon {
  transform: scale(1.15) rotate(5deg);
  filter: drop-shadow(0 0 20px rgba(0, 255, 255, 0.8));
}

.upload-content p {
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.upload-content .text-xl {
  font-weight: 600;
  background: linear-gradient(135deg, #00ffff 0%, #8a2be2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.upload-content .text-sm {
  color: rgba(255, 255, 255, 0.6);
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1.5rem;
}

.file-item {
  padding: 1.25rem;
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 100%);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.file-item:hover {
  border-color: rgba(0, 255, 255, 0.4);
  box-shadow: 0 4px 20px rgba(0, 255, 255, 0.2);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.file-icon {
  color: #00ffff;
  filter: drop-shadow(0 0 5px rgba(0, 255, 255, 0.5));
}

.file-name {
  flex: 1;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.9);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.progress-bar {
  flex: 1;
}

.progress-text {
  font-size: 0.875rem;
  color: #00ffff;
  min-width: 3.5rem;
  text-align: right;
  font-weight: 600;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.total-progress {
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 100%);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 8px;
  backdrop-filter: blur(10px);
  margin-top: 1.5rem;
}

.total-progress p {
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  margin-top: 0.75rem;
  font-size: 0.875rem;
}
</style>
