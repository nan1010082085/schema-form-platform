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
 */
import { computed, inject, provide, ref, onMounted, onUnmounted, type ComputedRef, type ComponentPublicInstance } from 'vue'
import { widgetDataKey, widgetStyleKey, widgetRenderStateKey, formContextKey } from '../../widgets/base/types'
import type { Widget, SchemaType } from '../../widgets/base/types'
import type { PartialWidget, FormData } from './types'
import { EVENT_CONTEXT_KEY, DIALOG_REGISTRY_KEY } from './types'
import { getComponentMap } from '../../widgets/registry'
import { useWidgetStore } from '../../stores/widget'
import { useEditorStore } from '../../stores/editor'
import { useLinkage } from '../../composables/useLinkage'
import type { Ref } from 'vue'
import { triggerWidgetEvent, type EventExecutionContext } from '../../engine/eventEngine'
import { useLogger } from '../../composables/useLogger'
import SchemaRender from './SchemaRender.vue'
import EnhancedDialog from '../EnhancedDialog.vue'

const props = defineProps<{
  widget: Widget
  mode?: 'edit' | 'preview'
}>()

/** 组件映射表 — SchemaType → Vue Component（从 registry 动态获取） */
const compMap = getComponentMap()

/** 容器组件类型集合 */
const CONTAINER_TYPES: ReadonlySet<SchemaType> = new Set([
  'form', 'card', 'tabs', 'dialog',
  'single-col', 'double-col', 'triple-col', 'quad-col',
])

/**
 * 自渲染容器：组件内部自己渲染 children（通过 SchemaRender + inject），
 * SchemaNode 不需要再渲染 childrenLayer，否则子组件会重复出现。
 *
 * 所有容器统一由 childrenLayer（absolute 定位）渲染子组件，
 * 保证 overlay 坐标系与渲染坐标系一致。
 */
const SELF_RENDERING_CONTAINERS: ReadonlySet<SchemaType> = new Set()

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
  'date-time-slot',
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
  CONTAINER_TYPES.has(props.widget.type),
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

/** 构建编辑器模式的事件执行上下文 */
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
  }
}

/** 统一事件触发：由 SchemaNode 拦截并分发，部件无需自行调用 */
async function handleWidgetEvent(trigger: string, _value?: unknown) {
  logger.debug(`trigger=${trigger}`, props.widget.id)
  await triggerWidgetEvent(props.widget, trigger, buildEditorEventContext())
}

/**
 * 当前表单上下文的值集合。
 * 当任意 Widget 的 defaultValue 变化时自动重算。
 */
const formData = computed<FormData>(() => {
  const formId = props.widget.formId
  if (!formId) return {}
  return widgetStore.collectFormValues(formId) as FormData
})

/**
 * 规则引擎输出：visible / disabled / required。
 * SchemaNode 用此结果控制渲染条件，Widget 通过 inject 获取。
 *
 * 基于 useLinkage composable，按 field 查找联动状态。
 * widget.hidden 作为静态可见性覆盖（优先于联动状态）。
 */
const injectedVariables = inject<Ref<Record<string, unknown>>>('variablesContext', ref({}))
const injectedExposed = inject<Ref<Record<string, Record<string, unknown>>>>('exposedContext', ref({}))
const linkage = useLinkage(widgetStore.widgets as unknown as PartialWidget[], formData, injectedVariables, injectedExposed)
const renderState = computed(() => {
  const linkageState = linkage.stateMap.value.get(props.widget.field ?? '')
  const base = linkageState ?? { visible: true, disabled: false, required: false }
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
  const pos = props.widget.position
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
        :class="[$style.nodeWrapper, $style.nodeWrapperEdit, $style.interactiveContainer]"
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
          :class="$style.childrenLayer"
        >
          <SchemaRender
            :widgets="filteredChildren"
            :mode="mode"
          />
        </div>
      </div>

      <!-- 预览模式：EnhancedDialog（默认隐藏，通过事件打开） -->
      <EnhancedDialog
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
      </EnhancedDialog>
    </template>

    <!-- 其他容器组件：容器渲染 + 独立子部件层 -->
    <div
      v-else-if="isContainer"
      :data-widget-id="widget.id"
      :class="[
        $style.nodeWrapper,
        {
          [$style.nodeWrapperEdit]: isEditMode,
          [$style.interactiveContainer]: INTERACTIVE_CONTAINER_TYPES.has(widget.type),
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
        :class="$style.childrenLayer"
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
      :class="[$style.nodeWrapper, { [$style.nodeWrapperEdit]: isEditMode }]"
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

<style module>
.nodeWrapper {
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
  width: 100%;
  height: 100%;
}

/* 强制所有直接子元素（widget 根元素）填满容器 */
.nodeWrapper > * {
  width: 100% !important;
  height: 100% !important;
}

/* 容器内部子部件的渲染容器 */
.childrenLayer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.nodeWrapperEdit {
  outline: 1px dashed #c0c4cc;
  outline-offset: -1px;
}

/* 交互式容器：wrapper 作为 elementFromPoint 的回退目标，接收合成 click 事件 */
.interactiveContainer {
  pointer-events: auto;
}
</style>
