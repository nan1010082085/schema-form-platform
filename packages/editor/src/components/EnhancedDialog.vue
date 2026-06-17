<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import AppIcon from '@schema-form/shared-components/common/AppIcon.vue'
import styles from './EnhancedDialog.module.scss'

const props = withDefaults(defineProps<{
  modelValue: boolean
  title?: string
  width?: string | number
  draggable?: boolean
  showFullscreenBtn?: boolean
  destroyOnClose?: boolean
  closeOnClickModal?: boolean
  helpContent?: string
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
let dialogWidth = 0

const MIN_VISIBLE = 40 // at least 40px of dialog must stay in viewport

function onHeaderMousedown(e: MouseEvent) {
  if (!props.draggable || isFullscreen.value) return
  const dialog = (e.currentTarget as HTMLElement).closest('.t-dialog') as HTMLElement | null
  if (!dialog) return

  isDragging = true
  startX = e.clientX
  startY = e.clientY

  const rect = dialog.getBoundingClientRect()
  startLeft = rect.left
  startTop = rect.top
  dialogWidth = rect.width

  dialogStyle.value = {
    ...dialogStyle.value,
    left: `${startLeft}px`,
    top: `${startTop}px`,
    margin: '0',
    transform: 'none',
  }

  document.body.style.cursor = 'move'
  document.body.style.userSelect = 'none'

  document.addEventListener('mousemove', onMousemove)
  document.addEventListener('mouseup', onMouseup)
}

function onMousemove(e: MouseEvent) {
  if (!isDragging) return
  const dx = e.clientX - startX
  const dy = e.clientY - startY

  const maxLeft = window.innerWidth - MIN_VISIBLE
  const maxTop = window.innerHeight - MIN_VISIBLE
  const left = Math.max(MIN_VISIBLE - dialogWidth, Math.min(maxLeft, startLeft + dx))
  const top = Math.max(0, Math.min(maxTop, startTop + dy))

  dialogStyle.value = {
    ...dialogStyle.value,
    left: `${left}px`,
    top: `${top}px`,
    margin: '0',
  }
}

function onMouseup() {
  isDragging = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
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
  <t-dialog
    :visible="modelValue"
    :header="title"
    :width="width"
    :destroy-on-close="destroyOnClose"
    :close-on-overlay-click="closeOnClickModal"
    :close-btn="false"
    attach="body"
    :class="{ 'is-fullscreen': isFullscreen }"
    :style="dialogStyle"
    @close="handleClose"
  >
    <template #header>
      <div
        :class="styles.header"
        @mousedown="onHeaderMousedown"
      >
        <span :class="styles.title">{{ title }}</span>
        <div :class="styles.headerActions">
          <t-popup
            v-if="helpContent"
            placement="bottom-end"
            :overlay-inner-style="{ width: '280px' }"
            trigger="click"
          >
            <HelpCircleFilledIcon :class="styles.headerBtn" @click.stop />
            <template #content>
              <div :class="styles.helpContent" v-html="helpContent" />
            </template>
          </t-popup>
          <FullscreenIcon
            v-if="showFullscreenBtn && !isFullscreen"
            data-testid="fullscreen-btn"
            :class="styles.headerBtn"
            @click.stop="toggleFullscreen"
          />
          <FullscreenExitIcon
            v-if="showFullscreenBtn && isFullscreen"
            data-testid="fullscreen-btn"
            :class="styles.headerBtn"
            @click.stop="toggleFullscreen"
          />
          <CloseIcon
            :class="styles.headerBtn"
            @click.stop="handleClose"
          />
        </div>
      </div>
    </template>

    <slot />

    <template #footer>
      <slot name="footer" />
    </template>
  </t-dialog>
</template>

<style>
.t-dialog.is-fullscreen {
  width: 100vw !important;
  max-width: 100vw !important;
  margin: 0 !important;
  top: 0 !important;
  left: 0 !important;
  height: 100vh;
  border-radius: 0;
}

.t-dialog.is-fullscreen .t-dialog__body {
  height: calc(100vh - 120px);
  overflow: auto;
}
</style>
