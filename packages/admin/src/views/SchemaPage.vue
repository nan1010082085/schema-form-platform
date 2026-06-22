<script setup lang="ts">
/**
 * SchemaPage — Schema 渲染页
 *
 * 通过 qiankun loadMicroApp 手动加载 editor 子应用，
 * 将 schemaId 传给 editor 的 PublishView（/view?id=xxx）。
 */
import { ref, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { loadMicroApp } from 'qiankun'
import { APP_CONFIGS } from '@schema-form/shared-qiankun/config'
import type { MicroApp } from 'qiankun'

const route = useRoute()
const containerRef = ref<HTMLDivElement>()
const loading = ref(true)
const error = ref('')
const ready = ref(false)

let microApp: MicroApp | null = null

function getEditorEntry(): string {
  const config = APP_CONFIGS.editor
  const isDev = import.meta.env.DEV
  if (isDev) {
    return `//localhost:${config.devPort}${config.basePath}`
  }
  return `${window.location.origin}${config.basePath}`
}

async function startMicroApp(schemaId: string): Promise<void> {
  // 清理上一个实例
  if (microApp) {
    microApp.unmount()
    microApp = null
  }

  loading.value = true
  error.value = ''
  ready.value = false

  // 等待 DOM 渲染完成（containerRef 出现）
  await nextTick()

  if (!containerRef.value) {
    error.value = '渲染容器未就绪'
    loading.value = false
    return
  }

  loading.value = false

  const entry = getEditorEntry()

  try {
    microApp = loadMicroApp(
      {
        name: 'editor-schema-renderer',
        entry,
        container: containerRef.value,
        props: {
          initialPath: `/view?id=${schemaId}`,
        },
      },
      {
        sandbox: {
          strictStyleIsolation: true,
          experimentalStyleIsolation: false,
        },
      },
    )

    microApp.mountPromise.then(() => {
      ready.value = true
    }).catch((err: unknown) => {
      error.value = err instanceof Error ? err.message : '加载渲染器失败'
    })
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : '加载渲染器失败'
  }
}

// 监听路由参数变化
watch(
  () => route.params.schemaId,
  (newId) => {
    if (newId) startMicroApp(newId as string)
  },
  { immediate: true },
)
</script>

<template>
  <div :class="$style.page">
    <!-- Loading -->
    <div v-if="loading" :class="$style.state">
      <span>加载渲染器...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" :class="$style.state">
      <span :style="{ color: 'var(--color-danger)' }">{{ error }}</span>
    </div>

    <!-- qiankun 子应用挂载容器（始终渲染，loading 时隐藏） -->
    <div
      ref="containerRef"
      :class="$style.container"
      :style="{ visibility: loading ? 'hidden' : 'visible' }"
    ></div>
  </div>
</template>

<style module>
.page {
  width: 100%;
  height: 100%;
  position: relative;
}

.state {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color-secondary);
  font-size: 14px;
  z-index: 10;
  background: var(--bg-color-page);
}

.container {
  width: 100%;
  height: 100%;
}
</style>
