<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElButton } from 'element-plus'
import { analyzeImage } from '@/api/aiApi'

const emit = defineEmits<{
  analyzed: [description: string]
}>()

const loading = ref(false)
const previewUrl = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement>()

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
const MAX_SIZE_MB = 10

function triggerUpload(): void {
  fileInputRef.value?.click()
}

function handleFileChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    processFile(file)
  }
  // Reset input so same file can be selected again
  input.value = ''
}

function handleDrop(event: DragEvent): void {
  event.preventDefault()
  const file = event.dataTransfer?.files[0]
  if (file) {
    processFile(file)
  }
}

function handleDragOver(event: DragEvent): void {
  event.preventDefault()
}

function processFile(file: File): void {
  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    ElMessage.error('只支持 PNG、JPG、GIF、WebP 格式')
    return
  }

  // Validate file size
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    ElMessage.error(`图片大小不能超过 ${MAX_SIZE_MB}MB`)
    return
  }

  // Read file as base64
  const reader = new FileReader()
  reader.onload = (e) => {
    const base64 = e.target?.result as string
    previewUrl.value = base64
    uploadAndAnalyze(base64)
  }
  reader.readAsDataURL(file)
}

async function uploadAndAnalyze(base64Image: string): Promise<void> {
  loading.value = true

  try {
    const result = await analyzeImage(base64Image)
    emit('analyzed', result.description)
  } catch (err) {
    const msg = err instanceof Error ? err.message : '图片分析失败'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

function clearPreview(): void {
  previewUrl.value = null
}
</script>

<template>
  <div :class="$style.container">
    <!-- Drop zone / upload trigger -->
    <div
      v-if="!previewUrl"
      :class="$style.dropZone"
      @click="triggerUpload"
      @drop="handleDrop"
      @dragover="handleDragOver"
    >
      <div :class="$style.dropIcon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </div>
      <div :class="$style.dropText">上传截图</div>
      <div :class="$style.dropHint">支持 PNG、JPG、GIF、WebP，最大 10MB</div>
      <input
        ref="fileInputRef"
        type="file"
        :accept="ALLOWED_TYPES.join(',')"
        :class="$style.fileInput"
        @change="handleFileChange"
      />
    </div>

    <!-- Preview with loading overlay -->
    <div v-else :class="$style.preview">
      <img :src="previewUrl" :class="$style.previewImage" alt="上传的截图" />
      <div v-if="loading" :class="$style.loadingOverlay">
        <div :class="$style.spinner" />
        <span :class="$style.loadingText">正在识别表单结构...</span>
      </div>
      <ElButton
        v-if="!loading"
        :class="$style.clearBtn"
        title="清除"
        link
        @click="clearPreview"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </ElButton>
    </div>
  </div>
</template>

<style module>
.container {
  display: inline-block;
}

.dropZone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  border: 1px dashed var(--ai-border-base, #D5DDE3);
  border-radius: var(--ai-radius-md, 4px);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  min-width: 120px;
}

.dropZone:hover {
  border-color: var(--ai-color-primary, #0060A2);
  background: var(--ai-color-primary-bg, #EEF5FF);
}

.dropIcon {
  color: var(--ai-text-hint, #999);
  margin-bottom: 4px;
}

.dropText {
  font-size: 13px;
  color: var(--ai-text-primary, #333);
  font-weight: 500;
}

.dropHint {
  font-size: 11px;
  color: var(--ai-text-hint, #999);
  margin-top: 2px;
}

.fileInput {
  display: none;
}

.preview {
  position: relative;
  display: inline-block;
  max-width: 200px;
  border-radius: var(--ai-radius-md, 4px);
  overflow: hidden;
  border: 1px solid var(--ai-border-light, #EBEDF3);
}

.previewImage {
  display: block;
  max-width: 100%;
  max-height: 120px;
  object-fit: contain;
}

.loadingOverlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  gap: 8px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--ai-border-base, #D5DDE3);
  border-top-color: var(--ai-color-primary, #0060A2);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loadingText {
  font-size: 12px;
  color: var(--ai-text-secondary, #666);
}

.clearBtn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  border-radius: 50%;
  color: #fff;
  cursor: pointer;
  padding: 0;
}

.clearBtn:hover {
  background: rgba(0, 0, 0, 0.7);
}
</style>
