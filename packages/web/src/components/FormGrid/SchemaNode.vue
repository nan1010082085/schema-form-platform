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
import { computed, inject, provide, type ComputedRef } from 'vue'
import { widgetDataKey, widgetStyleKey, widgetRenderStateKey, formContextKey } from '../../widgets/base/types'
import type { Widget, SchemaType } from '../../widgets/base/types'
import { getComponentMap } from '../../widgets/registry'
import { useWidgetStore } from '../../stores/widget'
import { useEditorStore } from '../../stores/editor'
import { computeWidgetRenderState } from '../../engine/ruleEngine'
import SchemaRender from './SchemaRender.vue'

const props = defineProps<{
  widget: Widget
  mode?: 'edit' | 'preview'
}>()

/** 组件映射表 — SchemaType → Vue Component（从 registry 动态获取） */
const compMap = getComponentMap()

/** 容器组件类型集合 */
const CONTAINER_TYPES: ReadonlySet<SchemaType> = new Set([
  'form', 'card', 'row-col', 'tabs', 'dialog',
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

// ---- 规则引擎 ----

const widgetStore = useWidgetStore()
const editorStore = useEditorStore()

/** 交互式容器空白区域点击 → 选中容器 */
function handleInteractiveContainerClick() {
  editorStore.select(props.widget.id)
}

/**
 * 当前表单上下文的值集合。
 * 当任意 Widget 的 defaultValue 变化时自动重算。
 */
const formData = computed(() => {
  const formId = props.widget.formId
  if (!formId) return {}
  return widgetStore.collectFormValues(formId)
})

/**
 * 规则引擎输出：visible / disabled / required。
 * SchemaNode 用此结果控制渲染条件，Widget 通过 inject 获取。
 */
const renderState = computed(() =>
  computeWidgetRenderState(props.widget, formData.value),
)

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

/** 位置样式：position: absolute + left/top（不用 transform） */
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
  return style
})
</script>

<template>
  <!-- 规则引擎控制可见性 -->
  <template v-if="renderState.visible">
    <!-- 容器组件：容器渲染 + 独立子部件层 -->
    <div
      v-if="isContainer"
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
        :is="resolvedComponent"
        :widget="widget"
        :editable="isEditMode"
      />
      <!-- 子部件层：绝对定位，相对于容器定位（自渲染容器跳过） -->
      <div
        v-if="widget.children?.length && !isSelfRendering"
        :class="$style.childrenLayer"
      >
        <SchemaRender
          :widgets="widget.children"
          :mode="mode"
        />
      </div>
    </div>

    <!-- 基础组件：直接渲染 -->
    <div
      v-else
      :class="[$style.nodeWrapper, { [$style.nodeWrapperEdit]: isEditMode }]"
      :style="wrapperStyle"
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
