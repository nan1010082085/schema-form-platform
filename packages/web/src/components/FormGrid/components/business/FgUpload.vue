<script setup lang="ts">
/**
 * FgUpload — 文件上传组件
 * 支持单文件/多文件/图片模式，文件大小限制，类型过滤
 */
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import type { UploadFile, UploadRawFile } from 'element-plus'

export interface FileItem {
  uid: string
  name: string
  url: string
  size?: number
  [key: string]: any
}

const props = defineProps<{
  modelValue?: FileItem[]
  action?: string
  headers?: Record<string, string>
  multiple?: boolean
  accept?: string
  limit?: number
  maxSize?: number
  listType?: 'text' | 'picture' | 'picture-card'
  disabled?: boolean
  drag?: boolean
  tip?: string
  buttonText?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: FileItem[]]
  'change': [fileList: FileItem[]]
  'success': [response: any, file: UploadFile]
  'error': [error: Error, file: UploadFile]
  'exceed': [files: FileItem[]]
  'remove': [file: FileItem]
  'preview': [file: FileItem]
}>()

const fileList = computed({
  get: () => props.modelValue ?? [],
  set: (val) => {
    emit('update:modelValue', val)
    emit('change', val)
  }
})

const listType = computed(() => props.listType ?? 'text')

function beforeUpload(rawFile: UploadRawFile) {
  if (props.maxSize && rawFile.size / 1024 / 1024 > props.maxSize) {
    ElMessage.warning(`文件大小不能超过 ${props.maxSize}MB`)
    return false
  }
  return true
}

function handleSuccess(response: any, file: UploadFile) {
  emit('success', response, file)
}

function handleError(error: Error, file: UploadFile) {
  emit('error', error, file)
}

function handleExceed(files: FileItem[]) {
  emit('exceed', files)
  ElMessage.warning(`最多上传 ${props.limit} 个文件`)
}

function handleRemove(file: FileItem) {
  emit('remove', file)
}

function handlePreview(file: UploadFile) {
  emit('preview', file as any)
}

const dialogVisible = ref(false)
const previewUrl = ref('')

function handlePreviewImage(file: UploadFile) {
  previewUrl.value = file.url ?? ''
  dialogVisible.value = true
}
</script>

<template>
  <div class="fg-upload">
    <el-upload
      v-model:file-list="fileList"
      :action="action"
      :headers="headers"
      :multiple="multiple ?? true"
      :accept="accept"
      :limit="limit"
      :list-type="listType"
      :disabled="disabled"
      :drag="drag"
      :before-upload="beforeUpload"
      :on-success="handleSuccess"
      :on-error="handleError"
      :on-exceed="handleExceed"
      :on-remove="handleRemove"
      :on-preview="listType === 'picture-card' ? handlePreviewImage : handlePreview"
    >
      <template v-if="listType === 'picture-card'">
        <el-icon><Plus /></el-icon>
      </template>
      <template v-else-if="drag">
        <div class="fg-upload__drag">
          <el-icon class="fg-upload__drag-icon"><Plus /></el-icon>
          <div class="fg-upload__drag-text">{{ tip ?? '将文件拖到此处，或点击上传' }}</div>
        </div>
      </template>
      <template v-else>
        <el-button type="primary">{{ buttonText ?? '选择文件' }}</el-button>
      </template>

      <template v-if="tip && !drag" #tip>
        <div class="fg-upload__tip">{{ tip }}</div>
      </template>
    </el-upload>

    <!-- 图片预览弹窗 -->
    <el-dialog v-model="dialogVisible" title="图片预览" width="600px" class="fg-dialog">
      <img :src="previewUrl" style="width: 100%" alt="预览图片" />
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.fg-upload {
  width: 100%;

  &__drag {
    padding: 20px;
    text-align: center;
  }

  &__drag-icon {
    font-size: 28px;
    color: #999;
  }

  &__drag-text {
    margin-top: 8px;
    font-size: 13px;
    color: #999;
  }

  &__tip {
    font-size: 12px;
    color: #999;
    margin-top: 4px;
  }
}
</style>
