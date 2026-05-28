<script setup lang="ts">
/**
 * PublishView — 已发布 Schema 渲染器
 *
 * 通过 route.query.id (publishId) 加载已发布 Schema 并渲染。
 * 支持 postMessage API，可作为 iframe 嵌入宿主系统。
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Loading, CircleCloseFilled } from '@element-plus/icons-vue'
import { WidgetRenderer } from '@/components/WidgetRenderer'
import type { FormData } from '@/components/WidgetRenderer'
import type { PartialWidget } from '@/widgets/base/types'
import { useAppStore } from '@/stores/app'
import { fetchPublishedSchema } from '@/utils/apiClient'
import { sendToHost } from '@/microapp/bridge'

const route = useRoute()
const formRef = ref<InstanceType<typeof WidgetRenderer>>()
const appStore = useAppStore()

const schema = ref<PartialWidget[]>([])
const loading = ref(true)
const error = ref('')
const schemaName = ref('')

const schemaId = computed(() => route.query.id as string ?? '')
const context = computed(() => appStore.formGridContext)

async function loadSchema(id: string) {
  loading.value = true
  error.value = ''
  schema.value = []
  schemaName.value = ''

  try {
    const publishedSchema = await fetchPublishedSchema(id)
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
      if (data.schema) schema.value = data.schema
      break

    case 'fg:set-data':
      if (data.data && formRef.value) formRef.value.setFormData(data.data)
      break

    case 'fg:get-data':
      if (formRef.value) {
        sendToHost({
          type: 'fg:data-response',
          id: schemaId.value,
          data: formRef.value.getFormData(),
        })
      }
      break

    case 'fg:validate':
      formRef.value?.validate().then(() => {
        sendToHost({ type: 'fg:validate-response', id: schemaId.value, valid: true })
      }).catch(() => {
        sendToHost({ type: 'fg:validate-response', id: schemaId.value, valid: false })
      })
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
  <div class="fg-renderer">
    <div v-if="loading" class="fg-renderer__loading">
      <el-icon class="is-loading" :size="24"><Loading /></el-icon>
      <span>加载中...</span>
    </div>

    <div v-else-if="error" class="fg-renderer__error">
      <el-icon :size="48" color="#E50113"><CircleCloseFilled /></el-icon>
      <p>{{ error }}</p>
    </div>

    <WidgetRenderer
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
}
</style>
