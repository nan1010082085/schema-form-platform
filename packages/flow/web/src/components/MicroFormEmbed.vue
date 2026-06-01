<template>
  <div :class="styles.wrapper">
    <div v-if="!publishId" :class="styles.empty">未绑定表单</div>
    <div v-else :class="styles.container">
      <micro-app
        :key="publishId"
        :name="appName"
        :url="microAppUrl"
        :data="microAppData"
        iframe
        @created="onCreated"
        @unmount="onUnmount"
        @error="onError"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import styles from './MicroFormEmbed.module.scss'

const props = defineProps<{
  publishId?: string
  mode?: 'edit' | 'view'
  hostMethods?: string[]
  initialData?: Record<string, unknown>
}>()

const emit = defineEmits<{
  ready: []
  valueChange: [values: Record<string, unknown>]
  submitSuccess: [data: unknown]
  submitError: [error: string]
  validationError: [errors: unknown]
}>()

const appName = computed(() => `flow-form-${props.publishId ?? 'none'}`)

const editorBaseUrl = computed(() => {
  const base = import.meta.env.VITE_EDITOR_BASE_URL as string | undefined
  return base || window.location.origin
})

const microAppUrl = computed(() => {
  if (!props.publishId) return ''
  return `${editorBaseUrl.value}/view?id=${props.publishId}`
})

const microAppData = computed(() => ({
  mode: props.mode ?? 'edit',
  hostMethods: props.hostMethods ?? ['setValues', 'getValues', 'validate'],
  initialData: props.initialData,
}))

// Pending request callbacks for command-response pattern
type PendingRequest = {
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}
const pendingRequests = new Map<string, PendingRequest>()

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// Find the child iframe created by micro-app
function getChildIframe(): HTMLIFrameElement | null {
  const el = document.querySelector(`micro-app[name="${appName.value}"]`)
  return el?.querySelector('iframe') as HTMLIFrameElement | null
}

// Send command to child iframe via postMessage
function sendToChild(msg: Record<string, unknown>) {
  const iframe = getChildIframe()
  iframe?.contentWindow?.postMessage(msg, '*')
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

function onCreated() {
  window.addEventListener('message', handleHostMessage)
  emit('ready')
}

function onUnmount() {
  window.removeEventListener('message', handleHostMessage)
}

function onError(err: unknown) {
  console.error('[MicroFormEmbed] micro-app error:', err)
}

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
})
</script>
