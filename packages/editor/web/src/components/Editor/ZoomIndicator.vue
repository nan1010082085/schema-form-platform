<script setup lang="ts">
/**
 * ZoomIndicator — 画布缩放指示器
 *
 * 浮动在画布右下角，显示当前缩放百分比，支持 +/- 操作和一键重置。
 */
import { computed } from 'vue'
import { useBoardStore } from '@/stores/board'
import styles from './ZoomIndicator.module.scss'

const boardStore = useBoardStore()

const zoom = computed(() => boardStore.canvas.zoom)
const canZoomOut = computed(() => zoom.value > 50)
const canZoomIn = computed(() => zoom.value < 200)
const isDefaultZoom = computed(() => zoom.value === 100)

function zoomIn() {
  boardStore.setZoom(zoom.value + 10)
}

function zoomOut() {
  boardStore.setZoom(zoom.value - 10)
}

function resetZoom() {
  boardStore.setZoom(100)
}
</script>

<template>
  <div :class="styles.container">
    <button :class="styles.btn" :disabled="!canZoomOut" title="缩小" @click="zoomOut">-</button>
    <span :class="styles.value">{{ zoom }}%</span>
    <button :class="styles.btn" :disabled="!canZoomIn" title="放大" @click="zoomIn">+</button>
    <button
      v-if="!isDefaultZoom"
      :class="styles.reset"
      title="重置为 100%"
      @click="resetZoom"
    >重置</button>
  </div>
</template>
