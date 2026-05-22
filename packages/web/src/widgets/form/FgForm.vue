<script setup lang="ts">
/**
 * FgForm — 表单容器 Widget（完整版）
 *
 * 职责：
 * - 包裹 el-form，提供表单布局和校验能力
 * - 渲染子组件（通过 slot 接收 SchemaNode 传入的 children）
 * - 收集子组件字段值、校验、提交/重置
 * - provide 表单上下文（formRef + formModel + updateField）给子组件
 * - 集成 useWidgetLifecycle 生命周期钩子
 * - 支持 loadApi 远程数据加载
 */
import { inject, ref, reactive, provide, watch, onMounted, onUnmounted } from 'vue'
import { widgetDataKey, formContextKey } from '../base/types'
import type { Widget } from '../base/types'
import { useWidgetLifecycle } from '@/composables/useWidgetLifecycle'
import { useWorkerRequest } from '@/composables/useWorkerRequest'
import { useLogger } from '@/composables/useLogger'
import styles from './style.module.scss'

const widgetData = inject(widgetDataKey)!

const emit = defineEmits<{
  submit: [data: Record<string, unknown>]
  'validate-error': [fields: unknown[]]
  reset: []
  'data-change': [field: string, value: unknown]
}>()

const logger = useLogger('FgForm')

// ---- ElForm ref ----
const formRef = ref<InstanceType<typeof import('element-plus')['ElForm']>>()

// ---- 表单数据模型 ----
const formModel = reactive<Record<string, unknown>>({})

/** 递归收集所有后代 Widget 的字段值到 formModel */
function syncModel(widgets: Widget[]): void {
  for (const w of widgets) {
    if (w.field) {
      if (!(w.field in formModel)) {
        formModel[w.field] = w.defaultValue ?? null
      }
    }
    if (w.children?.length) {
      syncModel(w.children)
    }
  }
}

/** 监听 children 变化，保持 formModel 与 widget 值同步 */
watch(
  () => widgetData.value.children,
  (children) => {
    if (children) syncModel(children)
  },
  { immediate: true, deep: true },
)

/** updateField — 子组件通过 inject(formContextKey) 调用 */
function updateField(field: string, value: unknown) {
  const oldValue = formModel[field]
  formModel[field] = value
  if (oldValue !== value) {
    emit('data-change', field, value)
  }
}

// ---- Provide 表单上下文 ----
provide(formContextKey, { formRef, formModel, updateField })

// ---- 生命周期集成 ----
const { trigger } = useWidgetLifecycle(widgetData, formModel)

onMounted(() => {
  trigger('onMount')
  if (widgetData.value.api) {
    loadRemoteData()
  }
})

onUnmounted(() => {
  trigger('onUnmount')
})

// ---- loadApi 远程数据加载 ----
async function loadRemoteData() {
  const api = widgetData.value.api
  if (!api) return
  const workerRequest = useWorkerRequest()
  try {
    const data = await workerRequest.request({
      url: api.url,
      method: api.method ?? 'get',
      params: api.params,
      dataPath: api.dataPath,
    })
    if (data && typeof data === 'object') {
      Object.assign(formModel, data)
      await trigger('onAfterLoad')
    }
  } catch (e) {
    logger.error('loadApi failed:', e)
  }
}

// ---- defineExpose ----
defineExpose({
  validate: () => formRef.value?.validate() ?? Promise.resolve(false),
  validateField: (field: string) => formRef.value?.validateField(field),
  clearValidate: (field?: string) => formRef.value?.clearValidate(field),
  resetFields: () => {
    formRef.value?.resetFields()
    emit('reset')
  },
  scrollToField: (field: string) => formRef.value?.scrollToField(field),
  getFormData: () => ({ ...formModel }),
  setFormData: (data: Record<string, unknown>) => {
    Object.assign(formModel, data)
  },
  submit: async () => {
    await trigger('onBeforeSubmit')
    const valid = await formRef.value?.validate()
    if (valid) {
      emit('submit', { ...formModel })
    } else {
      emit('validate-error', formRef.value?.fields ?? [])
    }
  },
})
</script>

<template>
  <el-form
    ref="formRef"
    :model="formModel"
    :class="styles.formContainer"
    :label-width="(widgetData.props?.labelWidth as string) || '100px'"
    :label-position="(widgetData.props?.labelPosition as 'left' | 'right' | 'top') || 'right'"
  >
    <slot />
  </el-form>
</template>
