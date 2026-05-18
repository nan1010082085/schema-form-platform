<script setup lang="ts">
/**
 * FgFileList — 文件上传列表组件
 * 支持上传、下载、预览、删除
 */
interface FileItem {
  id?: string | number
  fileName: string
  url?: string
  fileSize?: number
  [key: string]: any
}

interface FileConfig {
  accept?: string
  maxSize?: number
  maxCount?: number
  multiple?: boolean
}

defineProps<{
  fileList: FileItem[]
  config?: FileConfig
  showUpload?: boolean
  showDelete?: boolean
  showDownload?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  'upload': [file: File]
  'delete': [file: FileItem, index: number]
  'download': [file: FileItem]
  'preview': [file: FileItem]
}>()

function formatSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

</script>

<template>
  <div class="fg-file-list">
    <el-upload
      v-if="showUpload !== false && !disabled"
      :auto-upload="false"
      :show-file-list="false"
      :accept="config?.accept"
      :multiple="config?.multiple ?? true"
      :on-change="(f: any) => emit('upload', f.raw)"
    >
      <el-button type="primary" size="small">上传文件</el-button>
    </el-upload>

    <div class="fg-file-list__items">
      <div
        v-for="(file, idx) in fileList"
        :key="file.id ?? idx"
        class="fg-file-list__item"
      >
        <span
          class="fg-file-list__name"
          @click="emit('preview', file)"
        >
          {{ file.fileName }}
          <span v-if="file.fileSize" class="fg-file-list__size">
            ({{ formatSize(file.fileSize) }})
          </span>
        </span>

        <div class="fg-file-list__actions">
          <el-button
            v-if="showDownload !== false"
            link
            type="primary"
            size="small"
            @click="emit('download', file)"
          >
            下载
          </el-button>
          <el-button
            v-if="showDelete !== false && !disabled"
            link
            type="danger"
            size="small"
            @click="emit('delete', file, idx)"
          >
            删除
          </el-button>
        </div>
      </div>

      <el-empty v-if="!fileList.length" description="暂无附件" :image-size="48" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.fg-file-list {
  &__items {
    margin-top: 8px;
  }

  &__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 0;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }
  }

  &__name {
    color: var(--el-color-primary);
    cursor: pointer;
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 400px;
  }

  &__size {
    color: #999;
    font-size: 12px;
    margin-left: 4px;
  }

  &__actions {
    flex-shrink: 0;
    margin-left: 12px;
  }
}
</style>
