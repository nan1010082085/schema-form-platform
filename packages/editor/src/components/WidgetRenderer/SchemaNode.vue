<script setup lang="ts">
/**
 * SchemaNode — 单个 Widget 渲染节点
 *
 * SchemaRender 的内部实现细节。每个 SchemaNode 实例
 * 独立调用 provide，确保 Vue provide 作用域正确隔离。
 *
 * 职责：
 * - provide 当前 Widget 的 data 和 style 给子组件
 * - 判断是否容器组件，渲染组件 + 递归 children
 * - 位置通过 position: absolute + left/top 定位
 *
 * 性能优化：
 * - 注入共享的 linkageStateMap（由 EditorCanvas/WidgetRenderer 提供），
 *   避免每个 SchemaNode 独立创建 useLinkage 实例
 * - 使用缓存的组件映射表
 */
import { computed, inject, provide, ref, onMounted, onUnmounted, type ComputedRef, type ComponentPublicInstance } from 'vue'
import { widgetDataKey, widgetStyleKey, widgetRenderStateKey, formContextKey } from '../../widgets/base/types'
import type { Widget, SchemaType, LinkageState } from '../../widgets/base/types'
import type { FormData, EventExecutionContext } from './types'
import { EVENT_CONTEXT_KEY, DIALOG_REGISTRY_KEY, FORM_GRID_LINKAGE_KEY } from './types'
import { getComponentMap } from '../../widgets/registry'
import { useWidgetStore } from '../../stores/widget'
import { useEditorStore } from '../../stores/editor'
import { triggerWidgetEvent } from '../../engine/eventEngine'
import { useLogger } from '../../composables/useLogger'
import SchemaRender from './SchemaRender.vue'
import AppDialog from '@schema-form/shared-components/common/AppDialog.vue'
import styles from './SchemaNode.module.scss'

const props = defineProps<{
  widget: Widget
  mode?: 'edit' | 'preview'
}>()

/** 组件映射表 — 缓存版本，避免每次 mount 创建新对象 */
const compMap = getComponentMap()

import { getAllContainerTypes } from '../../composables/useConstant'

/** 获取容器组件类型集合（动态） */
function getContainerTypes() {
  return getAllContainerTypes()
}

/**
 * 自渲染容器：组件内部自己渲染 children（通过 SchemaRender + inject），
 * SchemaNode 不需要再渲染 childrenLayer，否则子组件会重复出现。
 *
 * 所有容器统一由 childrenLayer（absolute 定位）渲染子组件，
 * 保证 overlay 坐标系与渲染坐标系一致。
 */
const SELF_RENDERING_CONTAINERS: ReadonlySet<SchemaType> = new Set([
  'single-col', 'double-col', 'triple-col', 'quad-col',
])

/**
 * 交互式容器：内部有可交互 UI（tab headers、dialog body），
 * 需要 pointer-events:auto 让点击穿透 hitArea 到达实际 UI。
 * 选中逻辑由 wrapper @click 处理，而非 hitArea。
 */
const INTERACTIVE_CONTAINER_TYPES: ReadonlySet<SchemaType> = new Set([
  'tabs', 'dialog',
])

// ---- 组件类型集合 ----

/** 表单类组件（支持 change 事件） */
const FORM_COMPONENT_TYPES: ReadonlySet<SchemaType> = new Set([
  'input', 'select', 'number', 'radio', 'checkbox',
  'date', 'textarea', 'richtext', 'upload',
  'date-time-slot', 'switch', 'slider', 'rate',
  'cascader', 'color-picker', 'time-picker',
])

/** 输入类组件（支持 focus/blur 事件） */
const INPUT_COMPONENT_TYPES: ReadonlySet<SchemaType> = new Set([
  'input', 'select', 'number', 'textarea', 'richtext',
])

/** 可点击组件（支持 click 事件） */
const CLICKABLE_TYPES: ReadonlySet<SchemaType> = new Set([
  'button', 'title', 'divider', 'spacer', 'banner',
])

const logger = useLogger('SchemaNode')

// ---- Provide/Inject ----

/** Provide 当前 Widget 数据给子组件 */
const widgetData = computed(() => props.widget)
provide(widgetDataKey, widgetData as ComputedRef<Widget>)

/** Provide 当前 Widget 样式配置 */
const widgetStyle = computed(() => props.widget.style ?? {})
provide(widgetStyleKey, widgetStyle as ComputedRef<Record<string, unknown>>)

// ---- 渲染逻辑 ----

/** 是否编辑模式 */
const isEditMode = computed(() => props.mode === 'edit')

/** 是否容器组件 */
const isContainer = computed(() =>
  getContainerTypes().has(props.widget.type),
)

/** 是否自渲染容器（内部已渲染 children，无需 childrenLayer） */
const isSelfRendering = computed(() =>
  SELF_RENDERING_CONTAINERS.has(props.widget.type),
)

/** 解析组件 */
const resolvedComponent = computed(() => compMap[props.widget.type])

// ---- Tabs activeKey 支持 ----

/** tabs 容器组件 ref，用于读取 activeKey */
const containerRef = ref<ComponentPublicInstance | null>(null)

/** 当前 tabs 容器的 activeKey（仅 tabs 容器有效） */
const activeTabKey = computed(() => {
  if (props.widget.type !== 'tabs') return null
  const instance = containerRef.value as Record<string, unknown> | null
  if (!instance) return null
  // activeKey is exposed via defineExpose on FgTabs
  return (instance as { activeKey?: { value?: string } })?.activeKey?.value ?? null
})

/** 过滤后的子部件列表：tabs 容器按 tabKey 过滤，其他容器全量 */
const filteredChildren = computed(() => {
  if (!props.widget.children?.length) return []
  if (props.widget.type !== 'tabs' || activeTabKey.value === null) return props.widget.children
  return props.widget.children.filter(c => (c as { tabKey?: string }).tabKey === activeTabKey.value)
})

// ---- 规则引擎 ----

const widgetStore = useWidgetStore()
const editorStore = useEditorStore()

/** 交互式容器空白区域点击 → 选中容器 */
function handleInteractiveContainerClick() {
  editorStore.select(props.widget.id)
}

// ---- 预览模式：弹窗注册 + 事件拦截 ----

/** 弹窗注册表（从 EditorCanvas 或 WidgetRenderer 注入） */
const dialogRegistry = inject(DIALOG_REGISTRY_KEY, null)

/** dialog 类型的可见性（预览模式下默认隐藏，通过事件打开） */
const dialogVisible = ref(false)

/** 注册/注销 dialog 到注册表 */
onMounted(() => {
  if (!isEditMode.value && props.widget.type === 'dialog' && props.widget.id && dialogRegistry) {
    dialogRegistry.set(props.widget.id, (visible: boolean) => { dialogVisible.value = visible })
  }
})
onUnmounted(() => {
  if (!isEditMode.value && props.widget.type === 'dialog' && props.widget.id && dialogRegistry) {
    dialogRegistry.delete(props.widget.id)
  }
})

/** 事件执行上下文（预览模式从 EditorCanvas/WidgetRenderer 注入） */
const eventCtx = inject(EVENT_CONTEXT_KEY, null)

/** 预览模式统一事件触发 */
async function handlePreviewEvent(trigger: string, _value?: unknown) {
  if (!eventCtx) return
  await triggerWidgetEvent(props.widget, trigger, eventCtx)
}

/** 构建编辑器模式的事件执行上下文（编辑器仅做配置验证，不实际执行复杂逻辑） */
function buildEditorEventContext(): EventExecutionContext {
  return {
    findWidget: (id: string) => widgetStore.findWidget(id) as Widget | undefined,
    updateWidget: (id: string, patch: Partial<Widget>) => widgetStore.updateWidget(id, patch),
    openDialog: (target: string) => editorStore.openDialogEditor(target),
    closeDialog: () => editorStore.closeDialogEditor(),
    submitForm: () => {
      const form = widgetStore.widgets.find((w: Widget) => w.type === 'form')
      if (form) logger.event('Form submit:', widgetStore.collectFormValues(form.id))
    },
    resetForm: () => {
      const form = widgetStore.widgets.find((w: Widget) => w.type === 'form')
      if (form?.children) {
        for (const child of form.children) {
          if (child.field) widgetStore.updateWidget(child.id, { defaultValue: child.defaultValue })
        }
      }
    },
    getFormData: () => formData.value,
    emit: (eventName: string, payload?: unknown) => logger.event('Emit:', eventName, payload),
    confirm: (message: string) => Promise.resolve(),
    variables: {},
    setVariable: () => {},
    getVariable: () => undefined,
    exposed: {},
    triggerEvent: () => {},
  }
}

/** 统一事件触发：由 SchemaNode 拦截并分发，部件无需自行调用 */
async function handleWidgetEvent(trigger: string, _value?: unknown) {
  logger.debug(`trigger=${trigger}`, props.widget.id)
  await triggerWidgetEvent(props.widget, trigger, buildEditorEventContext())
}

/**
 * 当前表单上下文的值集合（编辑模式仅用于事件引擎调试日志）。
 * 延迟计算：仅在事件触发时按需收集，避免每次渲染都 O(n) 遍历。
 */
const formData = computed<FormData>(() => {
  const formId = props.widget.formId
  if (!formId) return {}
  return widgetStore.collectFormValues(formId) as FormData
})

// formData 在编辑模式下仅供 buildEditorEventContext 使用，
// 通过 lazy computed 避免在 render 路径中触发

/**
 * 规则引擎输出：visible / disabled / required。
 *
 * 性能优化：从父级注入共享的 linkageStateMap（由 EditorCanvas 或 WidgetRenderer 提供），
 * 而非每个 SchemaNode 独立创建 useLinkage 实例。
 * widget.hidden / widget.disabled 作为静态属性覆盖（优先于联动状态）。
 */
const DEFAULT_LINKAGE_STATE: LinkageState = { visible: true, disabled: false, required: false }
const linkageStateMap = inject(FORM_GRID_LINKAGE_KEY, null)

const renderState = computed(() => {
  const field = props.widget.field
  const linkageState = field ? linkageStateMap?.value.get(field) : undefined
  const base = linkageState ?? DEFAULT_LINKAGE_STATE
  // hidden 静态属性覆盖：hidden=true 时强制不可见
  if (props.widget.hidden) {
    return { ...base, visible: false }
  }
  // disabled 属性覆盖（规则引擎动态设置）
  if (props.widget.disabled) {
    return { ...base, disabled: true }
  }
  return base
})

provide(widgetRenderStateKey, renderState)

// ---- 表单校验 ----

/** 注入表单上下文（仅在 FgForm 内部时有值） */
const formCtx = inject(formContextKey, null)

/** 当前 base 组件是否需要包裹 el-form-item（有 field + validationRules 且在表单内） */
const needsFormItem = computed(() => {
  if (!formCtx) return false
  if (!props.widget.field) return false
  return (props.widget.validationRules?.length ?? 0) > 0
})

/**
 * 位置样式：position: absolute + left/top（不用 transform）
 * 合并 widget.style 中的 CSS 属性（边框、圆角、内外边距、背景色、对齐等）
 */
const CSS_STYLE_KEYS: ReadonlySet<string> = new Set([
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft',
  'borderRadius', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius',
  'backgroundColor', 'boxShadow', 'opacity',
  'fontSize', 'fontWeight', 'color', 'textAlign',
])

const wrapperStyle = computed(() => {
  const pos = props.widget.position ?? { x: 0, y: 0, w: 240, h: 40 }
  const style: Record<string, string | number> = {
    position: 'absolute',
    left: `${pos.x}px`,
    top: `${pos.y}px`,
    width: `${pos.w}px`,
    height: `${pos.h}px`,
  }
  if (pos.zIndex !== undefined) {
    style.zIndex = pos.zIndex
  }
  // 合并 widget.style 中的 CSS 属性到 wrapper
  const ws = props.widget.style
  if (ws) {
    for (const key of CSS_STYLE_KEYS) {
      const val = (ws as Record<string, unknown>)[key]
      if (val !== undefined && val !== '') {
        style[key] = val as string | number
      }
    }
  }
  return style
})
</script>

<template>
  <!-- 规则引擎控制可见性 -->
  <template v-if="renderState.visible">
    <!-- Dialog 容器：编辑模式=shell+childrenLayer，预览模式=EnhancedDialog -->
    <template v-if="widget.type === 'dialog'">
      <!-- 编辑模式：容器 shell + 子部件层 -->
      <div
        v-if="isEditMode"
        :data-widget-id="widget.id"
        :class="[styles.nodeWrapper, styles.nodeWrapperEdit, styles.interactiveContainer]"
        :style="wrapperStyle"
        @click.stop="handleInteractiveContainerClick()"
      >
        <component
          v-if="resolvedComponent"
          :ref="(el: ComponentPublicInstance | null) => { containerRef = el }"
          :is="resolvedComponent"
          :widget="widget"
          :editable="true"
        />
        <div
          v-if="filteredChildren.length"
          :class="styles.childrenLayer"
        >
          <SchemaRender
            :widgets="filteredChildren"
            :mode="mode"
          />
        </div>
      </div>

      <!-- 预览模式：EnhancedDialog（默认隐藏，通过事件打开） -->
      <AppDialog
        v-else
        v-model="dialogVisible"
        :title="(widget.props?.title as string) || widget.label || '弹窗'"
        :width="(widget.props?.width as string) || '600px'"
        :draggable="widget.props?.draggable !== false"
        :show-fullscreen-btn="widget.props?.showFullscreenBtn !== false"
        :destroy-on-close="widget.props?.destroyOnClose !== false"
        :close-on-click-modal="widget.props?.closeOnClickModal === true"
      >
        <!-- 流式布局渲染子部件（与 WidgetNode 一致） -->
        <template v-if="filteredChildren.length">
          <SchemaRender
            v-for="(child, ci) in filteredChildren"
            :key="ci"
            :schema="child"
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
      </AppDialog>
    </template>

    <!-- 其他容器组件：容器渲染 + 独立子部件层 -->
    <div
      v-else-if="isContainer"
      :data-widget-id="widget.id"
      :class="[
        styles.nodeWrapper,
        {
          [styles.nodeWrapperEdit]: isEditMode,
          [styles.interactiveContainer]: INTERACTIVE_CONTAINER_TYPES.has(widget.type),
        },
      ]"
      :style="wrapperStyle"
      @click.stop="INTERACTIVE_CONTAINER_TYPES.has(widget.type) && handleInteractiveContainerClick()"
    >
      <!-- 容器组件自身渲染（卡片标题、表单包裹等） -->
      <component
        v-if="resolvedComponent"
        :ref="(el: ComponentPublicInstance | null) => { containerRef = el }"
        :is="resolvedComponent"
        :widget="widget"
        :editable="isEditMode"
      />
      <!-- 子部件层：绝对定位，相对于容器定位（自渲染容器跳过） -->
      <div
        v-if="filteredChildren.length && !isSelfRendering"
        :class="styles.childrenLayer"
      >
        <SchemaRender
          :widgets="filteredChildren"
          :mode="mode"
        />
      </div>
    </div>

    <!-- 基础组件：直接渲染 -->
    <!-- 编辑模式：SchemaNode 拦截所有 DOM 事件分发到事件引擎 -->
    <!-- 预览模式：change/focus/blur 仍由 wrapper 拦截（表单组件不自行触发），click 由组件自行处理（避免与 FgButton 内部 handler 重复） -->
    <div
      v-else
      :data-widget-id="widget.id"
      :class="[styles.nodeWrapper, { [styles.nodeWrapperEdit]: isEditMode }]"
      :style="wrapperStyle"
      @change="FORM_COMPONENT_TYPES.has(widget.type) && (isEditMode ? handleWidgetEvent('change', $event) : handlePreviewEvent('change', $event))"
      @focus="INPUT_COMPONENT_TYPES.has(widget.type) && (isEditMode ? handleWidgetEvent('focus') : handlePreviewEvent('focus'))"
      @blur="INPUT_COMPONENT_TYPES.has(widget.type) && (isEditMode ? handleWidgetEvent('blur') : handlePreviewEvent('blur'))"
      @click="isEditMode && CLICKABLE_TYPES.has(widget.type) && handleWidgetEvent('click')"
    >
      <!-- 表单校验：有 field + validationRules 时包裹 el-form-item -->
      <el-form-item
        v-if="needsFormItem"
        :label="widget.label"
        :prop="widget.field"
        :rules="widget.validationRules"
      >
        <component
          v-if="resolvedComponent"
          :is="resolvedComponent"
          :widget="widget"
        />
      </el-form-item>
      <component
        v-else-if="resolvedComponent"
        :is="resolvedComponent"
        :widget="widget"
      />
    </div>
  </template>
</template>
