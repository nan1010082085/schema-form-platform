<template>
  <t-dialog
    v-model:visible="visible"
    :title="title"
    :width="width"
    :destroy-on-close="destroyOnClose"
    :draggable="draggable"
    :fullscreen="isFullscreen"
    :footer="false"
    @close="handleClose"
  >
    <template #header>
      <div
        :class="$style.header"
        @mousedown="handleDragStart"
      >
        <span>{{ title }}</span>
        <div :class="$style.headerActions">
          <t-button theme="default" variant="text" size="small" @click="toggleFullscreen">
            <template #icon>
              <FullscreenExitIcon v-if="isFullscreen" />
              <FullscreenIcon v-else />
            </template>
          </t-button>
          <t-button theme="default" variant="text" size="small" @click="handleClose">
            <template #icon>
              <CloseIcon />
            </template>
          </t-button>
        </div>
      </div>
    </template>
    <slot />
    <template #footer>
      <slot name="footer">
        <t-button theme="default" @click="handleCancel">取消</t-button>
        <t-button theme="primary" :loading="loading" @click="handleConfirm">确定</t-button>
      </slot>
    </template>
  </t-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { FullscreenIcon, FullscreenExitIcon, CloseIcon } from 'tdesign-icons-vue-next'

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
  // TDesign 的 draggable 已内置，这里可以添加额外的拖拽逻辑
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
