<script setup lang="ts">
/**
 * FgDialog — 弹窗容器 Widget
 *
 * 职责：
 * - 编辑模式：渲染容器 shell（header），子组件由 SchemaNode childrenLayer 渲染
 * - 预览模式：el-dialog 包裹，提供弹窗交互
 * - 提供 formContext 给内部子组件（dialog 自己的 formModel）
 * - 支持 confirm/cancel/open/close 事件
 * - destroyOnClose 关闭时清空 dialogModel
 * - 支持微应用模式（qiankun loadMicroApp 动态加载）
 */
import { inject, ref, reactive, provide, watch, computed, onMounted, onUnmounted } from 'vue'
import { widgetDataKey, formContextKey } from '../base/types'
import { EVENT_CONTEXT_KEY } from '../../components/WidgetRenderer/types'
import { triggerWidgetEvent } from '../../engine/eventEngine'
import SchemaRender from '../../components/WidgetRenderer/SchemaRender.vue'
import { useWidgetLifecycle } from '@/composables/useWidgetLifecycle'
import AppDialog from '@schema-form/shared-components/common/AppDialog.vue'
import { useExposeWidget } from '@/composables/useExposeWidget'
import { loadMicroApp } from 'qiankun'
import type { MicroApp } from 'qiankun'
import styles from './style.module.scss'

const widgetData = inject(widgetDataKey)!
const eventCtx = inject(EVENT_CONTEXT_KEY, null)

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
const childFormRef = ref<any>()

// ---- Lifecycle ----
const { trigger } = useWidgetLifecycle(widgetData, dialogModel)

onMounted(() => trigger('onMount'))
onUnmounted(() => trigger('onUnmount'))

// ---- 微应用模式 ----
const contentMode = computed(() => (widgetData.value.props?.contentMode as string) ?? 'edit')
const microappName = computed(() => widgetData.value.props?.microappName as string ?? '')
const microappEntry = computed(() => widgetData.value.props?.microappEntry as string ?? '')

const microappContainerRef = ref<HTMLDivElement>()
let microAppInstance: MicroApp | null = null

async function loadMicroAppDynamic() {
  if (!microappName.value || !microappEntry.value || !microappContainerRef.value) return
  if (microAppInstance) {
    await microAppInstance.unmount()
    microAppInstance = null
  }
  microAppInstance = loadMicroApp(
    { name: microappName.value, entry: microappEntry.value, container: microappContainerRef.value },
    { sandbox: { experimentalStyleIsolation: true } },
  )
  microAppInstance.mount().catch(console.error)
}

watch([microappName, microappEntry, visible], () => {
  if (visible.value && contentMode.value === 'microapp') {
    // 弹窗打开且为微应用模式时加载
    setTimeout(() => loadMicroAppDynamic(), 50)
  }
})

onUnmounted(() => {
  microAppInstance?.unmount()
  microAppInstance = null
})

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
    // 微应用实例卸载
    if (contentMode.value === 'microapp' && microAppInstance) {
      microAppInstance.unmount()
      microAppInstance = null
    }
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
async function handleConfirm() {
  visible.value = false
  emit('confirm', { ...dialogModel })
  if (eventCtx) {
    await triggerWidgetEvent(widgetData.value, 'click', eventCtx, 'confirm')
  }
}

async function handleCancel() {
  visible.value = false
  emit('cancel')
  if (eventCtx) {
    await triggerWidgetEvent(widgetData.value, 'click', eventCtx, 'cancel')
  }
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
    <AppDialog
      v-model="visible"
      :title="(widgetData.props?.title as string) || '弹窗标题'"
      :width="(widgetData.props?.width as string) || '600px'"
      :draggable="widgetData.props?.draggable !== false"
      :show-fullscreen-btn="widgetData.props?.showFullscreenBtn !== false"
      :destroy-on-close="widgetData.props?.destroyOnClose !== false"
      :close-on-click-modal="widgetData.props?.closeOnClickModal === true"
    >
      <!-- 微应用模式 -->
      <div v-if="contentMode === 'microapp'" style="height: 100%; min-height: 200px;">
        <div v-if="!microappName || !microappEntry" style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--el-text-color-secondary);">
          请配置子应用名称和入口地址
        </div>
        <div v-else ref="microappContainerRef" style="height: 100%;" />
      </div>

      <!-- 编辑模式：渲染子 Schema -->
      <template v-else>
        <SchemaRender
          v-if="widgetData.children?.length"
          :widgets="widgetData.children"
        />
      </template>

      <template v-if="widgetData.props?.showFooter !== false" #footer>
        <div :class="styles.footer">
          <el-button @click="handleCancel">{{ (widgetData.props?.cancelText as string) || '取消' }}</el-button>
          <el-button type="primary" @click="handleConfirm">{{ (widgetData.props?.confirmText as string) || '确定' }}</el-button>
        </div>
      </template>
    </AppDialog>
  </template>
</template>
