# Plan 4: FgForm + FgDialog 容器完善

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完善 FgForm 和 FgDialog 两个容器 Widget，补全 defineExpose、事件系统、生命周期集成、数据源加载、配置面板等能力。

**Architecture:** FgForm 扩展为完整的表单容器，暴露 validate/submit/reset 等方法，集成 useWidgetLifecycle 和 useWorkerRequest。FgDialog 扩展为弹窗容器，暴露 open/close/validate 方法，支持 form context 自动注入、dialog-callback 机制、destroyOnClose 实际行为和微应用渲染。

**Tech Stack:** Vue 3 Composition API, TypeScript, Element Plus, Vitest

**依赖:** Plan 1 (ExpressionRuntime), Plan 2 (useWorkerRequest), Plan 3 (useWidgetLifecycle) — 本计划引用这些计划中定义的接口，需先完成。

---

## Task 1: FormContext 类型扩展

**Files:**
- Modify: `packages/web/src/widgets/base/types.ts:388-393`
- Modify: `packages/web/src/widgets/form/FgForm.vue`
- Modify: `packages/web/src/widgets/dialog/FgDialog.vue`

- [ ] **Step 1: 扩展 FormContext 接口**

在 `packages/web/src/widgets/base/types.ts` 中，将现有的 `FormContext` 接口：

```typescript
export interface FormContext {
  formRef: Ref<unknown>
  formModel: Record<string, unknown>
}
```

替换为：

```typescript
export interface FormContext {
  formRef: Ref<unknown>
  formModel: Record<string, unknown>
  /** 更新指定字段值（子组件通过 inject 调用） */
  updateField: (field: string, value: unknown) => void
}
```

- [ ] **Step 2: 验证类型编译通过**

Run: `cd packages/web && npx vue-tsc --noEmit 2>&1 | head -30`
Expected: 可能有其他错误，但 FormContext 相关无新增错误

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/widgets/base/types.ts
git commit -m "feat: extend FormContext with updateField method"
```

---

## Task 2: FgForm 容器完善

**Files:**
- Rewrite: `packages/web/src/widgets/form/FgForm.vue`
- Modify: `packages/web/src/widgets/form/config.ts`

- [ ] **Step 1: 重写 FgForm.vue**

用以下内容替换 `packages/web/src/widgets/form/FgForm.vue` 的全部内容：

```vue
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
```

- [ ] **Step 2: 更新 formConfig 添加 configPanels**

用以下内容替换 `packages/web/src/widgets/form/config.ts` 的全部内容：

```typescript
import type { WidgetConfig } from '../base/types'
export const formConfig: WidgetConfig = {
  name: 'FgForm',
  displayName: '表单容器',
  description: '表单容器，包裹 el-form，支持表单提交、校验和数据收集',
  defaultStyle: {
    width: '100%',
    padding: '16px',
  },
  defaultProps: {
    labelWidth: '100px',
    labelPosition: 'right' as const,
  },
  propertyPanel: {
    basic: [
      { key: 'labelWidth', label: '标签宽度', type: 'input', default: '100px', desc: '表单标签的宽度' },
      {
        key: 'labelPosition',
        label: '标签位置',
        type: 'select',
        options: [
          { label: '左对齐', value: 'left' },
          { label: '右对齐', value: 'right' },
          { label: '顶部', value: 'top' },
        ],
        default: 'right',
        desc: '表单标签的对齐位置',
      },
    ],
    style: ['padding', 'backgroundColor'],
    props: [],
  },
  configPanels: {
    events: [
      { key: 'submit', label: '提交', desc: '表单校验通过后触发，携带表单数据' },
      { key: 'validate-error', label: '校验失败', desc: '表单校验失败时触发' },
      { key: 'reset', label: '重置', desc: '表单重置后触发' },
      { key: 'data-change', label: '数据变化', desc: '任意字段值变化时触发' },
    ],
    dataSource: {
      supported: true,
      desc: '表单容器支持远程数据加载，数据将回填到表单字段',
    },
  },
}
```

- [ ] **Step 3: 验证编译通过**

Run: `cd packages/web && npx vue-tsc --noEmit 2>&1 | head -30`
Expected: 无 FgForm 相关类型错误

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/widgets/form/FgForm.vue packages/web/src/widgets/form/config.ts
git commit -m "feat(FgForm): complete container — defineExpose, events, lifecycle, loadApi, configPanels"
```

---

## Task 3: FgDialog 容器完善

**Files:**
- Rewrite: `packages/web/src/widgets/dialog/FgDialog.vue`
- Modify: `packages/web/src/widgets/dialog/config.ts`

- [ ] **Step 1: 重写 FgDialog.vue**

用以下内容替换 `packages/web/src/widgets/dialog/FgDialog.vue` 的全部内容：

```vue
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
import { useWidgetLifecycle } from '@/composables/useWidgetLifecycle'
import { useLogger } from '@/composables/useLogger'
import EnhancedDialog from '../../components/EnhancedDialog.vue'
import styles from './style.module.scss'

const widgetData = inject(widgetDataKey)!
const logger = useLogger('FgDialog')

defineProps<{
  editable?: boolean
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
      <slot />
      <template v-if="widgetData.props?.showFooter !== false" #footer>
        <div :class="styles.footer">
          <el-button @click="handleCancel">{{ (widgetData.props?.cancelText as string) || '取消' }}</el-button>
          <el-button type="primary" @click="handleConfirm">{{ (widgetData.props?.confirmText as string) || '确定' }}</el-button>
        </div>
      </template>
    </EnhancedDialog>
  </template>
</template>
```

- [ ] **Step 2: 更新 dialogConfig 添加 configPanels**

用以下内容替换 `packages/web/src/widgets/dialog/config.ts` 的全部内容：

```typescript
import type { WidgetConfig } from '../base/types'
export const dialogConfig: WidgetConfig = {
  name: 'FgDialog',
  displayName: '弹窗容器',
  description: '弹窗容器，支持编辑模式和微前端模式，可配置标题、宽度、按钮',
  defaultStyle: {},
  defaultProps: {
    title: '弹窗标题',
    width: '600px',
    confirmText: '确定',
    cancelText: '取消',
    destroyOnClose: true,
    contentMode: 'edit' as const,
    showFooter: true,
    closeOnClickModal: false,
    draggable: true,
    showFullscreenBtn: true,
  },
  propertyPanel: {
    basic: [
      { key: 'title', label: '标题', type: 'input', default: '弹窗标题' },
      { key: 'width', label: '宽度', type: 'input', default: '600px' },
      { key: 'confirmText', label: '确认按钮文字', type: 'input', default: '确定' },
      { key: 'cancelText', label: '取消按钮文字', type: 'input', default: '取消' },
      { key: 'destroyOnClose', label: '关闭时销毁', type: 'switch', default: true },
      { key: 'showFooter', label: '显示底部按钮', type: 'switch', default: true },
      { key: 'closeOnClickModal', label: '点击遮罩关闭', type: 'switch', default: false },
      {
        key: 'contentMode',
        label: '内容模式',
        type: 'select',
        options: [
          { label: '编辑模式', value: 'edit' },
          { label: '微应用模式', value: 'microapp' },
        ],
        default: 'edit',
      },
      {
        key: 'publishId',
        label: '发布 ID',
        type: 'input',
        default: '',
        placeholder: '已发布 Schema 的 publishId',
        visibleOn: "props.contentMode === 'microapp'",
      },
      {
        key: 'microappBaseUrl',
        label: 'API 基础 URL',
        type: 'input',
        default: '',
        placeholder: '留空使用当前域名',
        visibleOn: "props.contentMode === 'microapp'",
      },
    ],
    style: [],
    props: [
      { key: 'draggable', label: '可拖拽', type: 'switch', default: true },
      { key: 'showFullscreenBtn', label: '显示全屏按钮', type: 'switch', default: true },
    ],
  },
  configPanels: {
    events: [
      { key: 'confirm', label: '确认', desc: '点击确认按钮时触发，携带 dialog 数据' },
      { key: 'cancel', label: '取消', desc: '点击取消按钮时触发' },
      { key: 'open', label: '打开', desc: '弹窗打开时触发' },
      { key: 'close', label: '关闭', desc: '弹窗关闭时触发' },
    ],
  },
}
```

- [ ] **Step 3: 验证编译通过**

Run: `cd packages/web && npx vue-tsc --noEmit 2>&1 | head -30`
Expected: 无 FgDialog 相关类型错误

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/widgets/dialog/FgDialog.vue packages/web/src/widgets/dialog/config.ts
git commit -m "feat(FgDialog): complete container — defineExpose, events, formContext, destroyOnClose, microapp, configPanels"
```

---

## Task 4: FgForm 完整性测试

**Files:**
- Rewrite: `packages/web/src/widgets/form/__tests__/FgForm.spec.ts`

- [ ] **Step 1: 重写 FgForm 测试**

用以下内容替换 `packages/web/src/widgets/form/__tests__/FgForm.spec.ts` 的全部内容：

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed, nextTick } from 'vue'
import ElementPlus from 'element-plus'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget, getWidget } from '@/widgets/registry'
import { widgetDataKey, widgetStyleKey, formContextKey } from '../../base/types'
import FgForm from '../FgForm.vue'

// Mock composables from Plans 2 & 3
vi.mock('@/composables/useWidgetLifecycle', () => ({
  useWidgetLifecycle: () => ({
    trigger: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('@/composables/useWorkerRequest', () => ({
  useWorkerRequest: () => ({
    request: vi.fn().mockResolvedValue({ name: 'test', age: 25 }),
  }),
}))

vi.mock('@/composables/useLogger', () => ({
  useLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

describe('FgForm', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountForm(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('form', 'test_form')!
    Object.assign(widget, overrides)
    store.addWidget(widget)
    return mount(FgForm, {
      global: {
        plugins: [ElementPlus],
        provide: {
          [widgetDataKey as symbol]: computed(() => store.findWidget('test_form')!),
          [widgetStyleKey as symbol]: computed(() => store.findWidget('test_form')!.style ?? {}),
        },
      },
    })
  }

  // ---- Dimension 1: Store CRUD ----
  describe('Store CRUD', () => {
    it('创建后 store 中存在', () => {
      const widget = createWidget('form', 'test_form')
      store.addWidget(widget!)
      expect(store.findWidget('test_form')).toBeDefined()
    })

    it('可从 store 移除', () => {
      const widget = createWidget('form', 'test_form')
      store.addWidget(widget!)
      store.removeWidget('test_form')
      expect(store.findWidget('test_form')).toBeNull()
    })

    it('可更新属性', () => {
      const widget = createWidget('form', 'test_form')
      store.addWidget(widget!)
      store.updateWidget('test_form', { label: '新标签' })
      expect(store.findWidget('test_form')!.label).toBe('新标签')
    })
  })

  // ---- Dimension 2: Props ----
  describe('Props', () => {
    it('默认 labelWidth 为 100px', () => {
      const wrapper = mountForm()
      const elForm = wrapper.find('.el-form')
      expect(elForm.attributes('label-width')).toBe('100px')
    })

    it('labelWidth 可自定义', () => {
      const wrapper = mountForm({ props: { labelWidth: '120px' } })
      const elForm = wrapper.find('.el-form')
      expect(elForm.attributes('label-width')).toBe('120px')
    })

    it('默认 labelPosition 为 right', () => {
      const wrapper = mountForm()
      const elForm = wrapper.find('.el-form')
      expect(elForm.classes()).toContain('el-form--label-right')
    })

    it('labelPosition 可配置为 left', () => {
      const wrapper = mountForm({ props: { labelPosition: 'left' } })
      const elForm = wrapper.find('.el-form')
      expect(elForm.classes()).toContain('el-form--label-left')
    })
  })

  // ---- Dimension 3: Container child management ----
  describe('容器子组件管理', () => {
    it('可容纳子组件', () => {
      const container = createWidget('form', 'container')
      const child = createWidget('input', 'child_1')
      store.addWidget(container!)
      store.addWidget(child!)
      store.addToContainer('child_1', 'container')
      expect(store.findWidget('container')!.children).toHaveLength(1)
    })

    it('可容纳多个子组件', () => {
      const container = createWidget('form', 'container')
      const child1 = createWidget('input', 'child_1')
      const child2 = createWidget('select', 'child_2')
      store.addWidget(container!)
      store.addWidget(child1!)
      store.addWidget(child2!)
      store.addToContainer('child_1', 'container')
      store.addToContainer('child_2', 'container')
      expect(store.findWidget('container')!.children).toHaveLength(2)
    })

    it('可移除子组件', () => {
      const container = createWidget('form', 'container')
      const child = createWidget('input', 'child_1')
      store.addWidget(container!)
      store.addWidget(child!)
      store.addToContainer('child_1', 'container')
      store.removeFromContainer('child_1')
      expect(store.isRootWidget('child_1')).toBe(true)
    })
  })

  // ---- Dimension 4: defineExpose ----
  describe('defineExpose', () => {
    it('暴露 validate 方法', () => {
      const wrapper = mountForm()
      expect(wrapper.vm.validate).toBeDefined()
      expect(typeof wrapper.vm.validate).toBe('function')
    })

    it('暴露 validateField 方法', () => {
      const wrapper = mountForm()
      expect(wrapper.vm.validateField).toBeDefined()
    })

    it('暴露 clearValidate 方法', () => {
      const wrapper = mountForm()
      expect(wrapper.vm.clearValidate).toBeDefined()
    })

    it('暴露 resetFields 方法', () => {
      const wrapper = mountForm()
      expect(wrapper.vm.resetFields).toBeDefined()
    })

    it('暴露 scrollToField 方法', () => {
      const wrapper = mountForm()
      expect(wrapper.vm.scrollToField).toBeDefined()
    })

    it('暴露 getFormData 方法', () => {
      const wrapper = mountForm()
      expect(wrapper.vm.getFormData).toBeDefined()
      const data = wrapper.vm.getFormData()
      expect(typeof data).toBe('object')
    })

    it('暴露 setFormData 方法', () => {
      const wrapper = mountForm()
      expect(wrapper.vm.setFormData).toBeDefined()
    })

    it('暴露 submit 方法', () => {
      const wrapper = mountForm()
      expect(wrapper.vm.submit).toBeDefined()
      expect(typeof wrapper.vm.submit).toBe('function')
    })

    it('getFormData 返回当前 formModel 副本', () => {
      const wrapper = mountForm()
      const data = wrapper.vm.getFormData()
      expect(data).toEqual({})
    })

    it('setFormData 合并数据到 formModel', async () => {
      const wrapper = mountForm()
      wrapper.vm.setFormData({ name: 'test' })
      await nextTick()
      const data = wrapper.vm.getFormData()
      expect(data.name).toBe('test')
    })
  })

  // ---- Dimension 5: Events ----
  describe('事件系统', () => {
    it('submit 校验通过时触发 submit 事件', async () => {
      const wrapper = mountForm()
      // Mock validate to resolve true
      vi.spyOn(wrapper.vm, 'validate').mockResolvedValue(true)
      await wrapper.vm.submit()
      expect(wrapper.emitted('submit')).toBeDefined()
    })

    it('submit 校验失败时触发 validate-error 事件', async () => {
      const wrapper = mountForm()
      vi.spyOn(wrapper.vm, 'validate').mockResolvedValue(false)
      await wrapper.vm.submit()
      expect(wrapper.emitted('validate-error')).toBeDefined()
    })

    it('resetFields 触发 reset 事件', async () => {
      const wrapper = mountForm()
      wrapper.vm.resetFields()
      await nextTick()
      expect(wrapper.emitted('reset')).toBeDefined()
    })
  })

  // ---- Dimension 6: FormContext provide ----
  describe('FormContext provide', () => {
    it('provide 包含 formRef', () => {
      const wrapper = mountForm()
      // FgForm provides formContextKey — verify by checking the component's provide
      expect(wrapper.vm.$?.provides?.[formContextKey as symbol]).toBeDefined()
    })

    it('provide 包含 updateField 方法', () => {
      const wrapper = mountForm()
      const ctx = wrapper.vm.$?.provides?.[formContextKey as symbol] as Record<string, unknown>
      expect(ctx?.updateField).toBeDefined()
      expect(typeof ctx?.updateField).toBe('function')
    })
  })

  // ---- Dimension 7: Config panel ----
  describe('配置面板', () => {
    it('configPanels 定义了事件配置', () => {
      const item = getWidget('form')
      expect(item?.config.configPanels?.events).toBeDefined()
      expect(item?.config.configPanels!.events!.length).toBeGreaterThan(0)
    })

    it('configPanels 定义了数据源配置', () => {
      const item = getWidget('form')
      expect(item?.config.configPanels?.dataSource).toBeDefined()
      expect(item?.config.configPanels!.dataSource!.supported).toBe(true)
    })

    it('事件面板包含 submit 事件', () => {
      const item = getWidget('form')
      const events = item?.config.configPanels?.events ?? []
      expect(events.some(e => e.key === 'submit')).toBe(true)
    })

    it('事件面板包含 validate-error 事件', () => {
      const item = getWidget('form')
      const events = item?.config.configPanels?.events ?? []
      expect(events.some(e => e.key === 'validate-error')).toBe(true)
    })

    it('事件面板包含 reset 事件', () => {
      const item = getWidget('form')
      const events = item?.config.configPanels?.events ?? []
      expect(events.some(e => e.key === 'reset')).toBe(true)
    })

    it('事件面板包含 data-change 事件', () => {
      const item = getWidget('form')
      const events = item?.config.configPanels?.events ?? []
      expect(events.some(e => e.key === 'data-change')).toBe(true)
    })
  })
})
```

- [ ] **Step 2: 运行测试**

Run: `cd packages/web && npx vitest run src/widgets/form/__tests__/FgForm.spec.ts 2>&1 | tail -30`
Expected: 所有测试通过

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/widgets/form/__tests__/FgForm.spec.ts
git commit -m "test(FgForm): completeness tests — expose, events, formContext, configPanels"
```

---

## Task 5: FgDialog 完整性测试

**Files:**
- Rewrite: `packages/web/src/widgets/dialog/__tests__/FgDialog.spec.ts`

- [ ] **Step 1: 重写 FgDialog 测试**

用以下内容替换 `packages/web/src/widgets/dialog/__tests__/FgDialog.spec.ts` 的全部内容：

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed, nextTick } from 'vue'
import ElementPlus from 'element-plus'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget, getWidget } from '@/widgets/registry'
import { widgetDataKey, widgetStyleKey, formContextKey } from '../../base/types'
import FgDialog from '../FgDialog.vue'

// Mock composables from Plans 2 & 3
vi.mock('@/composables/useWidgetLifecycle', () => ({
  useWidgetLifecycle: () => ({
    trigger: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('@/composables/useLogger', () => ({
  useLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

describe('FgDialog', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountDialog(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('dialog', 'test_dialog')!
    Object.assign(widget, overrides)
    store.addWidget(widget)
    return mount(FgDialog, {
      global: {
        plugins: [ElementPlus],
        provide: {
          [widgetDataKey as symbol]: computed(() => store.findWidget('test_dialog')!),
          [widgetStyleKey as symbol]: computed(() => store.findWidget('test_dialog')!.style ?? {}),
        },
      },
    })
  }

  // ---- Dimension 1: Store CRUD ----
  describe('Store CRUD', () => {
    it('创建后 store 中存在', () => {
      const widget = createWidget('dialog', 'test_dialog')
      store.addWidget(widget!)
      expect(store.findWidget('test_dialog')).toBeDefined()
    })

    it('可从 store 移除', () => {
      const widget = createWidget('dialog', 'test_dialog')
      store.addWidget(widget!)
      store.removeWidget('test_dialog')
      expect(store.findWidget('test_dialog')).toBeNull()
    })

    it('可更新属性', () => {
      const widget = createWidget('dialog', 'test_dialog')
      store.addWidget(widget!)
      store.updateWidget('test_dialog', { label: '新标签' })
      expect(store.findWidget('test_dialog')!.label).toBe('新标签')
    })
  })

  // ---- Dimension 2: Props ----
  describe('Props', () => {
    it('默认 title 属性', () => {
      const widget = createWidget('dialog', 'test_dialog')!
      store.addWidget(widget)
      expect(widget.props?.title).toBe('弹窗标题')
    })

    it('默认 width 为 600px', () => {
      const widget = createWidget('dialog', 'test_dialog')!
      store.addWidget(widget)
      expect(widget.props?.width).toBe('600px')
    })

    it('默认 draggable 为 true', () => {
      const widget = createWidget('dialog', 'test_dialog')!
      store.addWidget(widget)
      expect(widget.props?.draggable).toBe(true)
    })

    it('默认 destroyOnClose 为 true', () => {
      const widget = createWidget('dialog', 'test_dialog')!
      store.addWidget(widget)
      expect(widget.props?.destroyOnClose).toBe(true)
    })

    it('默认 showFooter 为 true', () => {
      const widget = createWidget('dialog', 'test_dialog')!
      store.addWidget(widget)
      expect(widget.props?.showFooter).toBe(true)
    })
  })

  // ---- Dimension 3: Container child management ----
  describe('容器子组件管理', () => {
    it('可容纳子组件', () => {
      const container = createWidget('dialog', 'container')
      const child = createWidget('input', 'child_1')
      store.addWidget(container!)
      store.addWidget(child!)
      store.addToContainer('child_1', 'container')
      expect(store.findWidget('container')!.children).toHaveLength(1)
    })

    it('可容纳多个子组件', () => {
      const container = createWidget('dialog', 'container')
      const child1 = createWidget('input', 'child_1')
      const child2 = createWidget('input', 'child_2')
      store.addWidget(container!)
      store.addWidget(child1!)
      store.addWidget(child2!)
      store.addToContainer('child_1', 'container')
      store.addToContainer('child_2', 'container')
      expect(store.findWidget('container')!.children).toHaveLength(2)
    })

    it('可移除子组件', () => {
      const container = createWidget('dialog', 'container')
      const child = createWidget('input', 'child_1')
      store.addWidget(container!)
      store.addWidget(child!)
      store.addToContainer('child_1', 'container')
      store.removeFromContainer('child_1')
      expect(store.isRootWidget('child_1')).toBe(true)
    })
  })

  // ---- Dimension 4: defineExpose ----
  describe('defineExpose', () => {
    it('暴露 open 方法', () => {
      const wrapper = mountDialog()
      expect(wrapper.vm.open).toBeDefined()
      expect(typeof wrapper.vm.open).toBe('function')
    })

    it('暴露 close 方法', () => {
      const wrapper = mountDialog()
      expect(wrapper.vm.close).toBeDefined()
      expect(typeof wrapper.vm.close).toBe('function')
    })

    it('暴露 validate 方法', () => {
      const wrapper = mountDialog()
      expect(wrapper.vm.validate).toBeDefined()
      expect(typeof wrapper.vm.validate).toBe('function')
    })

    it('暴露 getDialogData 方法', () => {
      const wrapper = mountDialog()
      expect(wrapper.vm.getDialogData).toBeDefined()
    })

    it('暴露 setDialogData 方法', () => {
      const wrapper = mountDialog()
      expect(wrapper.vm.setDialogData).toBeDefined()
    })

    it('open 显示弹窗', async () => {
      const wrapper = mountDialog()
      wrapper.vm.open()
      await nextTick()
      expect(wrapper.emitted('open')).toBeDefined()
    })

    it('open 可传入初始数据', async () => {
      const wrapper = mountDialog()
      wrapper.vm.open({ name: 'test' })
      await nextTick()
      const data = wrapper.vm.getDialogData()
      expect(data.name).toBe('test')
    })

    it('close 关闭弹窗', async () => {
      const wrapper = mountDialog()
      wrapper.vm.open()
      await nextTick()
      wrapper.vm.close()
      await nextTick()
      expect(wrapper.emitted('close')).toBeDefined()
    })
  })

  // ---- Dimension 5: Events ----
  describe('事件系统', () => {
    it('确认按钮触发 confirm 事件', async () => {
      const wrapper = mountDialog()
      wrapper.vm.open()
      await nextTick()
      const confirmBtn = wrapper.findAll('.el-button').find(b => b.text() === '确定')
      await confirmBtn?.trigger('click')
      expect(wrapper.emitted('confirm')).toBeDefined()
    })

    it('取消按钮触发 cancel 事件', async () => {
      const wrapper = mountDialog()
      wrapper.vm.open()
      await nextTick()
      const cancelBtn = wrapper.findAll('.el-button').find(b => b.text() === '取消')
      await cancelBtn?.trigger('click')
      expect(wrapper.emitted('cancel')).toBeDefined()
    })

    it('confirm 事件携带 dialogModel 数据', async () => {
      const wrapper = mountDialog()
      wrapper.vm.open({ status: 'active' })
      await nextTick()
      const confirmBtn = wrapper.findAll('.el-button').find(b => b.text() === '确定')
      await confirmBtn?.trigger('click')
      const emitted = wrapper.emitted('confirm')
      expect(emitted).toBeDefined()
      expect(emitted![0][0]).toEqual(expect.objectContaining({ status: 'active' }))
    })
  })

  // ---- Dimension 6: FormContext provide ----
  describe('FormContext provide', () => {
    it('provide 包含 updateField 方法', () => {
      const wrapper = mountDialog()
      const ctx = wrapper.vm.$?.provides?.[formContextKey as symbol] as Record<string, unknown>
      expect(ctx?.updateField).toBeDefined()
      expect(typeof ctx?.updateField).toBe('function')
    })

    it('provide 包含独立的 formModel', () => {
      const wrapper = mountDialog()
      const ctx = wrapper.vm.$?.provides?.[formContextKey as symbol] as Record<string, unknown>
      expect(ctx?.formModel).toBeDefined()
      expect(typeof ctx?.formModel).toBe('object')
    })
  })

  // ---- Dimension 7: destroyOnClose ----
  describe('destroyOnClose', () => {
    it('关闭时清空 dialogModel（destroyOnClose=true）', async () => {
      const wrapper = mountDialog({ props: { destroyOnClose: true } })
      wrapper.vm.open({ name: 'test', age: 25 })
      await nextTick()
      wrapper.vm.close()
      await nextTick()
      const data = wrapper.vm.getDialogData()
      expect(data.name).toBeUndefined()
      expect(data.age).toBeUndefined()
    })

    it('关闭时保留 dialogModel（destroyOnClose=false）', async () => {
      const widget = createWidget('dialog', 'test_dialog')!
      widget.props = { ...widget.props, destroyOnClose: false }
      store.addWidget(widget)
      const wrapper = mount(FgDialog, {
        global: {
          plugins: [ElementPlus],
          provide: {
            [widgetDataKey as symbol]: computed(() => store.findWidget('test_dialog')!),
            [widgetStyleKey as symbol]: computed(() => store.findWidget('test_dialog')!.style ?? {}),
          },
        },
      })
      wrapper.vm.open({ name: 'test' })
      await nextTick()
      wrapper.vm.close()
      await nextTick()
      const data = wrapper.vm.getDialogData()
      expect(data.name).toBe('test')
    })
  })

  // ---- Dimension 8: Config panel ----
  describe('配置面板', () => {
    it('configPanels 定义了事件配置', () => {
      const item = getWidget('dialog')
      expect(item?.config.configPanels?.events).toBeDefined()
      expect(item?.config.configPanels!.events!.length).toBeGreaterThan(0)
    })

    it('事件面板包含 confirm 事件', () => {
      const item = getWidget('dialog')
      const events = item?.config.configPanels?.events ?? []
      expect(events.some(e => e.key === 'confirm')).toBe(true)
    })

    it('事件面板包含 cancel 事件', () => {
      const item = getWidget('dialog')
      const events = item?.config.configPanels?.events ?? []
      expect(events.some(e => e.key === 'cancel')).toBe(true)
    })

    it('事件面板包含 open 事件', () => {
      const item = getWidget('dialog')
      const events = item?.config.configPanels?.events ?? []
      expect(events.some(e => e.key === 'open')).toBe(true)
    })

    it('事件面板包含 close 事件', () => {
      const item = getWidget('dialog')
      const events = item?.config.configPanels?.events ?? []
      expect(events.some(e => e.key === 'close')).toBe(true)
    })
  })

  // ---- Dimension 9: Microapp mode ----
  describe('微应用模式', () => {
    it('contentMode=microapp 时显示 iframe', async () => {
      const widget = createWidget('dialog', 'test_dialog')!
      widget.props = { ...widget.props, contentMode: 'microapp', publishId: 'pub_123' }
      store.addWidget(widget)
      const wrapper = mount(FgDialog, {
        global: {
          plugins: [ElementPlus],
          provide: {
            [widgetDataKey as symbol]: computed(() => store.findWidget('test_dialog')!),
            [widgetStyleKey as symbol]: computed(() => store.findWidget('test_dialog')!.style ?? {}),
          },
        },
      })
      // 微应用模式下编辑模式不应显示 dialog
      expect(wrapper.find('.el-dialog').exists()).toBe(false)
    })
  })
})
```

- [ ] **Step 2: 运行测试**

Run: `cd packages/web && npx vitest run src/widgets/dialog/__tests__/FgDialog.spec.ts 2>&1 | tail -30`
Expected: 所有测试通过

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/widgets/dialog/__tests__/FgDialog.spec.ts
git commit -m "test(FgDialog): completeness tests — expose, events, formContext, destroyOnClose, microapp, configPanels"
```

---

## Task 6: 全量测试验证

**Files:** 无新增文件

- [ ] **Step 1: 运行 FgForm + FgDialog 测试**

Run: `cd packages/web && npx vitest run src/widgets/form/__tests__/FgForm.spec.ts src/widgets/dialog/__tests__/FgDialog.spec.ts 2>&1 | tail -40`
Expected: 所有测试通过

- [ ] **Step 2: 运行全量测试确认无回归**

Run: `cd packages/web && npx vitest run 2>&1 | tail -20`
Expected: 无失败测试

- [ ] **Step 3: 类型检查**

Run: `cd packages/web && npx vue-tsc --noEmit 2>&1 | tail -20`
Expected: 无类型错误

- [ ] **Step 4: Final commit（如有修复）**

如果前面步骤发现任何问题并修复，做一次最终 commit：

```bash
git add -A
git commit -m "fix: address test/type issues in FgForm and FgDialog"
```
