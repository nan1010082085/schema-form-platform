<script setup lang="ts">
/**
 * FgDialog — 弹窗容器 Widget（完整版）
 *
 * 职责：
 * - 编辑模式：渲染容器 shell（header），子组件由 SchemaNode childrenLayer 渲染
 * - 预览模式：el-dialog 包裹，提供弹窗交互
 * - 提供 formContext 给内部子组件（dialog 自己的 formModel）
 * - 支持 confirm/cancel/open/close 事件
 * - destroyOnClose 关闭时清空 dialogModel
 * - 支持微应用模式（iframe 渲染）
 */
import { inject, ref, reactive, provide, watch, computed, onMounted, onUnmounted } from 'vue'
import { widgetDataKey, formContextKey } from '../base/types'
import SchemaRender from '../../components/WidgetRenderer/SchemaRender.vue'
import { useWidgetLifecycle } from '@/composables/useWidgetLifecycle'
import { useLogger } from '@/composables/useLogger'
import EnhancedDialog from '../../components/EnhancedDialog.vue'
import { useExposeWidget } from '@/composables/useExposeWidget'
import styles from './style.module.scss'

const widgetData = inject(widgetDataKey)!
const logger = useLogger('FgDialog')

useExposeWidget(() => ({
  get visible() { return visible.value },
  get dialogData() { return dialogModel },
}))

defineProps<{
  editable?: boolean
  defaultOpen?: boolean
}>()

const emit = defineEmits<{
  confirm: [data: Record<string, unknown>]
  cancel: []
  open: []
  close: []
}>()

// ---- 弹窗状态 ----
const visible = ref(false)

// ---- Dialog 独立 formModel ----
const dialogModel = reactive<Record<string, unknown>>({})
const childFormRef = ref<InstanceType<typeof import('element-plus')['ElForm']>>()

// ---- Lifecycle ----
const { trigger } = useWidgetLifecycle(widgetData, dialogModel)

onMounted(() => trigger('onMount'))
onUnmounted(() => trigger('onUnmount'))

// ---- 微应用模式 ----
const contentMode = computed(() => (widgetData.value.props?.contentMode as string) ?? 'edit')
const microappUrl = computed(() => {
  const publishId = widgetData.value.props?.publishId as string
  const baseUrl = (widgetData.value.props?.microappBaseUrl as string) || window.location.origin
  return publishId ? `${baseUrl}/child/schemaForm/preview/${publishId}` : ''
})

function handleMicroappLoad() {
  logger.info('microapp loaded:', microappUrl.value)
}

// ---- Provide form context（dialog 内部子组件使用） ----
provide(formContextKey, {
  formRef: childFormRef,
  formModel: dialogModel,
  updateField: (field: string, value: unknown) => {
    dialogModel[field] = value
  },
})

// ---- destroyOnClose 行为 ----
watch(visible, (newVal) => {
  if (!newVal && widgetData.value.props?.destroyOnClose) {
    Object.keys(dialogModel).forEach(key => {
      dialogModel[key] = undefined
    })
  }
})

// ---- defineExpose ----
defineExpose({
  open: (formData?: Record<string, unknown>) => {
    if (formData) Object.assign(dialogModel, formData)
    visible.value = true
    trigger('onOpen')
    emit('open')
  },
  close: () => {
    visible.value = false
    trigger('onClose')
    emit('close')
  },
  validate: () => childFormRef.value?.validate() ?? Promise.resolve(true),
  getDialogData: () => ({ ...dialogModel }),
  setDialogData: (data: Record<string, unknown>) => {
    Object.assign(dialogModel, data)
  },
})

// ---- 确认/取消 ----
function handleConfirm() {
  visible.value = false
  emit('confirm', { ...dialogModel })
}

function handleCancel() {
  visible.value = false
  emit('cancel')
}
</script>

<template>
  <!-- 编辑模式：容器 shell（header），子组件由 childrenLayer 渲染在容器原点 -->
  <div v-if="editable" :class="styles.dialogShell">
    <div :class="styles.dialogHeader">
      <span :class="styles.dialogTitle">{{ (widgetData.props?.title as string) || '弹窗标题' }}</span>
    </div>
  </div>

  <!-- 预览/运行时模式 -->
  <template v-else>
    <!-- 微应用模式 -->
    <div v-if="contentMode === 'microapp'" :class="styles.microappContainer">
      <iframe
        v-if="microappUrl"
        :src="microappUrl"
        frameborder="0"
        :class="styles.microappIframe"
        @load="handleMicroappLoad"
      />
    </div>

    <!-- 编辑模式：EnhancedDialog（teleport 到 body） -->
    <EnhancedDialog
      v-else
      v-model="visible"
      :title="(widgetData.props?.title as string) || '弹窗标题'"
      :width="(widgetData.props?.width as string) || '600px'"
      :draggable="widgetData.props?.draggable !== false"
      :show-fullscreen-btn="widgetData.props?.showFullscreenBtn !== false"
      :destroy-on-close="widgetData.props?.destroyOnClose !== false"
      :close-on-click-modal="widgetData.props?.closeOnClickModal === true"
    >
      <SchemaRender
        v-if="widgetData.children?.length"
        :widgets="widgetData.children"
      />
      <template v-if="widgetData.props?.showFooter !== false" #footer>
        <div :class="styles.footer">
          <el-button @click="handleCancel">{{ (widgetData.props?.cancelText as string) || '取消' }}</el-button>
          <el-button type="primary" @click="handleConfirm">{{ (widgetData.props?.confirmText as string) || '确定' }}</el-button>
        </div>
      </template>
    </EnhancedDialog>
  </template>
</template>
