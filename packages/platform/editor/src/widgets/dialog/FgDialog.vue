<script setup lang="ts">
/**
 * FgDialog — 弹窗容器 Widget
 *
 * 职责：
 * - 编辑模式：渲染容器 shell（header），子组件由 SchemaNode childrenLayer 渲染
 * - 预览模式：el-dialog 包裹，提供弹窗交互
 * - 微应用模式：qiankun loadMicroApp 动态加载
 * - 支持 confirm/cancel/open/close 事件
 * - destroyOnClose 关闭时清空 dialogModel
 */
import { inject, ref, reactive, provide, watch, computed, onMounted, onUnmounted } from 'vue'
import { widgetDataKey, formContextKey } from '../base/types'
import { EVENT_CONTEXT_KEY } from '../../components/WidgetRenderer/types'
import { triggerWidgetEvent } from '../../engine/eventEngine'
import SchemaRender from '../../components/WidgetRenderer/SchemaRender.vue'
import { useWidgetLifecycle } from '@/composables/useWidgetLifecycle'
import AppDialog from '@schema-form/platform-shared/components/common/AppDialog.vue'
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

const visible = ref(false)
const dialogModel = reactive<Record<string, unknown>>({})
const childFormRef = ref<any>()
const { trigger } = useWidgetLifecycle(widgetData, dialogModel)

onMounted(() => trigger('onMount'))
onUnmounted(() => trigger('onUnmount'))

// ---- 微应用模式 ----
const contentMode = computed(() => (widgetData.value.props?.contentMode as string) ?? 'edit')
const microappName = computed(() => widgetData.value.props?.microappName as string ?? '')
const microappEntry = computed(() => widgetData.value.props?.microappEntry as string ?? '')
const microappRoute = computed(() => widgetData.value.props?.microappRoute as string ?? '')
const sandbox = computed(() => widgetData.value.props?.microappSandbox !== false)
const styleIsolation = computed(() => (widgetData.value.props?.microappStyleIsolation as string) ?? 'experimental')
const timeout = computed(() => (widgetData.value.props?.microappTimeout as number) ?? 10000)
const fallbackText = computed(() => (widgetData.value.props?.microappFallback as string) ?? '子应用加载失败')
const routeBase = computed(() => widgetData.value.props?.microappRouteBase as string ?? '')

const microappContainerRef = ref<HTMLDivElement>()
const microappLoading = ref(false)
const microappError = ref('')
let microAppInstance: MicroApp | null = null
let timeoutTimer: ReturnType<typeof setTimeout> | null = null

function getSandboxConfig() {
  if (!sandbox.value) return false
  switch (styleIsolation.value) {
    case 'strict': return { strictStyleIsolation: true }
    case 'none': return { sandbox: false }
    default: return {}
  }
}

async function loadMicroAppDynamic() {
  if (!microappName.value || !microappEntry.value || !microappContainerRef.value) return

  microappLoading.value = true
  microappError.value = ''

  if (microAppInstance) {
    await microAppInstance.unmount().catch(() => {})
    microAppInstance = null
  }

  if (timeoutTimer) clearTimeout(timeoutTimer)
  timeoutTimer = setTimeout(() => {
    if (microappLoading.value) {
      microappError.value = `加载超时（${timeout.value}ms）`
      microappLoading.value = false
    }
  }, timeout.value)

  try {
    const props: Record<string, unknown> = {}
    if (routeBase.value) props.base = routeBase.value
    if (microappRoute.value) props.route = microappRoute.value

    microAppInstance = loadMicroApp(
      { name: microappName.value, entry: microappEntry.value, container: microappContainerRef.value },
      { sandbox: getSandboxConfig(), props },
    )
    await microAppInstance.mount()
    microappLoading.value = false
  } catch {
    microappLoading.value = false
    microappError.value = fallbackText.value
  } finally {
    if (timeoutTimer) {
      clearTimeout(timeoutTimer)
      timeoutTimer = null
    }
  }
}

// 弹窗打开时加载微应用
watch(visible, (v) => {
  if (v && contentMode.value === 'microapp') {
    setTimeout(() => loadMicroAppDynamic(), 50)
  }
})

onUnmounted(() => {
  if (timeoutTimer) clearTimeout(timeoutTimer)
  microAppInstance?.unmount()
  microAppInstance = null
})

// ---- Provide form context ----
provide(formContextKey, {
  formRef: childFormRef,
  formModel: dialogModel,
  updateField: (field: string, value: unknown) => { dialogModel[field] = value },
})

// ---- destroyOnClose ----
watch(visible, (newVal) => {
  if (!newVal && widgetData.value.props?.destroyOnClose) {
    Object.keys(dialogModel).forEach(key => { dialogModel[key] = undefined })
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
  setDialogData: (data: Record<string, unknown>) => { Object.assign(dialogModel, data) },
})

async function handleConfirm() {
  visible.value = false
  emit('confirm', { ...dialogModel })
  if (eventCtx) await triggerWidgetEvent(widgetData.value, 'click', eventCtx, 'confirm')
}

async function handleCancel() {
  visible.value = false
  emit('cancel')
  if (eventCtx) await triggerWidgetEvent(widgetData.value, 'click', eventCtx, 'cancel')
}
</script>

<template>
  <!-- 编辑模式：容器 shell -->
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
        <div v-if="!microappName || !microappEntry" style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--el-text-color-secondary);">
          请配置子应用名称和入口地址
        </div>
        <div v-else-if="microappError" style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--el-color-danger);background:var(--el-color-danger-light-9);">
          {{ microappError }}
        </div>
        <div v-else ref="microappContainerRef" style="height: 100%;" />
      </div>

      <!-- 编辑模式：渲染子 Schema -->
      <SchemaRender v-else-if="widgetData.children?.length" :widgets="widgetData.children" />

      <template v-if="widgetData.props?.showFooter !== false" #footer>
        <div :class="styles.footer">
          <el-button @click="handleCancel">{{ (widgetData.props?.cancelText as string) || '取消' }}</el-button>
          <el-button type="primary" @click="handleConfirm">{{ (widgetData.props?.confirmText as string) || '确定' }}</el-button>
        </div>
      </template>
    </AppDialog>
  </template>
</template>
