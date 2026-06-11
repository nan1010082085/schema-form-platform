<script setup lang="ts">
/**
 * MicroAppLoader -- wraps <micro-app> with loading/error overlays
 *
 * micro-app must always render (cannot be display:none), otherwise it
 * cannot initialize. Loading/error states use overlay layers instead.
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
    <!-- Loading overlay -->
    <div v-if="isLoading" :class="$style.overlay">
      <div :class="$style.spinner">
        <div :class="$style.spinnerInner"></div>
      </div>
      <div :class="$style.loadingText">Loading...</div>
    </div>

    <!-- Error overlay -->
    <div v-if="isError" :class="$style.overlay">
      <div :class="$style.errorIcon">!</div>
      <div :class="$style.errorText">Failed to load</div>
      <div :class="$style.errorMessage">{{ error?.message }}</div>
    </div>

    <!-- Child app always renders -->
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
  background: var(--bg-color-page, #f5f7fa);
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
  border: 3px solid var(--border-color-light, #e0e0e0);
  border-top-color: var(--color-primary, #1677ff);
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
  color: var(--text-color-regular, #666);
}

.errorIcon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-danger, #f56c6c);
  color: var(--text-color-inverse, #fff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 16px;
}

.errorText {
  font-size: 16px;
  color: var(--text-color-primary, #333);
  font-weight: 500;
  margin-bottom: 8px;
}

.errorMessage {
  font-size: 13px;
  color: var(--text-color-secondary, #999);
}
</style>
