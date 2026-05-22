<script setup lang="ts">
/**
 * PublishView — 已发布 Schema 渲染器（对外出口）
 *
 * 通过 route.query.id 加载已发布的 Schema 并渲染。
 * 仅允许 status === 'published' 的 Schema；demo/本地注册表兼容保留。
 * 支持 postMessage API，可作为 iframe 嵌入宿主系统。
 *
 * 由原 RendererView 重构而来。
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Loading, CircleCloseFilled } from '@element-plus/icons-vue'
import { FormGrid } from '@/components/FormGrid'
import type { FormSchemaItem, FormData } from '@/components/FormGrid'
import { useAppStore } from '@/stores/app'
import { processSchema } from '@/utils/requestQueue'
import { fetchPublishedSchema } from '@/utils/apiClient'
import { msaFormRegistry, type MsaFormSchemaConfig } from '@/schemas/msa-form'
import { applyMode } from '@/schemas/msa-form-utils'
import { demoSchemas } from '@/schemas/demo'

type RegistryEntry = FormSchemaItem[] | MsaFormSchemaConfig

const route = useRoute()
const formRef = ref<InstanceType<typeof FormGrid>>()
const appStore = useAppStore()

const pageConfig = ref<MsaFormSchemaConfig | null>(null)
const baseSchema = ref<FormSchemaItem[]>([])
const loading = ref(true)
const error = ref('')
const schemaName = ref('')

// ---- 从 query 获取参数 ----
const schemaId = computed(() => route.query.id as string ?? '')
const mode = computed(() => (route.query.mode as 'add' | 'edit' | 'detail') ?? 'add')

// ---- 上下文从 store 读取 ----
const context = computed(() => appStore.formGridContext)

// ---- 将 MsaFormConfig 转换为完整 schema 树 ----
function buildFullSchema(config: MsaFormSchemaConfig, currentMode: string): FormSchemaItem[] {
  const modeButtons = config.buttons[currentMode as keyof typeof config.buttons] ?? []
  return [{
    type: 'page',
    children: [
      {
        type: 'toolbar',
        children: [{ type: 'button-list', buttons: modeButtons }]
      },
      { type: 'spacer', props: { height: '60px' } },
      {
        type: 'card',
        children: [
          { type: 'title', props: { label: config.title } },
          ...applyMode(config.schema, currentMode as 'add' | 'edit' | 'detail')
        ]
      }
    ]
  }]
}

// ---- 最终渲染 schema ----
const schema = computed<FormSchemaItem[]>(() => {
  if (pageConfig.value) {
    return buildFullSchema(pageConfig.value, mode.value)
  }
  return baseSchema.value
})

// ---- Schema 注册表（本地 demo + msa-form 业务表单） ----
const schemaRegistry: Record<string, RegistryEntry> = {
  ...Object.fromEntries(
    Object.entries(demoSchemas).map(([id, entry]: [string, { schema: FormSchemaItem[] }]) => [id, entry.schema])
  ),
  ...msaFormRegistry
}

// ---- 判断是否为 MsaFormSchemaConfig ----
function isMsaFormConfig(entry: RegistryEntry): entry is MsaFormSchemaConfig {
  return !Array.isArray(entry)
}

// ---- 加载 Schema ----
async function loadSchema(id: string) {
  loading.value = true
  error.value = ''
  pageConfig.value = null
  baseSchema.value = []
  schemaName.value = ''

  try {
    // 1) Try local registry (demo + msa-form) — always allowed
    const entry = schemaRegistry[id]
    if (entry) {
      if (isMsaFormConfig(entry)) {
        pageConfig.value = entry
      } else {
        baseSchema.value = entry
      }
      schemaName.value = id
    } else {
      // 2) Fetch from PublishedSchema table — only published schemas are accessible
      const publishedSchema = await fetchPublishedSchema(id)
      if (!publishedSchema) {
        error.value = `未找到 ID 为 "${id}" 的已发布 Schema`
        return
      }
      baseSchema.value = publishedSchema.json
      schemaName.value = publishedSchema.name
    }

    await processSchema(schema.value)
  } catch (err: unknown) {
    if (err instanceof Error && err.message) {
      error.value = err.message
    } else {
      error.value = `未找到 ID 为 "${id}" 的已发布 Schema`
    }
  } finally {
    loading.value = false
  }
}

// ---- 监听 id 变化 ----
watch(schemaId, (id) => {
  if (id) loadSchema(id)
}, { immediate: true })

// ---- postMessage 通信（iframe 嵌入场景） ----
function handleMessage(event: MessageEvent) {
  const data = event.data
  if (!data || typeof data !== 'object') return

  switch (data.type) {
    case 'fg:set-context':
      if (data.user) appStore.updateRequestContext(data.user)
      if (data.request) appStore.updateRequestContext(data.request)
      if (data.global) appStore.updateGlobalContext(data.global)
      break

    case 'fg:set-schema':
      if (data.schema) baseSchema.value = data.schema
      break

    case 'fg:set-data':
      if (data.data && formRef.value) formRef.value.setFormData(data.data)
      break

    case 'fg:get-data':
      if (formRef.value) {
        window.parent?.postMessage({
          type: 'fg:data-response',
          id: schemaId.value,
          data: formRef.value.getFormData()
        }, '*')
      }
      break

    case 'fg:validate':
      formRef.value?.validate().then(() => {
        window.parent?.postMessage({ type: 'fg:validate-response', id: schemaId.value, valid: true }, '*')
      }).catch(() => {
        window.parent?.postMessage({ type: 'fg:validate-response', id: schemaId.value, valid: false }, '*')
      })
      break

    case 'fg:reset':
      formRef.value?.resetFields()
      break
  }
}

function handleSubmit(data: FormData) {
  window.parent?.postMessage({
    type: 'fg:submit',
    id: schemaId.value,
    data
  }, '*')
}

onMounted(() => {
  window.addEventListener('message', handleMessage)
})

onUnmounted(() => {
  window.removeEventListener('message', handleMessage)
})
</script>

<template>
  <div class="fg-renderer">
    <!-- 加载状态 -->
    <div v-if="loading" class="fg-renderer__loading">
      <el-icon class="is-loading" :size="24"><Loading /></el-icon>
      <span>加载中...</span>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="fg-renderer__error">
      <el-icon :size="48" color="#E50113"><CircleCloseFilled /></el-icon>
      <p>{{ error }}</p>
      <p class="fg-renderer__error-hint">
        Demo ID: {{ Object.keys(schemaRegistry).join(', ') }} | 或使用已发布的服务端 Schema UUID
      </p>
    </div>

    <!-- 统一渲染：所有布局通过 schema 驱动 -->
    <FormGrid
      v-else
      ref="formRef"
      :schema="schema"
      :user="context.user"
      :request="context.request"
      :global="context.global"
      @submit="handleSubmit"
    />
  </div>
</template>

<style lang="scss" scoped>
.fg-renderer {
  min-height: 100vh;
  background: #f5f7fa;

  &__loading,
  &__error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    gap: 12px;
    color: #666;
  }

  &__error-hint {
    font-size: 13px;
    color: #999;
    margin-top: 8px;
  }
}
</style>
