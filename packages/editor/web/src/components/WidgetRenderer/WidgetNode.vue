<script setup lang="ts">
/**
 * WidgetNode — 单个 Widget 流式渲染节点
 *
 * 与 SchemaNode（绝对定位，编辑器画布）不同，
 * WidgetNode 使用流式布局，用于 WidgetRenderer（预览/发布/运行时）。
 *
 * 职责：
 * - 从 registry 解析组件并渲染
 * - 容器组件递归渲染 children
 * - 有 field + validationRules 时包裹 el-form-item
 * - dialog 容器渲染为 EnhancedDialog（默认打开）
 * - 拦截 DOM 事件并路由到事件引擎
 * - 注入联动状态控制 visible/disabled/required
 */
import { computed, inject, provide, ref, onMounted, onUnmounted } from 'vue'
import type { ComputedRef, ComponentPublicInstance } from 'vue'
import type { Widget, PartialWidget, LinkageState } from '../../widgets/base/types'
import type { FormData } from './types'
import { widgetDataKey, widgetStyleKey, widgetRenderStateKey, formContextKey } from '../../widgets/base/types'
import { EVENT_CONTEXT_KEY, FORM_GRID_LINKAGE_KEY, DIALOG_REGISTRY_KEY } from './types'
import { getComponentMap } from '../../widgets/registry'
import { triggerWidgetEvent } from '../../engine/eventEngine'
import SchemaRender from './SchemaRender.vue'
import EnhancedDialog from '../EnhancedDialog.vue'

const props = defineProps<{
  widget: PartialWidget
  formData?: FormData
  readonly?: boolean
}>()

const compMap = getComponentMap()

const CONTAINER_TYPES: ReadonlySet<string> = new Set([
  'form', 'card', 'tabs', 'dialog',
  'single-col', 'double-col', 'triple-col', 'quad-col',
])

/** 表单类组件（支持 change 事件） */
const FORM_COMPONENT_TYPES: ReadonlySet<string> = new Set([
  'input', 'select', 'number', 'radio', 'checkbox',
  'date', 'textarea', 'richtext', 'upload',
  'date-time-slot', 'time-picker', 'cascader', 'switch',
])

/** 输入类组件（支持 focus/blur 事件） */
const INPUT_COMPONENT_TYPES: ReadonlySet<string> = new Set([
  'input', 'select', 'number', 'textarea', 'richtext',
])

/** 可点击组件（支持 click 事件） */
const CLICKABLE_TYPES: ReadonlySet<string> = new Set([
  'button', 'toolbar-buttons', 'title', 'divider', 'spacer', 'banner',
])

const isContainer = computed(() => CONTAINER_TYPES.has(props.widget.type))
const resolvedComponent = computed(() => compMap[props.widget.type])

// ---- Provide widget data to children ----
const widgetData = computed(() => props.widget)
provide(widgetDataKey, widgetData as ComputedRef<Widget>)
provide(widgetStyleKey, computed(() => props.widget.style ?? {}))

// ---- Dialog state (hidden by default, opened via event action) ----
const dialogVisible = ref(false)

// Register dialog with registry so eventContext.openDialog(target) can open it
const dialogRegistry = inject(DIALOG_REGISTRY_KEY, null)
onMounted(() => {
  if (props.widget.type === 'dialog' && props.widget.id && dialogRegistry) {
    dialogRegistry.set(props.widget.id, (visible: boolean) => { dialogVisible.value = visible })
  }
})
onUnmounted(() => {
  if (props.widget.type === 'dialog' && props.widget.id && dialogRegistry) {
    dialogRegistry.delete(props.widget.id)
  }
})

// ---- Container ref (for tabs activeKey etc.) ----
const containerRef = ref<ComponentPublicInstance | null>(null)

// ---- Form context injection ----
const formCtx = inject(formContextKey, null)

const needsFormItem = computed(() => {
  if (!formCtx) return false
  if (!props.widget.field) return false
  return (props.widget.validationRules?.length ?? 0) > 0
})

// ---- 联动状态 ----
const linkageStateMap = inject(FORM_GRID_LINKAGE_KEY, null)

const DEFAULT_LINKAGE_STATE: LinkageState = { visible: true, disabled: false, required: false }

const renderState = computed(() => {
  const field = props.widget.field
  const linkageState = field ? linkageStateMap?.value.get(field) : undefined
  const base = linkageState ?? DEFAULT_LINKAGE_STATE
  // hidden 静态属性覆盖：hidden=true 时强制不可见
  if (props.widget.hidden) {
    return { ...base, visible: false }
  }
  return base
})

provide(widgetRenderStateKey, renderState)

// ---- 事件拦截 ----
const eventCtx = inject(EVENT_CONTEXT_KEY, null)

async function handleWidgetEvent(trigger: string, _value?: unknown) {
  if (!eventCtx) return
  await triggerWidgetEvent(props.widget as Widget, trigger, eventCtx)
}
</script>

<template>
  <!-- 联动 + hidden 控制可见性 -->
  <template v-if="renderState.visible">

    <!-- Dialog container: render as EnhancedDialog (default open) -->
    <EnhancedDialog
      v-if="widget.type === 'dialog'"
      v-model="dialogVisible"
      :title="(widget.props?.title as string) || widget.label || '弹窗'"
      :width="(widget.props?.width as string) || '600px'"
      :draggable="widget.props?.draggable !== false"
      :show-fullscreen-btn="widget.props?.showFullscreenBtn !== false"
      :destroy-on-close="widget.props?.destroyOnClose !== false"
      :close-on-click-modal="widget.props?.closeOnClickModal === true"
    >
      <template v-if="widget.children?.length">
        <SchemaRender
          v-for="(child, ci) in widget.children"
          :key="ci"
          :schema="child"
          :form-data="formData"
          :readonly="readonly"
        />
      </template>
      <template v-if="widget.props?.showFooter !== false" #footer>
        <el-button @click="dialogVisible = false">
          {{ (widget.props?.cancelText as string) || '取消' }}
        </el-button>
        <el-button type="primary" @click="dialogVisible = false">
          {{ (widget.props?.confirmText as string) || '确定' }}
        </el-button>
      </template>
    </EnhancedDialog>

    <!-- Container (non-dialog): component + recursive children -->
    <component
      v-else-if="isContainer && resolvedComponent"
      :ref="(el: ComponentPublicInstance | null) => { containerRef = el }"
      :is="resolvedComponent"
      :widget="widget"
      :editable="false"
    >
      <template v-if="widget.children?.length">
        <SchemaRender
          v-for="(child, ci) in widget.children"
          :key="ci"
          :schema="child"
          :form-data="formData"
          :readonly="readonly"
        />
      </template>
    </component>

    <!-- Non-container with event interception + form-item wrapping -->
    <el-form-item
      v-else-if="needsFormItem"
      :label="widget.label"
      :prop="widget.field"
      :rules="widget.validationRules"
      @change="FORM_COMPONENT_TYPES.has(widget.type) && handleWidgetEvent('change', $event)"
      @focus="INPUT_COMPONENT_TYPES.has(widget.type) && handleWidgetEvent('focus')"
      @blur="INPUT_COMPONENT_TYPES.has(widget.type) && handleWidgetEvent('blur')"
      @click="CLICKABLE_TYPES.has(widget.type) && handleWidgetEvent('click')"
    >
      <component
        v-if="resolvedComponent"
        :is="resolvedComponent"
        :widget="widget"
      />
    </el-form-item>

    <!-- Non-container basic component with event interception -->
    <div
      v-else-if="resolvedComponent"
      @change="FORM_COMPONENT_TYPES.has(widget.type) && handleWidgetEvent('change', $event)"
      @focus.capture="INPUT_COMPONENT_TYPES.has(widget.type) && handleWidgetEvent('focus')"
      @blur.capture="INPUT_COMPONENT_TYPES.has(widget.type) && handleWidgetEvent('blur')"
      @click="CLICKABLE_TYPES.has(widget.type) && handleWidgetEvent('click')"
    >
      <component
        :is="resolvedComponent"
        :widget="widget"
      />
    </div>
  </template>
</template>
