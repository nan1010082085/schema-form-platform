<script setup lang="ts">
/**
 * FgMicroAppContainer — 微应用容器 Widget
 *
 * 通过 qiankun loadMicroApp 动态加载子应用
 * 支持：沙箱隔离、CSS 隔离、超时兜底、参数传递、路由前缀
 */
import { inject, computed, ref, watch, onUnmounted } from 'vue'
import { widgetDataKey } from '../base/types'
import { loadMicroApp } from 'qiankun'
import type { MicroApp } from 'qiankun'
import styles from './style.module.scss'

const widgetData = inject(widgetDataKey)!

const appName = computed(() => widgetData.value.props?.microappName as string ?? '')
const appEntry = computed(() => widgetData.value.props?.microappEntry as string ?? '')
const appRoute = computed(() => widgetData.value.props?.microappRoute as string ?? '')
const sandbox = computed(() => widgetData.value.props?.microappSandbox !== false)
const styleIsolation = computed(() => (widgetData.value.props?.microappStyleIsolation as string) ?? 'experimental')
const timeout = computed(() => (widgetData.value.props?.microappTimeout as number) ?? 10000)
const fallbackText = computed(() => (widgetData.value.props?.microappFallback as string) ?? '子应用加载失败')
const routeBase = computed(() => widgetData.value.props?.microappRouteBase as string ?? '')
const height = computed(() => (widgetData.value.props?.height as string) || '100%')
const variables = computed(() => (widgetData.value.props?.variables as Record<string, unknown>) ?? {})

const emit = defineEmits<{
  message: [data: unknown]
  ready: []
  error: [err: unknown]
}>()

const containerRef = ref<HTMLDivElement>()
const loading = ref(false)
const error = ref('')
let microApp: MicroApp | null = null
let timeoutTimer: ReturnType<typeof setTimeout> | null = null

function getSandboxConfig() {
  if (!sandbox.value) return false
  switch (styleIsolation.value) {
    case 'strict': return { strictStyleIsolation: true }
    case 'none': return { sandbox: false }
    default: return {}
  }
}

async function loadApp() {
  if (!appName.value || !appEntry.value || !containerRef.value) return

  loading.value = true
  error.value = ''

  // 卸载已有实例
  if (microApp) {
    await microApp.unmount().catch(() => {})
    microApp = null
  }

  // 超时兜底
  if (timeoutTimer) clearTimeout(timeoutTimer)
  timeoutTimer = setTimeout(() => {
    if (loading.value) {
      error.value = `加载超时（${timeout.value}ms）`
      loading.value = false
      emit('error', new Error('timeout'))
    }
  }, timeout.value)

  try {
    const props: Record<string, unknown> = { ...variables.value }
    if (routeBase.value) props.base = routeBase.value
    if (appRoute.value) props.route = appRoute.value

    microApp = loadMicroApp(
      { name: appName.value, entry: appEntry.value, container: containerRef.value },
      {
        sandbox: getSandboxConfig(),
        props,
      },
    )

    await microApp.mount()
    loading.value = false
    emit('ready')
  } catch (e) {
    loading.value = false
    error.value = fallbackText.value
    emit('error', e)
  } finally {
    if (timeoutTimer) {
      clearTimeout(timeoutTimer)
      timeoutTimer = null
    }
  }
}

watch([appName, appEntry], () => loadApp(), { immediate: true })

onUnmounted(() => {
  if (timeoutTimer) clearTimeout(timeoutTimer)
  microApp?.unmount()
  microApp = null
})

function postMessage(data: unknown) {
  containerRef.value?.querySelector('iframe')?.contentWindow?.postMessage(data, '*')
}

defineExpose({ postMessage })
</script>

<template>
  <div :class="styles.container" :style="{ height }">
    <div v-if="!appName || !appEntry" :class="$style.placeholder">
      请配置子应用名称和入口地址
    </div>
    <div v-else-if="error" :class="$style.error">
      {{ error }}
    </div>
    <div v-else ref="containerRef" style="height: 100%;" />
  </div>
</template>

<style module>
.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-lighter);
  border: 1px dashed var(--el-border-color);
}
.error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
  border: 1px dashed var(--el-color-danger-light-5);
}
</style>
