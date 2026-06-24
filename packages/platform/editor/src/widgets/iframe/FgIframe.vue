<script setup lang="ts">
/**
 * FgIframe — iframe 嵌入外部网页 Widget
 *
 * 支持全屏模式、弹框模式、边框控制、加载/错误状态。
 */
import { inject, computed, ref } from 'vue'
import { widgetDataKey } from '../base/types'
import styles from './style.module.scss'

const widgetData = inject(widgetDataKey)!

const src = computed(() => widgetData.value.props?.src as string ?? '')
const width = computed(() => (widgetData.value.props?.width as string) || '100%')
const height = computed(() => (widgetData.value.props?.height as string) || '400px')
const border = computed(() => widgetData.value.props?.border === true)
const fullscreen = computed(() => widgetData.value.props?.fullscreen === true)
const dialogMode = computed(() => widgetData.value.props?.dialogMode === true)

const loading = ref(false)
const hasError = ref(false)

function handleLoad() {
  loading.value = false
  hasError.value = false
}

function handleError() {
  loading.value = false
  hasError.value = true
}

// Start loading when src changes
function handleSrcChange() {
  if (src.value) {
    loading.value = true
    hasError.value = false
  }
}

// Watch src to trigger loading state
const iframeSrc = computed(() => {
  handleSrcChange()
  return src.value
})

const wrapperStyle = computed(() => {
  if (fullscreen.value) return {}
  return { width: width.value, height: height.value }
})

const wrapperClasses = computed(() => {
  if (fullscreen.value) return [styles.wrapper, styles.fullscreen]
  return [styles.wrapper]
})

const iframeClasses = computed(() => {
  const cls = [styles.iframe]
  if (border.value && !fullscreen.value) cls.push(styles.withBorder)
  return cls
})

// Placeholder for editor canvas — don't actually load external URLs in editor mode
const isEditorMode = computed(() => !src.value)
</script>

<template>
  <!-- Dialog mode: overlay + centered content -->
  <div v-if="dialogMode && !fullscreen" :class="styles.dialogOverlay">
    <div :class="styles.dialogContent">
      <div v-if="loading" :class="styles.loadingOverlay">
        <span>加载中...</span>
      </div>
      <div v-if="hasError" :class="styles.errorOverlay">
        <span>加载失败</span>
        <span :style="{ fontSize: '12px', color: 'var(--el-text-color-secondary)' }">
          请检查 URL 是否正确
        </span>
      </div>
      <iframe
        v-if="src && !hasError"
        :class="iframeClasses"
        :src="iframeSrc"
        sandbox="allow-scripts allow-same-origin allow-forms"
        frameborder="0"
        @load="handleLoad"
        @error="handleError"
      />
    </div>
  </div>

  <!-- Fullscreen mode -->
  <div v-else-if="fullscreen" :class="styles.fullscreen">
    <div v-if="loading" :class="styles.loadingOverlay">
      <span>加载中...</span>
    </div>
    <div v-if="hasError" :class="styles.errorOverlay">
      <span>加载失败</span>
    </div>
    <iframe
      v-if="src && !hasError"
      :class="iframeClasses"
      :src="iframeSrc"
      sandbox="allow-scripts allow-same-origin allow-forms"
      frameborder="0"
      @load="handleLoad"
      @error="handleError"
    />
  </div>

  <!-- Normal mode -->
  <div v-else :class="wrapperClasses" :style="wrapperStyle">
    <!-- Editor canvas placeholder -->
    <div v-if="isEditorMode" :class="styles.placeholder">
      请配置 iframe URL
    </div>
    <template v-else>
      <div v-if="loading" :class="styles.loadingOverlay">
        <span>加载中...</span>
      </div>
      <div v-if="hasError" :class="styles.errorOverlay">
        <span>加载失败</span>
        <span :style="{ fontSize: '12px', color: 'var(--el-text-color-secondary)' }">
          请检查 URL 是否正确
        </span>
      </div>
      <iframe
        v-if="!hasError"
        :class="iframeClasses"
        :src="iframeSrc"
        sandbox="allow-scripts allow-same-origin allow-forms"
        frameborder="0"
        @load="handleLoad"
        @error="handleError"
      />
    </template>
  </div>
</template>
