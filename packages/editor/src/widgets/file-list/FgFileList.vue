<script setup lang="ts">
import { inject, ref } from 'vue'
import { widgetDataKey } from '../base/types'
import { useExposeWidget } from '../../composables/useExposeWidget'
import styles from './style.module.scss'

const widgetData = inject(widgetDataKey)!

const fileList = ref<{ name: string; url: string }[]>([])

useExposeWidget(() => ({
  get value() { return fileList.value },
}))

function handleUpload() {
  const input = document.createElement('input')
  input.type = 'file'
  input.multiple = (widgetData.value.props?.multiple as boolean) ?? false
  input.accept = (widgetData.value.props?.accept as string) || ''
  input.onchange = () => {
    const files = input.files
    if (!files) return
    for (const file of Array.from(files)) {
      fileList.value.push({ name: file.name, url: URL.createObjectURL(file) })
    }
  }
  input.click()
}

function handleRemove(index: number) {
  fileList.value.splice(index, 1)
}
</script>

<template>
  <div :class="styles.container">
    <div :class="styles.title">{{ (widgetData.props?.title as string) || '附件' }}</div>
    <div :class="styles.body">
      <div :class="styles.list">
        <div v-if="!fileList.length" :class="styles.empty">暂无文件</div>
        <div v-for="(file, i) in fileList" :key="i" :class="styles.item">
          <span :class="styles.fileName">{{ file.name }}</span>
          <span :class="styles.remove" @click="handleRemove(i)">×</span>
        </div>
      </div>
      <t-button type="primary" :class="styles.uploadBtn" @click="handleUpload">
        {{ (widgetData.props?.buttonText as string) || '上传文件' }}
      </t-button>
    </div>
  </div>
</template>
