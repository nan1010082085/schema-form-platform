<template>
  <el-dialog
    v-model="visible"
    :title="title"
    :width="width"
    :destroy-on-close="destroyOnClose"
    :draggable="draggable"
    :fullscreen="isFullscreen"
    @close="handleClose"
  >
    <template #header="{ close, titleId, titleClass }">
      <div
        :class="$style.header"
        @mousedown="handleDragStart"
      >
        <span :id="titleId" :class="titleClass">{{ title }}</span>
        <div :class="$style.headerActions">
          <el-button text size="small" @click="toggleFullscreen">
            <el-icon>
              <FullScreen v-if="!isFullscreen" />
              <CopyDocument v-else />
            </el-icon>
          </el-button>
          <el-button text size="small" @click="close">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
      </div>
    </template>
    <slot />
    <template #footer>
      <slot name="footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" :loading="loading" @click="handleConfirm">确定</el-button>
      </slot>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { FullScreen, CopyDocument, Close } from '@element-plus/icons-vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  title: string
  width?: string
  destroyOnClose?: boolean
  loading?: boolean
  draggable?: boolean
}>(), {
  width: '580px',
  destroyOnClose: true,
  loading: false,
  draggable: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': []
  'cancel': []
  'close': []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const isFullscreen = ref(false)

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
}

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  visible.value = false
  emit('cancel')
}

function handleClose() {
  isFullscreen.value = false
  emit('close')
}

function handleDragStart(e: MouseEvent) {
  // Element Plus 的 draggable 已内置，这里可以添加额外的拖拽逻辑
  e.preventDefault()
}
</script>

<style module>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
  user-select: none;
}

.headerActions {
  display: flex;
  gap: 4px;
}
</style>
