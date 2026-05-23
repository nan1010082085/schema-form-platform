<script setup lang="ts">
import { ref, computed, provide, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'
import SchemaRender from './SchemaRender.vue'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
// FgDialog import removed — internal dialog rendered inline below
import type {
  FormSchemaItem,
  FormGridContext,
  FormData,
  FormFieldValue,
  SchemaAction,
  FormGridProps,
  LoadApiConfig,
  FormGridLocale,
} from './types'
import {
  FORM_GRID_CONTEXT_KEY,
  FORM_GRID_FORM_KEY,
  FORM_GRID_API_KEY,
  ACTION_EMIT_KEY,
  FORM_GRID_LINKAGE_KEY,
  FORM_GRID_T_KEY,
  FORM_GRID_READONLY_KEY,
} from './types'
import { useLinkage } from '@/composables/useLinkage'
import { useFormData } from '@/composables/useFormData'
import { useLifecycle } from '@/composables/useLifecycle'
import { useLocale } from '@/composables/useLocale'
import { apiClient } from '@/utils/apiClient'

/** Element Plus 语言包映射 */
const epLocaleMap: Record<FormGridLocale, typeof zhCn> = {
  'zh-CN': zhCn,
  'en-US': en,
}

const props = defineProps<FormGridProps & {
  /** 编辑器模式：启用容器拖放区域（Sprint 11） */
  editable?: boolean
  /** 是否正在拖拽中（Sprint 11） */
  isDragging?: boolean
  /** 只读模式：禁用所有表单输入，隐藏内部按钮（文件列表保留） */
  readonly?: boolean
}>()

const emit = defineEmits<{
  'submit': [data: FormData]
  'validate-error': [errors: Record<string, unknown>]
  'action': [action: SchemaAction]
  'open-dialog': [config: { title: string; width?: string; schema?: FormSchemaItem[]; initialData?: FormData }]
  'container-drop': [payload: { parentPath: number[]; index: number; dragDataRaw: string }]
}>()

const formRef = ref<FormInstance>()
const loading = ref(false)

// ---- Dialog state ----
const dialogMode = computed(() => props.dialogMode ?? 'internal')
const dialogVisible = ref(false)
const dialogTitle = ref('')
const dialogWidth = ref<string | undefined>(undefined)
const dialogSchema = ref<FormSchemaItem[] | undefined>(undefined)
const dialogInitialData = ref<FormData | undefined>(undefined)

function openDialog(config: { title: string; width?: string; schema?: FormSchemaItem[]; initialData?: FormData }) {
  if (dialogMode.value === 'external') {
    // 外部模式：仅通知父组件，不接管弹窗渲染
    emit('open-dialog', config)
    return
  }
  dialogTitle.value = config.title
  dialogWidth.value = config.width
  dialogSchema.value = config.schema
  dialogInitialData.value = config.initialData
  dialogVisible.value = true
  emit('open-dialog', config)
}

function handleDialogConfirm(_data: FormData) {
  dialogVisible.value = false
  // Re-emit so parent can handle dialog result
  emit('action', { type: 'dialog', dialogTitle: dialogTitle.value, dialogSchema: dialogSchema.value } as unknown as SchemaAction)
}

function handleDialogCancel() {
  dialogVisible.value = false
}

// ---- 表单数据管理（抽取自 useFormData） ----
const {
  formData,
  getFormData,
  setFormData,
  resetFields,
  validate: baseValidate,
  initFormData,
} = useFormData(formRef)

// ---- 生命周期钩子 ----
const { executeBeforeSubmit, executeAfterLoad } = useLifecycle(props.lifecycle, formData)

// ---- 上下文注入 ----
const context: FormGridContext = {
  user: props.user ?? { id: '', name: '', deptId: '', deptName: '', roles: [] },
  request: props.request ?? { token: '', headers: {}, baseUrl: '' },
  global: props.global ?? { dictMap: {}, config: {} },
}
provide(FORM_GRID_CONTEXT_KEY, context)
provide(FORM_GRID_FORM_KEY, formData)

// 注入 FormGrid API 给子组件（如 FgSchemaButtonList、FgSteps）使用
provide(FORM_GRID_API_KEY, {
  validate,
  validateField,
  getFormData,
  resetFields,
})

// 注入 action emit 函数，消除中间层事件转发
provide(ACTION_EMIT_KEY, (event: string, payload?: unknown) => {
  if (event === 'action') {
    emit('action', payload as SchemaAction)
  } else if (event === 'submit') {
    emit('submit', payload as FormData)
  } else if (event === 'open-dialog') {
    const config = payload as { title: string; width?: string; schema?: FormSchemaItem[]; initialData?: FormData }
    openDialog(config)
    // emit 已由 openDialog 内部处理（根据 dialogMode 决定）
  }
})

// 联动状态
const { stateMap: linkageStateMap } = useLinkage(props.schema, formData)
provide(FORM_GRID_LINKAGE_KEY, linkageStateMap)

// 只读模式注入（使用 toRef 保持响应式）
const readonlyRef = computed(() => props.readonly ?? false)
provide(FORM_GRID_READONLY_KEY, readonlyRef)

// Build defaultValue map from schema tree for reset-fields linkage
function collectDefaultValues(items: FormSchemaItem[]): Map<string, unknown> {
  const map = new Map<string, unknown>()
  for (const item of items) {
    if (item.field && item.defaultValue !== undefined) {
      map.set(item.field, item.defaultValue)
    }
    if (item.children?.length) {
      const childMap = collectDefaultValues(item.children)
      childMap.forEach((v, k) => map.set(k, v))
    }
  }
  return map
}

const defaultValuesMap = computed(() => collectDefaultValues(props.schema))

// Apply reset-fields effects from linkage state (deferred to avoid render-cycle writes)
let resetFieldsPending = false
watch(
  linkageStateMap,
  (map) => {
    if (resetFieldsPending) return
    const defaults = defaultValuesMap.value
    let hasResets = false
    for (const [, state] of map) {
      if (state.resetFields?.length) {
        for (const targetField of state.resetFields) {
          const dv = defaults.get(targetField)
          if (formData[targetField] !== dv) {
            formData[targetField] = (dv ?? undefined) as FormFieldValue
            hasResets = true
          }
        }
      }
    }
    if (hasResets) {
      resetFieldsPending = true
      Promise.resolve().then(() => { resetFieldsPending = false })
    }
  },
  { deep: true },
)

// ---- 国际化 ----
const currentLocale = computed(() => props.locale ?? 'zh-CN')
const { t } = useLocale(currentLocale)
provide(FORM_GRID_T_KEY, t)

// Element Plus 语言包（按需映射，避免全量加载）
const epLocale = computed(() => epLocaleMap[currentLocale.value])

/**
 * 对 API 返回数据应用字段映射
 * 将 API 返回的字段名转换为 formData 中的字段名
 */
function applyFieldMap(data: Record<string, unknown>, fieldMap?: Record<string, string>): FormData {
  if (!fieldMap) return data as FormData
  const mapped: FormData = {}
  for (const [apiField, formField] of Object.entries(fieldMap)) {
    if (apiField in data) {
      mapped[formField] = data[apiField] as FormData[string]
    }
  }
  return mapped
}

/**
 * 通过 loadApi 加载数据并回填到 formData
 * 流程：请求 → transformAfterLoad → 字段映射 → 合并 → 触发 onAfterLoad
 */
async function loadApiData(config: LoadApiConfig): Promise<void> {
  loading.value = true
  try {
    const method = config.method ?? 'get'
    const res: unknown = await apiClient.requestUrl(method, config.url, config.params)

    // 假设 API 返回 { code: 0, data: Record<string, any> }
    let rawData: Record<string, unknown> = {}
    if (res && typeof res === 'object') {
      const obj = res as Record<string, unknown>
      rawData = (obj.data ?? obj) as Record<string, unknown>
    }

    // transformAfterLoad: 加载后数据转换（在字段映射之前）
    let transformedData: FormData
    if (props.transformAfterLoad) {
      try {
        transformedData = await props.transformAfterLoad(rawData)
      } catch (err) {
        const msg = err instanceof Error ? err.message : '数据转换失败'
        console.warn('[FormGrid transformAfterLoad] 转换失败，使用原始数据降级:', msg)
        // 降级：使用原始数据
        transformedData = applyFieldMap(rawData, config.fieldMap)
        setFormData(transformedData)
        await executeAfterLoad(formData)
        return
      }
    } else {
      // 无转换：直接使用原始数据
      transformedData = rawData as FormData
    }

    // 应用字段映射并合并到 formData
    const mappedData = applyFieldMap(transformedData, config.fieldMap)
    setFormData(mappedData)

    // 触发 onAfterLoad 钩子
    await executeAfterLoad(formData)
  } catch (err) {
    const msg = err instanceof Error ? err.message : '数据加载失败'
    console.error('[FormGrid loadApi]', msg)
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

// ---- 初始化 ----
onMounted(async () => {
  // 1. 从 schema 初始化默认值
  initFormData(props.schema)

  // 2. loadApi 回填（覆盖 defaultValue）
  if (props.loadApi) {
    await loadApiData(props.loadApi)
  }
})

watch(() => props.schema, (val) => initFormData(val), { deep: true })

// ---- 统一 API ----

/** 校验整个表单（带 validate-error 事件上报） */
async function validate(): Promise<boolean> {
  return baseValidate().catch((errors): never => {
    emit('validate-error', errors as Record<string, unknown>)
    throw errors
  })
}

/** 校验指定字段 */
async function validateField(fields?: string | string[]): Promise<boolean> {
  return formRef.value?.validateField(fields) ?? true
}

/** 清除校验结果 */
function clearValidate(fields?: string | string[]) {
  formRef.value?.clearValidate(fields)
}

/** 获取指定字段的校验错误信息 */
function getFieldError(field: string): string | undefined {
  const fields = formRef.value?.fields
  if (!fields) return undefined
  const target = fields.find((f: { prop?: unknown }) => f.prop === field)
  return target?.validateMessage || undefined
}

/** 滚动到指定字段 */
function scrollToField(field: string) {
  formRef.value?.scrollToField(field)
}

/** 提交表单（校验 + 钩子 + 数据转换后触发 submit 事件） */
async function submit() {
  // 1. onBeforeSubmit 钩子可阻止提交
  const allowed = await executeBeforeSubmit()
  if (!allowed) return

  // 2. 表单校验
  const valid = await validate()
  if (!valid) return

  // 3. 提交前数据转换
  let submitData = getFormData()
  if (props.transformBeforeSubmit) {
    try {
      submitData = await props.transformBeforeSubmit(submitData)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '数据转换失败'
      console.error('[FormGrid transformBeforeSubmit]', msg)
      ElMessage.error(msg)
      return
    }
  }

  // 4. 触发提交事件
  emit('submit', submitData)
}

defineExpose({
  getFormData,
  setFormData,
  validate,
  validateField,
  resetFields,
  clearValidate,
  getFieldError,
  scrollToField,
  submit,
  formData,
})
</script>

<template>
  <el-config-provider :locale="epLocale">
    <div v-loading="loading" class="fg">
      <el-form ref="formRef" :model="formData">
        <template v-for="(item, idx) in schema" :key="idx">
          <ErrorBoundary
            v-if="!item.hidden"
            :node-type="item.type"
            :node-field="item.field"
            :node-path="String(idx)"
          >
            <SchemaRender
              :schema="item"
              :form-data="formData"
              :editable="editable"
              :is-dragging="isDragging"
              :readonly="readonly"
              :path="[idx]"
              @container-drop="emit('container-drop', $event)"
            />
          </ErrorBoundary>
        </template>
      </el-form>

      <!-- Built-in dialog (internal mode only): renders dialogSchema from button actions -->
      <el-dialog
        v-if="dialogMode === 'internal'"
        v-model="dialogVisible"
        :title="dialogTitle"
        :width="dialogWidth ?? '600px'"
        append-to-body
        @close="handleDialogCancel"
      >
        <el-form v-if="dialogSchema?.length" :model="formData">
          <SchemaRender
            v-for="(item, dIdx) in dialogSchema"
            :key="dIdx"
            :schema="item"
            :form-data="formData"
            :path="[dIdx]"
          />
        </el-form>
        <template #footer>
          <el-button @click="handleDialogCancel">取消</el-button>
          <el-button type="primary" @click="handleDialogConfirm">确定</el-button>
        </template>
      </el-dialog>
    </div>
  </el-config-provider>
</template>

<style lang="scss">
@use './style.scss';
</style>
