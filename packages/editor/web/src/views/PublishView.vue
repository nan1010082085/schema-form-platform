<script setup lang="ts">
/**
 * PublishView — 已发布 Schema 渲染器
 *
 * 通过 route.query.id (publishId) 加载已发布 Schema 并渲染。
 * 支持 postMessage API，可作为 iframe 嵌入宿主系统。
 *
 * 宿主通信协议（MicroFormEmbed / microapp host）：
 * - fg:set-mode    设置表单模式（mode / editableFields / readonlyFields）
 * - fg:set-context  设置上下文（user / request / global）
 * - fg:set-schema   覆盖 schema
 * - fg:set-data     设置表单数据
 * - fg:get-data     获取表单数据（支持 requestId 响应）
 * - fg:validate     校验表单（支持 requestId 响应）
 * - fg:submit       触发表单提交
 * - fg:reset        重置表单
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Loading, CircleCloseFilled } from '@element-plus/icons-vue'
import { WidgetRenderer } from '@/components/WidgetRenderer'
import type { FormData } from '@/components/WidgetRenderer'
import type { PartialWidget } from '@/widgets/base/types'
import { useAppStore } from '@/stores/app'
import { fetchPublishedSchema, fetchPublishedByPublishId } from '@/utils/apiClient'
import { sendToHost } from '@/microapp/bridge'
import { registerAllWidgets } from '@/widgets'
import styles from './PublishView.module.scss'

registerAllWidgets()

const route = useRoute()
const formRef = ref<InstanceType<typeof WidgetRenderer>>()
const appStore = useAppStore()

const schema = ref<PartialWidget[]>([])
const loading = ref(true)
const error = ref('')
const schemaName = ref('')

// ---- 表单模式状态（由宿主通过 fg:set-mode 设置） ----
const formMode = ref<'edit' | 'view' | 'partial'>('edit')
const editableFields = ref<string[] | undefined>(undefined)
const readonlyFields = ref<string[] | undefined>(undefined)

/** 是否全局只读（view 模式） */
const isReadonly = computed(() => formMode.value === 'view')

const schemaId = computed(() => route.query.id as string ?? '')
const context = computed(() => appStore.formGridContext)

async function loadSchema(id: string) {
  loading.value = true
  error.value = ''
  schema.value = []
  schemaName.value = ''

  try {
    // 优先按 publishId 查找，找不到再按 sourceId 查找
    let publishedSchema = await fetchPublishedByPublishId(id)
    if (!publishedSchema) {
      publishedSchema = await fetchPublishedSchema(id)
    }
    if (!publishedSchema) {
      error.value = `未找到 ID 为 "${id}" 的已发布 Schema`
      return
    }
    schema.value = publishedSchema.json
    schemaName.value = publishedSchema.name
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : `加载 Schema 失败`
  } finally {
    loading.value = false
  }
}

watch(schemaId, (id) => { if (id) loadSchema(id) }, { immediate: true })

// ---- postMessage 通信（iframe 嵌入场景） ----

/** 向宿主发送带 requestId 的响应 */
function sendResponse(type: string, payload: unknown, requestId?: string) {
  sendToHost({
    type,
    id: schemaId.value,
    requestId,
    ...(typeof payload === 'object' && payload !== null ? payload : { payload }),
  })
}

function handleMessage(event: MessageEvent) {
  const data = event.data
  if (!data || typeof data !== 'object') return
  const requestId = data.requestId as string | undefined

  switch (data.type) {
    case 'fg:set-mode':
      if (data.mode) formMode.value = data.mode as 'edit' | 'view' | 'partial'
      if (data.editableFields !== undefined) editableFields.value = data.editableFields as string[]
      if (data.readonlyFields !== undefined) readonlyFields.value = data.readonlyFields as string[]
      break

    case 'fg:set-context':
      if (data.user) appStore.updateRequestContext(data.user)
      if (data.request) appStore.updateRequestContext(data.request)
      if (data.global) appStore.updateGlobalContext(data.global)
      break

    case 'fg:set-schema':
      if (data.schema) schema.value = data.schema
      break

    case 'fg:set-data':
      if (data.data && formRef.value) formRef.value.setFormData(data.data)
      break

    case 'fg:get-data':
      if (formRef.value) {
        sendResponse('fg:data-response', { data: formRef.value.getFormData() }, requestId)
      }
      break

    case 'fg:validate':
      formRef.value?.validate().then(() => {
        sendResponse('fg:validate-response', { valid: true }, requestId)
      }).catch(() => {
        sendResponse('fg:validate-response', { valid: false }, requestId)
      })
      break

    case 'fg:submit':
      formRef.value?.submit()
      break

    case 'fg:reset':
      formRef.value?.resetFields()
      break
  }
}

function handleSubmit(data: FormData) {
  sendToHost({
    type: 'fg:submit',
    id: schemaId.value,
    data,
  })
}

onMounted(() => window.addEventListener('message', handleMessage))
onUnmounted(() => window.removeEventListener('message', handleMessage))
</script>

<template>
  <div :class="styles['fg-renderer']">
    <div v-if="loading" :class="styles['fg-renderer__loading']">
      <el-icon class="is-loading" :size="24"><Loading /></el-icon>
      <span>加载中...</span>
    </div>

    <div v-else-if="error" :class="styles['fg-renderer__error']">
      <el-icon :size="48" color="var(--color-danger)"><CircleCloseFilled /></el-icon>
      <p>{{ error }}</p>
    </div>

    <WidgetRenderer
      v-else
      ref="formRef"
      :schema="schema"
      layout="absolute"
      :user="context.user"
      :request="context.request"
      :global="context.global"
      :readonly="isReadonly"
      :editable-fields="formMode === 'partial' ? editableFields : undefined"
      :readonly-fields="formMode === 'partial' ? readonlyFields : undefined"
      @submit="handleSubmit"
    />
  </div>
</template>
