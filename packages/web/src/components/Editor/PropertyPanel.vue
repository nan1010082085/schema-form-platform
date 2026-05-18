<script setup lang="ts">
/**
 * PropertyPanel -- Right-side property panel (Sprint 8 refactor)
 *
 * Sectioned layout: Basic Properties / Linkage Config / API Config / JSON Preview
 */
import { computed, watch, ref } from 'vue'
import PropertySection from '@/components/Editor/PropertySection.vue'
import LinkageConfig from '@/components/Editor/LinkageConfig.vue'
import ApiConfig from '@/components/Editor/ApiConfig.vue'
import ColumnsEditor from '@/components/Editor/ColumnsEditor.vue'
import SearchFieldsEditor from '@/components/Editor/SearchFieldsEditor.vue'
import RowActionsEditor from '@/components/Editor/RowActionsEditor.vue'
import ButtonEditor from '@/components/Editor/ButtonEditor.vue'
import RulesEditor from '@/components/Editor/RulesEditor.vue'
import { validateSchema } from '@/utils/schemaValidate'
import type { FormSchemaItem, SchemaLinkage, SchemaApiConfig, ListApiConfig, SearchFieldSchema, SearchListColumnSchema, SearchListRowAction, SchemaButtonConfig } from '@/components/FormGrid/types'

const props = defineProps<{
  schema: FormSchemaItem | null
  /** Full schema tree for collecting available field names */
  allSchema: FormSchemaItem[]
}>()

const emit = defineEmits<{
  'update:schema': [schema: FormSchemaItem]
  'generate-schema': [schema: import('@/components/FormGrid/types').FormSchemaItem[]]
}>()

// Local editing copy to avoid mutating props directly
const localSchema = ref<FormSchemaItem | null>(null)

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

// Layout type detection (no field binding needed)
const isLayoutType = computed(() => {
  const t = localSchema.value?.type
  return t === 'grid-row' || t === 'grid-col' || t === 'page' || t === 'toolbar'
    || t === 'card' || t === 'title' || t === 'divider' || t === 'spacer'
    || t === 'steps' || t === 'tabs' || t === 'dialog'
})

const isDialogType = computed(() => localSchema.value?.type === 'dialog')

// Whether type supports span
const supportsSpan = computed(() => localSchema.value?.type === 'grid-col')

// Whether type is a button or toolbar-buttons
const isButtonType = computed(() => localSchema.value?.type === 'button-list' || localSchema.value?.type === 'toolbar-buttons')

// Whether type is search-list
const isSearchListType = computed(() => localSchema.value?.type === 'search-list')

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

// ---- Real-time validation (SP18-005) ----
const validationResult = computed(() => {
  if (!localSchema.value) return null
  return validateSchema([localSchema.value])
})
</script>

<template>
  <div class="property-panel">
    <div class="property-panel__header">Properties</div>
    <div v-if="localSchema" class="property-panel__body">

      <!-- Real-time validation alerts -->
      <div v-if="validationResult?.errors.length" class="property-panel__validation">
        <div
          v-for="(err, eIdx) in validationResult.errors"
          :key="eIdx"
          class="property-panel__validation-item"
          :class="`property-panel__validation-item--${err.severity}`"
        >
          {{ err.message }}
        </div>
      </div>

      <!-- Section 1: Basic Properties -->
      <PropertySection title="Basic Properties" :default-open="true">
        <!-- Type (read-only) -->
        <div class="property-panel__field">
          <label class="property-panel__label">Type</label>
          <el-input :model-value="localSchema.type" disabled size="small" />
        </div>

        <!-- Field -->
        <div v-if="!isLayoutType && !isButtonType" class="property-panel__field">
          <label class="property-panel__label">Field</label>
          <el-input
            :model-value="localSchema.field"
            size="small"
            placeholder="formData field name"
            @update:model-value="emitUpdate('field', $event)"
          />
        </div>

        <!-- Label -->
        <div class="property-panel__field">
          <label class="property-panel__label">Label</label>
          <el-input
            :model-value="localSchema.label"
            size="small"
            placeholder="Display label"
            @update:model-value="emitUpdate('label', $event)"
          />
        </div>

        <!-- Span (grid-col only) -->
        <div v-if="supportsSpan" class="property-panel__field">
          <label class="property-panel__label">Span</label>
          <el-input-number
            :model-value="(localSchema.span as number) ?? 24"
            :min="1"
            :max="24"
            size="small"
            style="width: 100%"
            @update:model-value="emitUpdate('span', $event)"
          />
        </div>

        <!-- Hidden -->
        <div class="property-panel__field">
          <label class="property-panel__label">Hidden</label>
          <el-switch
            :model-value="localSchema.hidden ?? false"
            @update:model-value="emitUpdate('hidden', $event)"
          />
        </div>

        <!-- Placeholder -->
        <div
          v-if="['input', 'number', 'select', 'textarea', 'date', 'date-range'].includes(localSchema.type)"
          class="property-panel__field"
        >
          <label class="property-panel__label">Placeholder</label>
          <el-input
            :model-value="(localSchema.props as Record<string, unknown>)?.placeholder as string ?? ''"
            size="small"
            @update:model-value="emitUpdate('props', { ...localSchema.props, placeholder: $event })"
          />
        </div>

        <!-- Width -->
        <div class="property-panel__field">
          <label class="property-panel__label">Width</label>
          <el-input
            :model-value="localSchema.width"
            size="small"
            placeholder="e.g. 200px or 50%"
            @update:model-value="emitUpdate('width', $event)"
          />
        </div>
      </PropertySection>

      <!-- Section: List API (search-list only) -->
      <PropertySection v-if="isSearchListType" title="List API" :default-open="true">
        <div class="property-panel__form">
          <div class="property-panel__field">
            <label class="property-panel__label">URL</label>
            <el-input
              :model-value="localSchema?.listApi?.url"
              size="small"
              placeholder="/api/list"
              @update:model-value="updateListApi('url', $event)"
            />
          </div>
          <div class="property-panel__field">
            <label class="property-panel__label">Method</label>
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
          <div class="property-panel__field">
            <label class="property-panel__label">Page Param</label>
            <el-input
              :model-value="localSchema?.listApi?.pageParam ?? 'pageNum'"
              size="small"
              placeholder="pageNum"
              @update:model-value="updateListApi('pageParam', $event)"
            />
          </div>
          <div class="property-panel__field">
            <label class="property-panel__label">Size Param</label>
            <el-input
              :model-value="localSchema?.listApi?.sizeParam ?? 'pageSize'"
              size="small"
              placeholder="pageSize"
              @update:model-value="updateListApi('sizeParam', $event)"
            />
          </div>
          <div class="property-panel__field">
            <label class="property-panel__label">Data Path</label>
            <el-input
              :model-value="localSchema?.listApi?.dataPath ?? 'data'"
              size="small"
              placeholder="data"
              @update:model-value="updateListApi('dataPath', $event)"
            />
          </div>
          <div class="property-panel__field">
            <label class="property-panel__label">Total Path</label>
            <el-input
              :model-value="localSchema?.listApi?.totalPath ?? 'total'"
              size="small"
              placeholder="total"
              @update:model-value="updateListApi('totalPath', $event)"
            />
          </div>
          <div class="property-panel__field">
            <label class="property-panel__label">Auto Load</label>
            <el-switch
              :model-value="localSchema?.listApi?.immediate ?? true"
              @update:model-value="updateListApi('immediate', $event)"
            />
          </div>
        </div>
      </PropertySection>

      <!-- Section: Search Fields (search-list only) -->
      <PropertySection v-if="isSearchListType" title="Search Fields" :default-open="false">
        <SearchFieldsEditor
          :search-fields="localSchema.searchFields ?? []"
          @update:search-fields="handleSearchFieldsUpdate"
        />
      </PropertySection>

      <!-- Section: Columns (search-list only) -->
      <PropertySection v-if="isSearchListType" title="Columns" :default-open="false">
        <ColumnsEditor
          :columns="localSchema.columns ?? []"
          @update:columns="handleColumnsUpdate"
        />
      </PropertySection>

      <!-- Section: Row Actions (search-list only) -->
      <PropertySection v-if="isSearchListType" title="Row Actions" :default-open="false">
        <RowActionsEditor
          :row-actions="localSchema.rowActions ?? []"
          @update:row-actions="handleRowActionsUpdate"
        />
      </PropertySection>

      <!-- Section: Buttons (search-list toolbar buttons) -->
      <PropertySection v-if="isSearchListType" title="Buttons" :default-open="false">
        <ButtonEditor
          :buttons="localSchema.buttons ?? []"
          @update:buttons="handleButtonsUpdate"
        />
      </PropertySection>

      <!-- Section: Buttons (button-list / toolbar-buttons) -->
      <PropertySection v-if="isButtonType" title="Buttons" :default-open="true">
        <ButtonEditor
          :buttons="localSchema.buttons ?? []"
          @update:buttons="handleButtonsUpdate"
        />
      </PropertySection>

      <!-- Section: Dialog (dialog type only) -->
      <PropertySection v-if="isDialogType" title="Dialog" :default-open="true">
        <div class="property-panel__field">
          <label class="property-panel__label">Title</label>
          <el-input
            :model-value="(localSchema.props as Record<string, unknown>)?.dialogTitle as string ?? ''"
            size="small"
            placeholder="Dialog title"
            @update:model-value="emitUpdate('props', { ...localSchema.props, dialogTitle: $event })"
          />
        </div>
        <div class="property-panel__field">
          <label class="property-panel__label">Width</label>
          <el-input
            :model-value="(localSchema.props as Record<string, unknown>)?.dialogWidth as string ?? '994px'"
            size="small"
            placeholder="994px"
            @update:model-value="emitUpdate('props', { ...localSchema.props, dialogWidth: $event })"
          />
        </div>
        <div class="property-panel__field">
          <label class="property-panel__label">Dialog Schema (JSON)</label>
          <el-input
            :model-value="(localSchema.props as Record<string, unknown>)?.dialogSchemaText as string ?? ''"
            type="textarea"
            :rows="6"
            size="small"
            placeholder='[{"type":"input","field":"name","label":"Name"}]'
            @update:model-value="emitUpdate('props', { ...localSchema.props, dialogSchemaText: $event })"
          />
        </div>
      </PropertySection>

      <!-- Section: Validation Rules (form components only) -->
      <PropertySection
        v-if="!isLayoutType && !isButtonType"
        title="Validation Rules"
        :default-open="false"
      >
        <RulesEditor
          :rules="(localSchema.rules as import('element-plus').FormItemRule[] | undefined)"
          @update:rules="handleRulesUpdate"
        />
      </PropertySection>

      <!-- Section 2: Linkage Config (form components only) -->
      <PropertySection
        v-if="!isLayoutType && !isButtonType"
        title="Linkage Config"
        :default-open="false"
      >
        <LinkageConfig
          :linkages="localSchema.linkages ?? []"
          :available-fields="availableFields"
          @update:linkages="handleLinkageUpdate"
        />
      </PropertySection>

      <!-- Section 3: API Config (components with dynamic options) -->
      <PropertySection
        v-if="supportsApi"
        title="API Config"
        :default-open="false"
      >
        <ApiConfig
          :api="localSchema.api"
          @update:api="handleApiUpdate"
          @generate-schema="handleGenerateSchema"
        />
      </PropertySection>

      <!-- Section 4: JSON Preview -->
      <PropertySection title="JSON Preview" :default-open="false">
        <el-input
          type="textarea"
          :model-value="JSON.stringify(localSchema, null, 2)"
          :rows="8"
          readonly
          size="small"
        />
      </PropertySection>
    </div>

    <div v-else class="property-panel__empty">
      Select a component on the canvas to edit its properties.
    </div>
  </div>
</template>

<style scoped lang="scss">
.property-panel {
  width: 300px;
  background: #fff;
  border-left: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  overflow-y: auto;

  &__header {
    padding: 16px;
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    border-bottom: 1px solid #e4e7ed;
    flex-shrink: 0;
  }

  &__body {
    flex: 1;
    overflow-y: auto;
  }

  &__field {
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    color: #606266;
    margin-bottom: 4px;
  }

  &__hint {
    margin: 0;
    padding: 8px 0;
    font-size: 12px;
    color: #909399;
    font-style: italic;
  }

  &__empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px;
    text-align: center;
    color: #909399;
    font-size: 14px;
  }

  &__validation {
    margin-bottom: 12px;
  }

  &__validation-item {
    font-size: 11px;
    padding: 4px 8px;
    border-radius: 4px;
    margin-bottom: 4px;
    line-height: 1.4;

    &--error {
      background: #fef0f0;
      color: #f56c6c;
      border: 1px solid #fde2e2;
    }

    &--warning {
      background: #fdf6ec;
      color: #e6a23c;
      border: 1px solid #faecd8;
    }
  }
}
</style>
