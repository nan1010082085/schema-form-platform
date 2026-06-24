<template>
  <el-dialog
    :model-value="modelValue"
    :width="isFullscreen ? '100vw' : width"
    :fullscreen="isFullscreen"
    :style="isFullscreen ? { margin: 0 } : {}"
    :destroy-on-close="destroyOnClose"
    :draggable="draggable && !isFullscreen"
    :append-to-body="appendToBody"
    :close-on-click-modal="false"
    :show-close="false"
    @update:model-value="emit('update:modelValue', $event)"
    @close="handleClose"
  >
    <template #header>
      <div :class="styles['app-dialog__header']">
        <span :class="styles['app-dialog__title']">{{ title }}</span>
        <div :class="styles['app-dialog__header-right']">
          <el-button
            :class="styles['app-dialog__fullscreen-btn']"
            :icon="isFullscreen ? ScaleToOriginal : FullScreen"
            text
            @click="toggleFullscreen"
          />
          <el-button
            :class="styles['app-dialog__close-btn']"
            :icon="Close"
            text
            @click="emit('update:modelValue', false)"
          />
        </div>
      </div>
    </template>
    <slot />
    <template #footer>
      <div :class="styles['app-dialog__footer']">
        <slot name="footer">
          <el-button @click="handleCancel">取消</el-button>
          <el-button type="primary" :loading="loading" @click="handleConfirm">确定</el-button>
        </slot>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { FullScreen, ScaleToOriginal, Close } from '@element-plus/icons-vue'
import styles from './AppDialog.module.scss'

withDefaults(defineProps<{
  modelValue: boolean
  title: string
  width?: string
  destroyOnClose?: boolean
  loading?: boolean
  draggable?: boolean
  appendToBody?: boolean
}>(), {
  width: '580px',
  destroyOnClose: true,
  loading: false,
  draggable: true,
  appendToBody: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': []
  'cancel': []
  'close': []
}>()

const isFullscreen = ref(false)

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
}

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  emit('update:modelValue', false)
  emit('cancel')
}

function handleClose() {
  emit('close')
}
</script>

