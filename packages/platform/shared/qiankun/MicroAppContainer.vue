<script setup lang="ts">
/**
 * MicroAppContainer — 纯 qiankun 微应用容器
 *
 * 通过 useMicroApp 管理子应用生命周期，仅支持 qiankun 模式。
 * 宿主应用通过 loadMicroApp prop 注入 qiankun 实例，避免直接依赖。
 */
import { toRef } from 'vue'
import { ElIcon } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { useMicroApp, type LoadMicroAppFn } from './useMicroApp'
import type { AppName } from './config'

const props = withDefaults(defineProps<{
  /** 子应用名称（qiankun 标识） */
  name: AppName
  /** 自定义 entry URL（覆盖默认地址） */
  src?: string
  /** 附加到 props 的查询参数 */
  query?: Record<string, string>
  /** 是否为开发环境 */
  isDev?: boolean
  /** qiankun loadMicroApp 函数（从宿主注入） */
  loadMicroApp: LoadMicroAppFn
}>(), {
  isDev: !import.meta.env.PROD,
})

const { loading, error, containerRef } = useMicroApp({
  appName: props.name,
  src: props.src ? toRef(props, 'src') : undefined,
  query: props.query ? toRef(props, 'query') : undefined,
  isDev: props.isDev,
  loadMicroApp: props.loadMicroApp,
})
</script>

<template>
  <div :class="$style.container">
    <!-- qiankun 挂载点 -->
    <div ref="containerRef" :class="$style.mountPoint" />

    <!-- 加载状态 -->
    <Transition name="fade">
      <div v-if="loading" :class="$style.overlay">
        <slot name="loading">
          <div :class="$style.loadingContent">
            <ElIcon :class="$style.spinIcon" :size="28">
              <Loading />
            </ElIcon>
            <span :class="$style.loadingText">加载中...</span>
          </div>
        </slot>
      </div>
    </Transition>

    <!-- 错误状态 -->
    <Transition name="fade">
      <div v-if="error" :class="$style.overlay">
        <slot name="error" :error="error">
          <div :class="$style.errorContent">
            <span :class="$style.errorText">加载失败: {{ error.message }}</span>
          </div>
        </slot>
      </div>
    </Transition>
  </div>
</template>

<style module>
.container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.mountPoint {
  width: 100%;
  height: 100%;
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.85);
  z-index: 10;
}

.loadingContent {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.spinIcon {
  animation: spin 1s linear infinite;
  color: var(--el-color-primary);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loadingText {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.errorContent {
  display: flex;
  align-items: center;
  justify-content: center;
}

.errorText {
  font-size: 14px;
  color: var(--el-color-danger);
}
</style>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
