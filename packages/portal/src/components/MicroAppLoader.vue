<script setup lang="ts">
/**
 * 微前端子应用加载器
 *
 * 封装 <micro-app> 组件，提供 loading 和错误状态显示。
 * micro-app 必须始终渲染（不能 display:none），否则无法初始化。
 * 用覆盖层实现 loading/error 状态。
 */
import { computed } from 'vue'
import { useMicroApp } from '@schema-form/micro-app/host'
import type { MicroAppConfig } from '@schema-form/micro-app/types'

const props = defineProps<{
  config: MicroAppConfig
}>()

const { status, error } = useMicroApp(props.config)

const isLoading = computed(() => status.value === 'loading')
const isError = computed(() => status.value === 'error')
</script>

<template>
  <div :class="$style.container">
    <!-- Loading 覆盖层 -->
    <div v-if="isLoading" :class="$style.overlay">
      <div :class="$style.spinner">
        <div :class="$style.spinnerInner"></div>
      </div>
      <div :class="$style.loadingText">加载中...</div>
    </div>

    <!-- 错误覆盖层 -->
    <div v-if="isError" :class="$style.overlay">
      <div :class="$style.errorIcon">!</div>
      <div :class="$style.errorText">加载失败</div>
      <div :class="$style.errorMessage">{{ error?.message }}</div>
    </div>

    <!-- 子应用始终渲染，不能隐藏 -->
    <micro-app
      :name="config.name"
      :url="config.url"
      :data="config.data ?? {}"
      destroy
      iframe
    />
  </div>
</template>

<style module>
.container {
  width: 100%;
  height: 100%;
  position: relative;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  z-index: 10;
}

.spinner {
  width: 40px;
  height: 40px;
  margin-bottom: 16px;
}

.spinnerInner {
  width: 100%;
  height: 100%;
  border: 3px solid #e0e0e0;
  border-top-color: #0060a2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loadingText {
  font-size: 14px;
  color: #666;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.errorIcon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #f56c6c;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 16px;
}

.errorText {
  font-size: 16px;
  color: #333;
  font-weight: 500;
  margin-bottom: 8px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.errorMessage {
  font-size: 13px;
  color: #999;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>
