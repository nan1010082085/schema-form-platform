<script setup lang="ts">
/**
 * PropertyPanel -- Right-side property panel (5-tab layout rewrite)
 *
 * Tabs: Basic / Style / Data / Events / Advanced
 * Footer: JSON preview (collapsible) + action buttons
 */
import { computed, watch, ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import LinkageConfig from '@/components/Editor/LinkageConfig.vue'
import ApiConfig from '@/components/Editor/ApiConfig.vue'
import ColumnsEditor from '@/components/Editor/ColumnsEditor.vue'
import SearchFieldsEditor from '@/components/Editor/SearchFieldsEditor.vue'
import RowActionsEditor from '@/components/Editor/RowActionsEditor.vue'
import ButtonEditor from '@/components/Editor/ButtonEditor.vue'
import RulesEditor from '@/components/Editor/RulesEditor.vue'
import { validateSchema } from '@/utils/schemaValidate'
import { createDefaultSchema } from '@/utils/schemaDefaults'
import type { FormSchemaItem, SchemaLinkage, SchemaApiConfig, ListApiConfig, SearchFieldSchema, SearchListColumnSchema, SearchListRowAction, SchemaButtonConfig, ComponentStyle } from '@/components/FormGrid/types'
import { Plus, Delete, CopyDocument, RefreshRight } from '@element-plus/icons-vue'

const props = defineProps<{
  schema: FormSchemaItem | null
  /** Full schema tree for collecting available field names */
  allSchema: FormSchemaItem[]
}>()

const emit = defineEmits<{
  'update:schema': [schema: FormSchemaItem]
  'generate-schema': [schema: import('@/components/FormGrid/types').FormSchemaItem[]]
}>()

const editorStore = useEditorStore()

// Local editing copy to avoid mutating props directly
const localSchema = ref<FormSchemaItem | null>(null)

// Active tab
const activeTab = ref('basic')

// JSON preview collapse state
const jsonPreviewOpen = ref(false)

// ---- Permission roles tag input ----
const roleInputValue = ref('')
const roleInputVisible = ref(false)

// ---- Custom attrs key-value input ----
const attrKeyInput = ref('')
const attrValueInput = ref('')

watch(
  () => props.schema,
  (val) => {
    localSchema.value = val ? { ...val } : null
  },
  { immediate: true, deep: true },
)

function emitUpdate(field: keyof FormSchemaItem, value: unknown) {
  if (!localSchema.value) return
  const updated = { ...localSchema.value, [field]: value }
  localSchema.value = updated
  emit('update:schema', updated)
}

/** Emit a style sub-field update */
function emitStyleUpdate(key: keyof ComponentStyle, value: string | undefined) {
  if (!localSchema.value) return
  const currentStyle: ComponentStyle = localSchema.value.style ?? {}
  emitUpdate('style', { ...currentStyle, [key]: value })
}

// Layout type detection (no field binding needed)
const isLayoutType = computed(() => {
  const t = localSchema.value?.type
  return t === 'grid-row' || t === 'grid-col' || t === 'page' || t === 'toolbar'
    || t === 'card' || t === 'title' || t === 'divider' || t === 'spacer'
    || t === 'steps' || t === 'tabs' || t === 'dialog'
})

// Whether type supports span
const supportsSpan = computed(() => localSchema.value?.type === 'grid-col')

// Whether type is a button or toolbar-buttons
const isButtonType = computed(() => localSchema.value?.type === 'button-list' || localSchema.value?.type === 'toolbar-buttons')

// Whether type is search-list
const isSearchListType = computed(() => localSchema.value?.type === 'search-list')

// Whether type is dialog
const isDialogType = computed(() => localSchema.value?.type === 'dialog')

/** Open the dialog editor (triggers FgDialog via editor store) */
function openDialogEditor() {
  if (localSchema.value?.componentId) {
    editorStore.openDialogEditor(localSchema.value.componentId)
  }
}

/** Update dialog props (title, width) */
function updateDialogProp(key: string, value: unknown) {
  if (!localSchema.value) return
  const currentProps = (localSchema.value.props as Record<string, unknown>) ?? {}
  emitUpdate('props', { ...currentProps, [key]: value })
}

// Placeholder-eligible types
const supportsPlaceholder = computed(() =>
  ['input', 'number', 'select', 'textarea', 'date', 'date-range'].includes(localSchema.value?.type ?? ''),
)

// ---- Available fields for linkage (exclude self) ----
const availableFields = computed(() => {
  const fields = collectFields(props.allSchema)
  const selfField = localSchema.value?.field
  return selfField ? fields.filter((f) => f !== selfField) : fields
})

function collectFields(items: FormSchemaItem[]): string[] {
  const result: string[] = []
  for (const item of items) {
    if (item.field) result.push(item.field)
    if (item.children?.length) result.push(...collectFields(item.children))
  }
  return [...new Set(result)]
}

// Component types that support dynamic options (API config)
const API_SUPPORTED_TYPES = ['select', 'radio', 'checkbox', 'person-select', 'dept-select', 'transfer', 'tree-layout']
const supportsApi = computed(() => API_SUPPORTED_TYPES.includes(localSchema.value?.type ?? ''))

// Whether the "events" tab shows linkage config (non-layout, non-button)
const hasEventsConfig = computed(() => !isLayoutType.value && !isButtonType.value)

// ---- Linkage handlers ----
function handleLinkageUpdate(linkages: SchemaLinkage[]) {
  emitUpdate('linkages', linkages)
}

// ---- API config handler ----
function handleApiUpdate(api: SchemaApiConfig | undefined) {
  emitUpdate('api', api)
}

// ---- Search fields handler ----
function handleSearchFieldsUpdate(fields: SearchFieldSchema[]) {
  emitUpdate('searchFields', fields)
}

// ---- Columns handler ----
function handleColumnsUpdate(columns: SearchListColumnSchema[]) {
  emitUpdate('columns', columns)
}

// ---- Row actions handler ----
function handleRowActionsUpdate(actions: SearchListRowAction[]) {
  emitUpdate('rowActions', actions)
}

// ---- Buttons handler ----
function handleButtonsUpdate(buttons: SchemaButtonConfig[]) {
  emitUpdate('buttons', buttons)
}

// ---- Rules handler ----
function handleRulesUpdate(rules: import('element-plus').FormItemRule[] | undefined) {
  emitUpdate('rules', rules)
}

// ---- Generate schema from API response ----
function handleGenerateSchema(schema: FormSchemaItem[]) {
  emit('generate-schema', schema)
}

// ---- List API handler (search-list only) ----
function updateListApi(key: keyof ListApiConfig, value: unknown) {
  if (!localSchema.value) return
  const current = localSchema.value.listApi ?? {}
  const updated = { ...current, [key]: value }
  emitUpdate('listApi', updated)
}

// ---- Permission roles management ----
function addPermissionRole() {
  const val = roleInputValue.value.trim()
  if (!val || !localSchema.value) return
  const roles = [...(localSchema.value.permissionRoles ?? []), val]
  emitUpdate('permissionRoles', roles)
  roleInputValue.value = ''
}

function removePermissionRole(index: number) {
  if (!localSchema.value) return
  const roles = (localSchema.value.permissionRoles ?? []).filter((_, i) => i !== index)
  emitUpdate('permissionRoles', roles.length ? roles : undefined)
}

// ---- Custom attrs management ----
function addCustomAttr() {
  const key = attrKeyInput.value.trim()
  const value = attrValueInput.value.trim()
  if (!key || !localSchema.value) return
  const attrs = { ...(localSchema.value.customAttrs ?? {}), [key]: value }
  emitUpdate('customAttrs', attrs)
  attrKeyInput.value = ''
  attrValueInput.value = ''
}

function removeCustomAttr(key: string) {
  if (!localSchema.value?.customAttrs) return
  const { [key]: _, ...rest } = localSchema.value.customAttrs
  emitUpdate('customAttrs', Object.keys(rest).length ? rest : undefined)
}

// ---- Copy JSON ----
async function copyJson() {
  if (!localSchema.value) return
  try {
    await navigator.clipboard.writeText(JSON.stringify(localSchema.value, null, 2))
  } catch {
    // Fallback: select text in the textarea
  }
}

// ---- Reset defaults ----
function resetDefaults() {
  if (!localSchema.value) return
  const defaults = createDefaultSchema(localSchema.value.type)
  // Preserve componentId and field from current schema
  const merged: FormSchemaItem = {
    ...defaults,
    componentId: localSchema.value.componentId,
    field: localSchema.value.field ?? defaults.field,
  }
  localSchema.value = merged
  emit('update:schema', merged)
}

// ---- Real-time validation (SP18-005) ----
const validationResult = computed(() => {
  if (!localSchema.value) return null
  return validateSchema([localSchema.value])
})
</script>

<template>
  <div :class="$style.panel">
    <div :class="$style.header">属性配置</div>

    <template v-if="localSchema">
      <el-scrollbar :class="$style.body">
        <!-- Validation alerts -->
        <div v-if="validationResult?.errors.length" :class="$style.validation">
          <div
            v-for="(err, eIdx) in validationResult.errors"
            :key="eIdx"
            :class="[
              $style.validationItem,
              err.severity === 'error' ? $style.validationError : $style.validationWarning,
            ]"
          >
            {{ err.message }}
          </div>
        </div>

        <el-tabs v-model="activeTab" type="card" :class="$style.tabs">
          <!-- Tab 1: 基础配置 -->
          <el-tab-pane label="基础" name="basic">
            <div :class="$style.tabContent">
              <!-- 类型 -->
              <div :class="$style.field">
                <label :class="$style.label">类型</label>
                <el-input :model-value="localSchema.type" disabled size="small" />
              </div>

              <!-- 组件ID -->
              <div v-if="localSchema.componentId" :class="$style.field">
                <label :class="$style.label">组件ID</label>
                <el-input :model-value="localSchema.componentId" disabled size="small" />
              </div>

              <!-- 字段 -->
              <div v-if="!isLayoutType && !isButtonType" :class="$style.field">
                <label :class="$style.label">字段</label>
                <el-input
                  :model-value="localSchema.field"
                  size="small"
                  placeholder="表单字段名"
                  @update:model-value="emitUpdate('field', $event)"
                />
              </div>

              <!-- 标签 -->
              <div :class="$style.field">
                <label :class="$style.label">标签</label>
                <el-input
                  :model-value="localSchema.label"
                  size="small"
                  placeholder="显示标签"
                  @update:model-value="emitUpdate('label', $event)"
                />
              </div>

              <!-- 栅格 -->
              <div v-if="supportsSpan" :class="$style.field">
                <label :class="$style.label">栅格</label>
                <el-input-number
                  :model-value="(localSchema.span as number) ?? 24"
                  :min="1"
                  :max="24"
                  size="small"
                  style="width: 100%"
                  @update:model-value="emitUpdate('span', $event)"
                />
              </div>

              <!-- 隐藏 -->
              <div :class="$style.field">
                <label :class="$style.label">隐藏</label>
                <el-switch
                  :model-value="localSchema.hidden ?? false"
                  @update:model-value="emitUpdate('hidden', $event)"
                />
              </div>

              <!-- 默认值 -->
              <div v-if="!isLayoutType && !isButtonType" :class="$style.field">
                <label :class="$style.label">默认值</label>
                <el-input
                  :model-value="localSchema.defaultValue != null ? String(localSchema.defaultValue) : ''"
                  size="small"
                  placeholder="默认值"
                  @update:model-value="emitUpdate('defaultValue', $event || undefined)"
                />
              </div>

              <!-- 占位符 -->
              <div v-if="supportsPlaceholder" :class="$style.field">
                <label :class="$style.label">占位符</label>
                <el-input
                  :model-value="(localSchema.props as Record<string, unknown>)?.placeholder as string ?? ''"
                  size="small"
                  @update:model-value="emitUpdate('props', { ...localSchema.props, placeholder: $event })"
                />
              </div>

              <!-- 提示 -->
              <div :class="$style.field">
                <label :class="$style.label">提示</label>
                <el-input
                  :model-value="(localSchema.props as Record<string, unknown>)?.tooltip as string ?? ''"
                  size="small"
                  placeholder="组件提示信息"
                  @update:model-value="emitUpdate('props', { ...localSchema.props, tooltip: $event })"
                />
              </div>

              <!-- Dialog-specific: title and width -->
              <template v-if="isDialogType">
                <div :class="$style.field">
                  <label :class="$style.label">弹窗标题</label>
                  <el-input
                    :model-value="(localSchema.props as Record<string, unknown>)?.title as string ?? ''"
                    size="small"
                    placeholder="弹窗标题"
                    @update:model-value="updateDialogProp('title', $event)"
                  />
                </div>
                <div :class="$style.field">
                  <label :class="$style.label">弹窗宽度</label>
                  <el-input
                    :model-value="(localSchema.props as Record<string, unknown>)?.width as string ?? '600px'"
                    size="small"
                    placeholder="如: 600px / 80%"
                    @update:model-value="updateDialogProp('width', $event)"
                  />
                </div>
                <div :class="$style.field">
                  <label :class="$style.label">弹窗内容</label>
                  <el-button
                    type="primary"
                    size="small"
                    :class="$style.dialogEditBtn"
                    @click="openDialogEditor"
                  >
                    编辑弹窗内容
                  </el-button>
                  <div :class="$style.dialogHint">
                    点击打开可视化编辑器，拖拽组件构建弹窗内容
                  </div>
                </div>
              </template>
            </div>
          </el-tab-pane>

          <!-- Tab 2: 样式配置 -->
          <el-tab-pane label="样式" name="style">
            <div :class="$style.tabContent">
              <div :class="$style.field">
                <label :class="$style.label">宽度</label>
                <el-input
                  :model-value="localSchema.style?.width ?? ''"
                  size="small"
                  placeholder="如: 200px / 50%"
                  @update:model-value="emitStyleUpdate('width', $event || undefined)"
                />
              </div>

              <div :class="$style.field">
                <label :class="$style.label">高度</label>
                <el-input
                  :model-value="localSchema.style?.height ?? ''"
                  size="small"
                  placeholder="如: 100px"
                  @update:model-value="emitStyleUpdate('height', $event || undefined)"
                />
              </div>

              <div :class="$style.field">
                <label :class="$style.label">外边距</label>
                <el-input
                  :model-value="localSchema.style?.margin ?? ''"
                  size="small"
                  placeholder="如: 10px 或 10px 20px"
                  @update:model-value="emitStyleUpdate('margin', $event || undefined)"
                />
              </div>

              <div :class="$style.field">
                <label :class="$style.label">内边距</label>
                <el-input
                  :model-value="localSchema.style?.padding ?? ''"
                  size="small"
                  placeholder="如: 10px 或 10px 20px"
                  @update:model-value="emitStyleUpdate('padding', $event || undefined)"
                />
              </div>

              <div :class="$style.field">
                <label :class="$style.label">文本对齐</label>
                <el-radio-group
                  :model-value="localSchema.style?.textAlign ?? 'left'"
                  size="small"
                  @update:model-value="emitStyleUpdate('textAlign', $event)"
                >
                  <el-radio-button value="left">左</el-radio-button>
                  <el-radio-button value="center">中</el-radio-button>
                  <el-radio-button value="right">右</el-radio-button>
                </el-radio-group>
              </div>

              <div :class="$style.field">
                <label :class="$style.label">背景色</label>
                <el-color-picker
                  :model-value="localSchema.style?.backgroundColor ?? ''"
                  size="small"
                  show-alpha
                  @update:model-value="emitStyleUpdate('backgroundColor', $event || undefined)"
                />
              </div>

              <div :class="$style.field">
                <label :class="$style.label">圆角</label>
                <el-input
                  :model-value="localSchema.style?.borderRadius ?? ''"
                  size="small"
                  placeholder="如: 4px"
                  @update:model-value="emitStyleUpdate('borderRadius', $event || undefined)"
                />
              </div>

              <div :class="$style.field">
                <label :class="$style.label">阴影</label>
                <el-input
                  :model-value="localSchema.style?.boxShadow ?? ''"
                  size="small"
                  placeholder="如: 0 2px 4px rgba(0,0,0,.1)"
                  @update:model-value="emitStyleUpdate('boxShadow', $event || undefined)"
                />
              </div>

              <div :class="$style.field">
                <label :class="$style.label">边框</label>
                <el-input
                  :model-value="localSchema.style?.border ?? ''"
                  size="small"
                  placeholder="如: 1px solid #dcdfe6"
                  @update:model-value="emitStyleUpdate('border', $event || undefined)"
                />
              </div>

              <div :class="$style.field">
                <label :class="$style.label">自定义类名</label>
                <el-input
                  :model-value="localSchema.style?.customClass ?? ''"
                  size="small"
                  placeholder="空格分隔多个类名"
                  @update:model-value="emitStyleUpdate('customClass', $event || undefined)"
                />
              </div>
            </div>
          </el-tab-pane>

          <!-- Tab 3: 数据配置 -->
          <el-tab-pane label="数据" name="data">
            <div :class="$style.tabContent">
              <!-- API-supported types: inline ApiConfig -->
              <template v-if="supportsApi">
                <ApiConfig
                  :api="localSchema.api"
                  @update:api="handleApiUpdate"
                  @generate-schema="handleGenerateSchema"
                />
              </template>

              <!-- search-list: List API + SearchFields + Columns + RowActions + Buttons -->
              <template v-else-if="isSearchListType">
                <!-- List API -->
                <div :class="$style.sectionTitle">列表 API</div>
                <div :class="$style.field">
                  <label :class="$style.label">URL</label>
                  <el-input
                    :model-value="localSchema?.listApi?.url"
                    size="small"
                    placeholder="/api/list"
                    @update:model-value="updateListApi('url', $event)"
                  />
                </div>
                <div :class="$style.field">
                  <label :class="$style.label">请求方法</label>
                  <el-select
                    :model-value="localSchema?.listApi?.method ?? 'get'"
                    size="small"
                    style="width: 100%"
                    @update:model-value="updateListApi('method', $event)"
                  >
                    <el-option label="GET" value="get" />
                    <el-option label="POST" value="post" />
                  </el-select>
                </div>
                <div :class="$style.field">
                  <label :class="$style.label">页码参数</label>
                  <el-input
                    :model-value="localSchema?.listApi?.pageParam ?? 'pageNum'"
                    size="small"
                    placeholder="pageNum"
                    @update:model-value="updateListApi('pageParam', $event)"
                  />
                </div>
                <div :class="$style.field">
                  <label :class="$style.label">条数参数</label>
                  <el-input
                    :model-value="localSchema?.listApi?.sizeParam ?? 'pageSize'"
                    size="small"
                    placeholder="pageSize"
                    @update:model-value="updateListApi('sizeParam', $event)"
                  />
                </div>
                <div :class="$style.field">
                  <label :class="$style.label">数据路径</label>
                  <el-input
                    :model-value="localSchema?.listApi?.dataPath ?? 'data'"
                    size="small"
                    placeholder="data"
                    @update:model-value="updateListApi('dataPath', $event)"
                  />
                </div>
                <div :class="$style.field">
                  <label :class="$style.label">总数路径</label>
                  <el-input
                    :model-value="localSchema?.listApi?.totalPath ?? 'total'"
                    size="small"
                    placeholder="total"
                    @update:model-value="updateListApi('totalPath', $event)"
                  />
                </div>
                <div :class="$style.field">
                  <label :class="$style.label">自动加载</label>
                  <el-switch
                    :model-value="localSchema?.listApi?.immediate ?? true"
                    @update:model-value="updateListApi('immediate', $event)"
                  />
                </div>

                <!-- Search Fields -->
                <el-divider />
                <div :class="$style.sectionTitle">搜索字段</div>
                <SearchFieldsEditor
                  :search-fields="localSchema.searchFields ?? []"
                  @update:search-fields="handleSearchFieldsUpdate"
                />

                <!-- Columns -->
                <el-divider />
                <div :class="$style.sectionTitle">列配置</div>
                <ColumnsEditor
                  :columns="localSchema.columns ?? []"
                  @update:columns="handleColumnsUpdate"
                />

                <!-- Row Actions -->
                <el-divider />
                <div :class="$style.sectionTitle">行操作</div>
                <RowActionsEditor
                  :row-actions="localSchema.rowActions ?? []"
                  @update:row-actions="handleRowActionsUpdate"
                />

                <!-- Buttons -->
                <el-divider />
                <div :class="$style.sectionTitle">按钮</div>
                <ButtonEditor
                  :buttons="localSchema.buttons ?? []"
                  @update:buttons="handleButtonsUpdate"
                />
              </template>

              <!-- No data config -->
              <div v-else :class="$style.hint">
                当前组件不支持数据配置
              </div>
            </div>
          </el-tab-pane>

          <!-- Tab 4: 事件&联动 -->
          <el-tab-pane name="events">
            <template #label>
              <span>事件&联动</span>
              <el-tag
                v-if="localSchema.linkages?.length"
                size="small"
                type="warning"
                :class="$style.tabTag"
              >
                {{ localSchema.linkages.length }}
              </el-tag>
            </template>
            <div :class="$style.tabContent">
              <template v-if="hasEventsConfig">
                <LinkageConfig
                  :linkages="localSchema.linkages ?? []"
                  :available-fields="availableFields"
                  @update:linkages="handleLinkageUpdate"
                />
              </template>
              <div v-else :class="$style.hint">
                当前组件不支持事件联动
              </div>
            </div>
          </el-tab-pane>

          <!-- Tab 5: 高级配置 -->
          <el-tab-pane label="高级" name="advanced">
            <div :class="$style.tabContent">
              <!-- 校验规则 -->
              <template v-if="!isLayoutType && !isButtonType">
                <div :class="$style.sectionTitle">校验规则</div>
                <RulesEditor
                  :rules="(localSchema.rules as import('element-plus').FormItemRule[] | undefined)"
                  @update:rules="handleRulesUpdate"
                />
                <el-divider />
              </template>

              <!-- 条件可见 -->
              <div :class="$style.field">
                <label :class="$style.label">条件可见</label>
                <el-input
                  :model-value="localSchema.visibleOn ?? ''"
                  size="small"
                  placeholder="表达式，如: status === 'active'"
                  @update:model-value="emitUpdate('visibleOn', $event || undefined)"
                />
              </div>

              <!-- 条件禁用 -->
              <div :class="$style.field">
                <label :class="$style.label">条件禁用</label>
                <el-input
                  :model-value="localSchema.disabledOn ?? ''"
                  size="small"
                  placeholder="表达式，如: readonly === true"
                  @update:model-value="emitUpdate('disabledOn', $event || undefined)"
                />
              </div>

              <!-- 条件必填 -->
              <div :class="$style.field">
                <label :class="$style.label">条件必填</label>
                <el-input
                  :model-value="localSchema.requiredOn ?? ''"
                  size="small"
                  placeholder="表达式，如: type === 'A'"
                  @update:model-value="emitUpdate('requiredOn', $event || undefined)"
                />
              </div>

              <!-- 只读模式 -->
              <div :class="$style.field">
                <label :class="$style.label">只读模式</label>
                <el-switch
                  :model-value="localSchema.readonly ?? false"
                  @update:model-value="emitUpdate('readonly', $event)"
                />
              </div>

              <el-divider />

              <!-- 权限角色 -->
              <div :class="$style.field">
                <label :class="$style.label">权限角色</label>
                <div :class="$style.tagList">
                  <el-tag
                    v-for="(role, rIdx) in (localSchema.permissionRoles ?? [])"
                    :key="rIdx"
                    closable
                    size="small"
                    :class="$style.tag"
                    @close="removePermissionRole(rIdx)"
                  >
                    {{ role }}
                  </el-tag>
                </div>
                <div :class="$style.tagInputRow">
                  <el-input
                    v-if="roleInputVisible"
                    v-model="roleInputValue"
                    size="small"
                    placeholder="角色名称"
                    @keyup.enter="addPermissionRole"
                    @blur="addPermissionRole"
                  />
                  <el-button
                    v-else
                    size="small"
                    :icon="Plus"
                    @click="roleInputVisible = true"
                  >
                    添加角色
                  </el-button>
                </div>
              </div>

              <el-divider />

              <!-- 自定义属性 -->
              <div :class="$style.field">
                <label :class="$style.label">自定义属性</label>
                <div v-for="(_, aKey) in (localSchema.customAttrs ?? {})" :key="aKey" :class="$style.attrRow">
                  <el-input :model-value="String(aKey)" disabled size="small" style="flex: 1" />
                  <el-input :model-value="localSchema.customAttrs![aKey]" disabled size="small" style="flex: 1" />
                  <el-button
                    type="danger"
                    :icon="Delete"
                    size="small"
                    text
                    @click="removeCustomAttr(String(aKey))"
                  />
                </div>
                <div :class="$style.attrRow">
                  <el-input v-model="attrKeyInput" size="small" placeholder="属性名" style="flex: 1" />
                  <el-input v-model="attrValueInput" size="small" placeholder="属性值" style="flex: 1" />
                  <el-button
                    type="primary"
                    :icon="Plus"
                    size="small"
                    text
                    @click="addCustomAttr"
                  />
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-scrollbar>

      <!-- Footer: fixed at bottom -->
      <div :class="$style.footer">
        <el-collapse v-model="jsonPreviewOpen">
          <el-collapse-item title="JSON 预览" name="json">
            <el-input
              type="textarea"
              :model-value="JSON.stringify(localSchema, null, 2)"
              :rows="8"
              readonly
              size="small"
            />
          </el-collapse-item>
        </el-collapse>
        <div :class="$style.footerActions">
          <el-button size="small" :icon="CopyDocument" @click="copyJson">复制 JSON</el-button>
          <el-button size="small" :icon="RefreshRight" @click="resetDefaults">恢复默认</el-button>
        </div>
      </div>
    </template>

    <div v-else :class="$style.empty">
      请在画布上选择一个组件来编辑其属性
    </div>
  </div>
</template>

<style module lang="scss">
.panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.header {
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #1a1a2e;
  flex-shrink: 0;
  border-bottom: 1px solid #f0f2f5;
}

.body {
  flex: 1;
  min-height: 0;
  padding: 4px 0;
}

.tabs {
  padding: 0 12px;
}

.tabContent {
  padding: 8px 0;
}

.field {
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
}

.label {
  display: block;
  font-size: 11px;
  font-weight: 500;
  color: #909399;
  margin-bottom: 4px;
}

.sectionTitle {
  font-size: 12px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.hint {
  text-align: center;
  color: #c0c4cc;
  font-size: 13px;
  padding: 32px 16px;
}

.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  color: #c0c4cc;
  font-size: 13px;
}

.validation {
  margin: 0 12px 8px;
}

.validationItem {
  font-size: 11px;
  padding: 6px 10px;
  border-radius: 4px;
  margin-bottom: 4px;
  line-height: 1.4;
}

.validationError {
  background: #fef0f0;
  color: #f56c6c;
  border-left: 2px solid #f56c6c;
}

.validationWarning {
  background: #fdf6ec;
  color: #e6a23c;
  border-left: 2px solid #e6a23c;
}

.tabTag {
  margin-left: 4px;
  vertical-align: middle;
}

.tagList {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 4px;
}

.tag {
  margin: 0;
}

.tagInputRow {
  margin-top: 4px;
}

.attrRow {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-bottom: 4px;
}

.footer {
  flex-shrink: 0;
  border-top: 1px solid #f0f2f5;
  padding: 8px 12px;
}

.footerActions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.dialogEditBtn {
  width: 100%;
}

.dialogHint {
  margin-top: 4px;
  font-size: 11px;
  color: #c0c4cc;
  line-height: 1.4;
}

// Element Plus overrides
:global(.el-tabs--card > .el-tabs__header .el-tabs__nav) {
  border-radius: 4px 4px 0 0;
}
:global(.el-tabs--card > .el-tabs__header .el-tabs__item) {
  font-size: 12px;
  padding: 0 12px;
  height: 30px;
  line-height: 30px;
}
:global(.el-tabs__content) {
  padding: 0;
}
:global(.el-collapse-item__header) {
  font-size: 12px;
  height: 32px;
  line-height: 32px;
}
:global(.el-collapse-item__content) {
  padding-bottom: 8px;
}
</style>
