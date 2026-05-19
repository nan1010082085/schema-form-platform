<script setup lang="ts">
import { computed, inject, nextTick, ref, watch } from 'vue'
import { compMap } from './compMap'
import { evaluateExpression } from '@/utils/expression'
import { useBreakpoint } from '@/composables/useBreakpoint'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import type {
  FormSchemaItem,
  FormData,
  FormFieldValue,
  LinkageState,
  SchemaRules,
} from './types'
import {
  ACTION_EMIT_KEY as ACTION_EMIT_INJECTION_KEY,
  FORM_GRID_LINKAGE_KEY,
  FORM_GRID_READONLY_KEY,
  isFullWidthType,
} from './types'

const props = defineProps<{
  schema: FormSchemaItem
  formData: FormData
  /** 编辑器模式：启用容器拖放区域（Sprint 11） */
  editable?: boolean
  /** 是否正在拖拽中（Sprint 11） */
  isDragging?: boolean
  /** 只读模式：禁用表单输入，隐藏内部按钮 */
  readonly?: boolean
  /** 当前节点在 schema 树中的路径（Sprint 11） */
  path?: number[]
}>()

const emit = defineEmits<{
  'container-drop': [payload: { parentPath: number[]; index: number; dragDataRaw: string }]
}>()

const emitAction = inject(ACTION_EMIT_INJECTION_KEY, undefined)
const linkageStateMap = inject(FORM_GRID_LINKAGE_KEY, undefined)
const injectedReadonly = inject(FORM_GRID_READONLY_KEY, undefined)
const effectiveReadonly = computed(() => props.readonly ?? injectedReadonly?.value ?? false)

// 响应式断点
const { resolveSpan } = useBreakpoint()

// 当前字段的联动状态
const linkageState = computed<LinkageState | undefined>(() => {
  const field = props.schema.field
  if (!field || !linkageStateMap) return undefined
  return linkageStateMap.value.get(field)
})

// ---- 表达式引擎：visibleOn / disabledOn / requiredOn ----

interface ExpressionState {
  visible: boolean | undefined
  disabled: boolean | undefined
  required: boolean | undefined
}

/** 求值表达式属性，错误时降级为 undefined（不阻塞渲染） */
const expressionState = computed<ExpressionState>(() => {
  const state: ExpressionState = {
    visible: undefined,
    disabled: undefined,
    required: undefined,
  }

  const ctx = { formData: props.formData }

  if (props.schema.visibleOn) {
    try {
      state.visible = evaluateExpression<boolean>(props.schema.visibleOn, ctx)
    } catch (err) {
      console.warn(`[SchemaRender] visibleOn 求值失败，降级为默认可见:`, err)
      state.visible = true // 降级：默认可见
    }
  }

  if (props.schema.disabledOn) {
    try {
      state.disabled = evaluateExpression<boolean>(props.schema.disabledOn, ctx)
    } catch (err) {
      console.warn(`[SchemaRender] disabledOn 求值失败，降级为默认不禁用:`, err)
      state.disabled = false // 降级：默认不禁用
    }
  }

  if (props.schema.requiredOn) {
    try {
      state.required = evaluateExpression<boolean>(props.schema.requiredOn, ctx)
    } catch (err) {
      console.warn(`[SchemaRender] requiredOn 求值失败，降级为默认非必填:`, err)
      state.required = false // 降级：默认非必填
    }
  }

  return state
})

// 优先级：hidden(硬隐藏) > visibleOn(表达式) > linkages(联动) > 默认可见
const isVisible = computed(() => {
  if (props.schema.hidden) return false
  if (expressionState.value.visible !== undefined) return expressionState.value.visible
  if (linkageState.value) return linkageState.value.visible
  return true
})

// 禁用：disabledOn 表达式优先，其次 linkages 联动
const isDisabled = computed(() => {
  if (expressionState.value.disabled !== undefined) return expressionState.value.disabled
  if (linkageState.value) return linkageState.value.disabled
  return false
})

// 联动后的选项覆盖
const effectiveOptions = computed(() => {
  if (linkageState.value?.options) return linkageState.value.options
  return props.schema.options
})

const effectiveApi = computed(() => {
  if (linkageState.value?.optionsApi) return linkageState.value.optionsApi
  return props.schema.api
})

// 校验规则：requiredOn 表达式优先，其次 linkages 联动
const effectiveRules = computed<SchemaRules | undefined>(() => {
  const isRequired = expressionState.value.required ?? linkageState.value?.required ?? false
  if (!isRequired) return props.schema.rules
  const baseRules = props.schema.rules ? [...props.schema.rules] : []
  // 如果已有 required 规则则不重复添加
  const hasRequired = baseRules.some((r) => r.required === true)
  if (!hasRequired) {
    baseRules.unshift({ required: true, message: `请填写${props.schema.label ?? ''}`, trigger: 'blur' })
  }
  return baseRules
})

const isLayoutRow = computed(() => props.schema.type === 'grid-row')
const isLayoutCol = computed(() => props.schema.type === 'grid-col')
const LAYOUT_TYPES = new Set(['page', 'toolbar', 'card', 'title', 'divider', 'spacer', 'steps', 'tabs', 'dialog'])
const isLayoutComponent = computed(() => LAYOUT_TYPES.has(props.schema.type))
const isComponent = computed(() => !isLayoutRow.value && !isLayoutCol.value && !isLayoutComponent.value)

const comp = computed(() => compMap[props.schema.type])

const colSpan = computed(() => {
  const s = props.schema
  if (s.colspan) return s.colspan
  // 全宽组件强制占满整行（响应式断点仍生效：如果用户显式指定了响应式 span 则尊重配置）
  if (isFullWidthType(s.type) && s.span === undefined) return 24
  // span 支持响应式对象或数字
  if (s.span !== undefined) return resolveSpan(s.span)
  return 24
})

const colStyle = computed(() => {
  const s = props.schema
  const style: Record<string, string> = {}
  style.width = s.width ?? `calc(${colSpan.value} / 24 * 100%)`
  style.flex = `0 0 calc(${colSpan.value} / 24 * 100%)`
  if (s.height) style.height = s.height
  if (s.hideBorder) {
    for (const dir of s.hideBorder) {
      style[`border-${dir}`] = 'none'
    }
  }
  return style
})

const colClass = computed(() => {
  const cls: string[] = ['fg-grid-col']
  if (props.schema.border === false) cls.push('no-border')
  return cls
})

// 单元格对齐方式
const cellAlignClass = computed(() => {
  const align = props.schema.align
  if (!align) return 'fg-cell--left'
  return `fg-cell--${align}`
})

// 是否为纯标签单元格（无 children）
const isLabelOnly = computed(() => {
  return props.schema.label && (!props.schema.children || props.schema.children.length === 0)
})

// 组件节点的对齐样式（非 grid-col 路径时，通过 text-align 生效）
const componentAlignStyle = computed(() => {
  const align = props.schema.align
  if (!align) return {}
  return { textAlign: align }
})

// ---- Editor: Container drag-and-drop (Sprint 11) ----
import { EDITABLE_CONTAINER_TYPES } from '@/composables/useConstant'
const isContainerType = computed(() => EDITABLE_CONTAINER_TYPES.has(props.schema.type))
const isHovered = ref(false)
const localDragActive = ref(false)

/** 当前节点路径字符串，供 ErrorBoundary 日志使用 */
const nodePathStr = computed(() => props.path?.join(',') ?? '')

// Reset hover state when drag ends
watch(() => props.isDragging, (dragging) => {
  if (!dragging) {
    isHovered.value = false
    localDragActive.value = false
  }
})

function onContainerDragOver(event: DragEvent) {
  event.preventDefault()
  event.dataTransfer!.dropEffect = 'copy'
  isHovered.value = true
}

function onContainerDragEnter(event: DragEvent) {
  event.preventDefault()
  localDragActive.value = true
}

function onContainerDragLeave(event: DragEvent) {
  const related = event.relatedTarget as HTMLElement | null
  const current = event.currentTarget as HTMLElement
  if (related && current.contains(related)) return
  isHovered.value = false
  localDragActive.value = false
}

function onContainerDrop(event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()
  isHovered.value = false
  localDragActive.value = false
  const raw = event.dataTransfer?.getData('application/schema-drag')
  if (raw) {
    emit('container-drop', {
      parentPath: props.path ?? [],
      index: props.schema.children?.length ?? 0,
      dragDataRaw: raw,
    })
    return
  }
  // Fallback: palette drag only sets 'schema-type'
  const schemaType = event.dataTransfer?.getData('schema-type')
  if (schemaType) {
    emit('container-drop', {
      parentPath: props.path ?? [],
      index: props.schema.children?.length ?? 0,
      dragDataRaw: JSON.stringify({ source: 'panel', type: schemaType }),
    })
  }
}

function getFieldValue(): FormFieldValue {
  const field = props.schema.field
  if (!field) return undefined
  return props.formData[field]
}

function setFieldValue(val: FormFieldValue) {
  const field = props.schema.field
  if (field) {
    props.formData[field] = val
  }
}

// Apply elseValue / targetValue from linkage state (deferred to avoid render-cycle writes)
let applyingLinkageValue = false
watch(
  () => linkageState.value?.elseValue ?? linkageState.value?.targetValue,
  (newVal) => {
    if (applyingLinkageValue) return
    if (newVal !== undefined && newVal !== props.formData[props.schema.field ?? '']) {
      applyingLinkageValue = true
      nextTick(() => {
        const field = props.schema.field
        if (field && newVal !== props.formData[field]) {
          props.formData[field] = newVal
        }
        applyingLinkageValue = false
      })
    }
  },
)
</script>

<template>
  <!-- 联动不可见：不渲染 DOM -->
  <template v-if="!isVisible" />

  <!-- 布局节点：行 -->
  <div
    v-else-if="isLayoutRow"
    class="fg-grid-row"
    :class="{ 'fg-grid-row--drop': editable && isContainerType }"
    @dragover.prevent="editable && isContainerType ? onContainerDragOver($event) : undefined"
    @dragleave="editable && isContainerType ? onContainerDragLeave($event) : undefined"
    @drop.prevent.stop="editable && isContainerType ? onContainerDrop($event) : undefined"
  >
    <template v-for="(child, idx) in schema.children" :key="idx">
      <ErrorBoundary
        v-if="!child.hidden"
        :node-type="child.type"
        :node-field="child.field"
        :node-path="[...(path ?? []), idx].join(',')"
      >
        <SchemaRender
          :schema="child"
          :form-data="formData"
          :editable="editable"
          :is-dragging="isDragging"
          :readonly="effectiveReadonly"
          :path="[...(path ?? []), idx]"
          @container-drop="emit('container-drop', $event)"
        />
      </ErrorBoundary>
    </template>
  </div>

  <!-- 布局节点：单元格 -->
  <div
    v-else-if="isLayoutCol"
    :class="[...colClass, { 'fg-grid-col--drop': editable && isContainerType }]"
    :style="colStyle"
    @dragover.prevent="editable && isContainerType ? onContainerDragOver($event) : undefined"
    @dragleave="editable && isContainerType ? onContainerDragLeave($event) : undefined"
    @drop.prevent.stop="editable && isContainerType ? onContainerDrop($event) : undefined"
  >
    <!-- 纯标签单元格 -->
    <div v-if="isLabelOnly" class="fg-cell--label-only" :class="cellAlignClass">
      {{ schema.label }}
    </div>

    <!-- 标签 + 内容单元格 -->
    <div v-else class="fg-cell" :class="cellAlignClass">
      <span v-if="schema.label" class="fg-cell-label">{{ schema.label }}</span>
      <div class="fg-cell-content">
        <template v-for="(child, idx) in schema.children" :key="idx">
          <ErrorBoundary
            v-if="!child.hidden"
            :node-type="child.type"
            :node-field="child.field"
            :node-path="[...(path ?? []), idx].join(',')"
          >
            <SchemaRender
              :schema="child"
              :form-data="formData"
              :editable="editable"
              :is-dragging="isDragging"
              :readonly="effectiveReadonly"
              :path="[...(path ?? []), idx]"
              @container-drop="emit('container-drop', $event)"
            />
          </ErrorBoundary>
        </template>
      </div>
    </div>
  </div>

  <!-- 布局组件：page / toolbar / card / title / divider / spacer / steps / tabs / dialog -->
  <template v-else-if="isLayoutComponent">
    <!-- steps/tabs 组件：children 作为 prop 传入，带拖放区域 -->
    <div
      v-if="schema.type === 'steps' || schema.type === 'tabs'"
      class="fg-container-edit-wrap"
      @dragenter.prevent="onContainerDragEnter"
      @dragover.prevent="onContainerDragOver"
      @dragleave="onContainerDragLeave"
      @drop.prevent.stop="onContainerDrop"
    >
      <ErrorBoundary
        :node-type="schema.type"
        :node-field="schema.field"
        :node-path="nodePathStr"
      >
        <component
          :is="comp"
          v-bind="schema.props || {}"
          :children="schema.children"
          :form-data="formData"
          :editable="editable"
          :is-dragging="isDragging"
          :path="path"
          @container-drop="emit('container-drop', $event)"
        />
      </ErrorBoundary>
      <div
        class="fg-container-drop-zone"
        :class="{
          'fg-container-drop-zone--active': localDragActive || isDragging,
          'fg-container-drop-zone--hover': isHovered,
        }"
      >
        <span class="fg-container-drop-zone__text">Drop here to add inside</span>
      </div>
    </div>
    <!-- 弹窗组件：edit 模式显示预览卡，preview/runtime 正常渲染 -->
    <template v-else-if="schema.type === 'dialog'">
      <ErrorBoundary
        :node-type="schema.type"
        :node-field="schema.field"
        :node-path="nodePathStr"
      >
        <component
          :is="comp"
          :model-value="false"
          :title="schema.props?.title ?? schema.label ?? 'Dialog'"
          :width="schema.props?.width"
          :dialog-schema="schema.props?.dialogSchema"
          :component-id="schema.componentId"
          :editable="editable"
          :is-dragging="isDragging"
          :path="path"
          :children="schema.children"
          @container-drop="emit('container-drop', $event)"
        >
          <template v-if="schema.children?.length" #default>
            <template v-for="(child, ci) in schema.children" :key="ci">
              <ErrorBoundary
                v-if="!child.hidden"
                :node-type="child.type"
                :node-field="child.field"
                :node-path="[...(path ?? []), ci].join(',')"
              >
                <SchemaRender
                  :schema="child"
                  :form-data="formData"
                  :editable="editable"
                  :is-dragging="isDragging"
                  :readonly="effectiveReadonly"
                  :path="[...(path ?? []), ci]"
                  @container-drop="emit('container-drop', $event)"
                />
              </ErrorBoundary>
            </template>
          </template>
        </component>
      </ErrorBoundary>
    </template>
    <!-- 可编辑容器 (card/page/toolbar)：添加拖放区域 (Sprint 11) -->
    <div
      v-else-if="editable && isContainerType"
      class="fg-container-edit-wrap"
      @dragenter.prevent="onContainerDragEnter"
      @dragover.prevent="onContainerDragOver"
      @dragleave="onContainerDragLeave"
      @drop.prevent.stop="onContainerDrop"
    >
      <ErrorBoundary
        :node-type="schema.type"
        :node-field="schema.field"
        :node-path="nodePathStr"
      >
        <component
          :is="comp"
          v-bind="schema.props || {}"
          :label="schema.props?.label ?? schema.label"
        >
          <template v-if="schema.children?.length" #default>
            <template v-for="(child, ci) in schema.children" :key="ci">
              <ErrorBoundary
                v-if="!child.hidden"
                :node-type="child.type"
                :node-field="child.field"
                :node-path="[...(path ?? []), ci].join(',')"
              >
                <SchemaRender
                  :schema="child"
                  :form-data="formData"
                  :editable="editable"
                  :is-dragging="isDragging"
                  :readonly="effectiveReadonly"
                  :path="[...(path ?? []), ci]"
                  @container-drop="emit('container-drop', $event)"
                />
              </ErrorBoundary>
            </template>
          </template>
        </component>
      </ErrorBoundary>
      <div
        class="fg-container-drop-zone"
        :class="{
          'fg-container-drop-zone--active': localDragActive || isDragging,
          'fg-container-drop-zone--hover': isHovered,
        }"
      >
        <span class="fg-container-drop-zone__text">Drop here to add inside</span>
      </div>
    </div>
    <!-- 其他布局组件：children 通过 slot 递归渲染 -->
    <ErrorBoundary
      v-else
      :node-type="schema.type"
      :node-field="schema.field"
      :node-path="nodePathStr"
    >
      <component
        :is="comp"
        v-bind="schema.props || {}"
        :label="schema.props?.label ?? schema.label"
      >
        <template v-if="schema.children?.length" #default>
          <template v-for="(child, ci) in schema.children" :key="ci">
            <ErrorBoundary
              v-if="!child.hidden"
              :node-type="child.type"
              :node-field="child.field"
              :node-path="[...(path ?? []), ci].join(',')"
            >
              <SchemaRender
                :schema="child"
                :form-data="formData"
                :editable="editable"
                :is-dragging="isDragging"
                :readonly="effectiveReadonly"
                :path="[...(path ?? []), ci]"
                @container-drop="emit('container-drop', $event)"
              />
            </ErrorBoundary>
          </template>
        </template>
      </component>
    </ErrorBoundary>
  </template>

  <!-- 组件节点 -->
  <div v-else-if="isComponent" class="fg-component" :style="componentAlignStyle">
    <ErrorBoundary
      :node-type="schema.type"
      :node-field="schema.field"
      :node-path="nodePathStr"
    >
      <!-- 日期范围：直接传 formData -->
      <component
        v-if="schema.type === 'date-range'"
        :is="comp"
        :form-data="formData"
        :schema="schema"
        :disabled="isDisabled || effectiveReadonly"
      />
      <!-- 按钮列表：不包裹 el-form-item；只读模式隐藏 -->
      <component
        v-else-if="schema.type === 'button-list' && !effectiveReadonly"
        :is="comp"
        :buttons="schema.buttons"
      />
      <!-- 工具栏按钮：居中对齐，不包裹 el-form-item；只读模式隐藏 -->
      <component
        v-else-if="schema.type === 'toolbar-buttons' && !effectiveReadonly"
        :is="comp"
        :buttons="schema.buttons"
        :background="schema.props?.background"
      />
      <!-- 表格：不包裹 el-form-item；有 field 时使用 v-model 双向绑定 -->
      <component
        v-else-if="schema.type === 'table'"
        :is="comp"
        :model-value="schema.field ? (formData[schema.field] as any[] ?? []) : undefined"
        :column-schema="schema.props?.columnSchema"
        :add-default="schema.props?.addDefault"
        :show-actions="schema.props?.showActions"
        :actions="schema.props?.actions"
        v-bind="schema.props"
        @update:model-value="schema.field ? setFieldValue($event) : undefined"
      />
      <!-- 可编辑表格：独占一行，不包裹 el-form-item -->
      <component
        v-else-if="schema.type === 'editable-table'"
        :is="comp"
        :model-value="schema.field ? (formData[schema.field] as Record<string, unknown>[] ?? []) : []"
        :schema="schema"
        @update:model-value="schema.field ? setFieldValue($event) : undefined"
      />
      <!-- 文件列表：不包裹 el-form-item -->
      <component
        v-else-if="schema.type === 'file-list'"
        :is="comp"
        v-bind="schema.props"
      />
      <!-- 人员选择：不包裹 el-form-item -->
      <component
        v-else-if="schema.type === 'person-select'"
        :is="comp"
        v-bind="schema.props"
      />
      <!-- 搜索列表：自包含列表页面，不包裹 el-form-item -->
      <component
        v-else-if="schema.type === 'search-list'"
        :is="comp"
        :schema="schema"
        @action="(payload: unknown) => emitAction?.('action', payload)"
      />
      <!-- 普通组件：单字段 v-model -->
      <el-form-item
        v-else-if="schema.field"
        :prop="schema.field"
        :rules="effectiveRules"
        :label="schema.label ?? ''"
        style="width: 100%; margin-bottom: 0"
      >
        <component
          :is="comp"
          :model-value="getFieldValue()"
          :placeholder="schema.props?.placeholder"
          :disabled="isDisabled || schema.props?.disabled || effectiveReadonly"
          :readonly="schema.props?.readonly"
          :options="effectiveOptions"
          :api="effectiveApi"
          v-bind="schema.props"
          @update:model-value="setFieldValue"
        />
      </el-form-item>
    </ErrorBoundary>
  </div>
</template>

<style scoped lang="scss">
.fg-container-edit-wrap {
  position: relative;
}

.fg-container-drop-zone {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 100;
  border: 2px dashed transparent;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &--active {
    pointer-events: auto;
  }

  &--hover {
    border-color: #409eff;
    background: rgba(64, 158, 255, 0.08);

    .fg-container-drop-zone__text {
      opacity: 1;
    }
  }

  &__text {
    font-size: 13px;
    color: #409eff;
    font-weight: 500;
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
    text-shadow: 0 0 4px #fff;
  }
}
</style>
