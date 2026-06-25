<template>
  <div :class="styles.wrapper">
    <div v-if="!publishId" :class="styles.empty">未绑定表单</div>
    <div v-else :class="styles.container">
      <div ref="containerRef" :class="styles.microContainer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { loadMicroApp } from 'qiankun'
import type { MicroApp } from 'qiankun'
import { APP_CONFIGS } from '@schema-form/platform-shared/qiankun/config'
import styles from './MicroFormEmbed.module.scss'

const props = defineProps<{
  publishId?: string
  mode?: 'edit' | 'view' | 'partial'
  hostMethods?: string[]
  initialData?: Record<string, unknown>
  /** partial 模式下可编辑的字段列表 */
  editableFields?: string[]
  /** partial 模式下只读的字段列表 */
  readonlyFields?: string[]
}>()

const emit = defineEmits<{
  ready: []
  valueChange: [values: Record<string, unknown>]
  submitSuccess: [data: unknown]
  submitError: [error: string]
  validationError: [errors: unknown]
}>()

const containerRef = ref<HTMLDivElement>()
let microApp: MicroApp | null = null

const editorEntry = (() => {
  const config = APP_CONFIGS.editor
  const isDev = import.meta.env.DEV
  return isDev
    ? `http://localhost:${config.devPort}/`
    : `${window.location.origin}${config.basePath}`
})()

// Pending request callbacks for command-response pattern
type PendingRequest = {
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}
const pendingRequests = new Map<string, PendingRequest>()

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// Send command to child micro-app via postMessage
function sendToChild(msg: Record<string, unknown>) {
  window.postMessage(msg, '*')
}

// Host message handler — receives responses from child via postMessage
function handleHostMessage(event: MessageEvent) {
  const data = event.data as Record<string, unknown> | undefined
  if (!data || typeof data !== 'object') return

  // Handle request-response
  if (data.requestId) {
    const pending = pendingRequests.get(data.requestId as string)
    if (pending) {
      pendingRequests.delete(data.requestId as string)
      if (data.action === 'error') {
        pending.reject(new Error(String(data.payload ?? 'Unknown error')))
      } else {
        pending.resolve(data.payload)
      }
      return
    }
  }

  // Handle fg protocol events from child
  switch (data.type) {
    case 'fg:data-response':
      emit('valueChange', data.data as Record<string, unknown>)
      break
    case 'fg:validate-response':
      // handled via pending request
      break
    case 'fg:submit':
      emit('submitSuccess', data.data)
      break
  }
}

async function mountMicroApp() {
  if (!props.publishId || !containerRef.value) return

  // 卸载已有实例
  if (microApp) {
    await microApp.unmount().catch(() => {})
    microApp = null
  }

  // 移除旧监听器，避免重复注册
  window.removeEventListener('message', handleHostMessage)

  try {
    microApp = loadMicroApp(
      {
        name: 'editor-form-preview',
        entry: editorEntry,
        container: containerRef.value,
        props: {
          basePath: `/view?id=${props.publishId}&mode=${props.mode ?? 'edit'}`,
        },
      },
      {
        sandbox: { experimentalStyleIsolation: true },
      },
    )

    await microApp.mountPromise

    window.addEventListener('message', handleHostMessage)
    emit('ready')

    // 向子应用发送表单模式配置
    requestAnimationFrame(() => {
      sendToChild({
        type: 'fg:set-mode',
        id: props.publishId,
        mode: props.mode ?? 'edit',
        editableFields: props.editableFields,
        readonlyFields: props.readonlyFields,
      })

      if (props.initialData) {
        sendToChild({
          type: 'fg:set-data',
          id: props.publishId,
          data: props.initialData,
        })
      }
    })
  } catch (err) {
    console.error('[MicroFormEmbed] Failed to mount editor:', err)
  }
}

onMounted(() => {
  mountMicroApp()
})

// 监听 publishId 变化重新加载
watch(() => props.publishId, () => {
  nextTick(() => mountMicroApp())
})

function sendCommand(type: string, payload?: unknown): Promise<unknown> {
  const requestId = generateRequestId()
  return new Promise((resolve, reject) => {
    pendingRequests.set(requestId, { resolve, reject })

    const msg = { type, id: props.publishId, requestId, ...(payload && typeof payload === 'object' ? payload : {}) }
    sendToChild(msg)

    setTimeout(() => {
      if (pendingRequests.has(requestId)) {
        pendingRequests.delete(requestId)
        reject(new Error(`Command "${type}" timed out`))
      }
    }, 10_000)
  })
}

function isMethodAllowed(method: string): boolean {
  if (!props.hostMethods || props.hostMethods.length === 0) return true
  return props.hostMethods.includes(method)
}

async function getValues(): Promise<Record<string, unknown>> {
  if (!isMethodAllowed('getValues')) throw new Error('getValues not allowed')
  return sendCommand('fg:get-data') as Promise<Record<string, unknown>>
}

async function setValues(values: Record<string, unknown>): Promise<void> {
  if (!isMethodAllowed('setValues')) throw new Error('setValues not allowed')
  await sendCommand('fg:set-data', { data: values })
}

async function validate(): Promise<boolean> {
  if (!isMethodAllowed('validate')) throw new Error('validate not allowed')
  return sendCommand('fg:validate') as Promise<boolean>
}

async function submit(): Promise<void> {
  if (!isMethodAllowed('submit')) throw new Error('submit not allowed')
  await sendCommand('fg:submit')
}

defineExpose({ getValues, setValues, validate, submit, sendCommand })

onUnmounted(() => {
  window.removeEventListener('message', handleHostMessage)
  pendingRequests.clear()
  microApp?.unmount()
  microApp = null
})
</script>
