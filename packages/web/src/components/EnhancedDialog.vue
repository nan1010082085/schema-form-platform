<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { FullScreen } from '@element-plus/icons-vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  title?: string
  width?: string | number
  draggable?: boolean
  showFullscreenBtn?: boolean
  destroyOnClose?: boolean
  closeOnClickModal?: boolean
}>(), {
  draggable: true,
  showFullscreenBtn: true,
  destroyOnClose: true,
  closeOnClickModal: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

const isFullscreen = ref(false)
const dialogStyle = ref<Record<string, string>>({})

let isDragging = false
let startX = 0
let startY = 0
let startLeft = 0
let startTop = 0

function onHeaderMousedown(e: MouseEvent) {
  if (!props.draggable || isFullscreen.value) return
  const dialog = (e.currentTarget as HTMLElement).closest('.el-dialog') as HTMLElement | null
  if (!dialog) return

  isDragging = true
  startX = e.clientX
  startY = e.clientY
  startLeft = parseInt(dialog.style.left || '0', 10)
  startTop = parseInt(dialog.style.top || '0', 10)

  document.addEventListener('mousemove', onMousemove)
  document.addEventListener('mouseup', onMouseup)
}

function onMousemove(e: MouseEvent) {
  if (!isDragging) return
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  dialogStyle.value = {
    ...dialogStyle.value,
    left: `${startLeft + dx}px`,
    top: `${startTop + dy}px`,
    margin: '0',
  }
}

function onMouseup() {
  isDragging = false
  document.removeEventListener('mousemove', onMousemove)
  document.removeEventListener('mouseup', onMouseup)
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
  if (isFullscreen.value) {
    dialogStyle.value = {}
  }
}

function handleClose() {
  emit('update:modelValue', false)
  emit('close')
  dialogStyle.value = {}
  isFullscreen.value = false
}

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onMousemove)
  document.removeEventListener('mouseup', onMouseup)
})
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    :width="width"
    :destroy-on-close="destroyOnClose"
    :close-on-click-modal="closeOnClickModal"
    :class="{ 'is-fullscreen': isFullscreen }"
    :style="dialogStyle"
    @close="handleClose"
  >
    <template #header>
      <div
        :class="$style.header"
        @mousedown="onHeaderMousedown"
      >
        <span :class="$style.title">{{ title }}</span>
        <el-icon
          v-if="showFullscreenBtn"
          data-testid="fullscreen-btn"
          :class="$style.fullscreenBtn"
          @click.stop="toggleFullscreen"
        >
          <FullScreen />
        </el-icon>
      </div>
    </template>

    <slot />

    <template #footer>
      <slot name="footer" />
    </template>
  </el-dialog>
</template>

<style module>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: v-bind("props.draggable && !isFullscreen ? 'move' : 'default'");
  user-select: none;
}

.title {
  flex: 1;
}

.fullscreenBtn {
  cursor: pointer;
  font-size: 16px;
  color: var(--el-text-color-secondary);
  margin-left: 8px;
}

.fullscreenBtn:hover {
  color: var(--el-color-primary);
}
</style>

<style>
.el-dialog.is-fullscreen {
  width: 100vw !important;
  max-width: 100vw !important;
  margin: 0 !important;
  top: 0 !important;
  left: 0 !important;
  height: 100vh;
  border-radius: 0;
}

.el-dialog.is-fullscreen .el-dialog__body {
  height: calc(100vh - 120px);
  overflow: auto;
}
</style>
