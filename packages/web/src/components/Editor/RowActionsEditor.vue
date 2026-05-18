<script setup lang="ts">
/**
 * RowActionsEditor -- CRUD editor for SearchListRowAction[].
 *
 * List-based editor for search-list row operation buttons.
 * Conditional fields shown based on action type (emit/api/navigate/dialog).
 */
import { Plus, Delete, Top, Bottom } from '@element-plus/icons-vue'
import type { SearchListRowAction } from '@/components/FormGrid/types'

const props = defineProps<{
  rowActions: SearchListRowAction[]
}>()

const emit = defineEmits<{
  'update:rowActions': [actions: SearchListRowAction[]]
}>()

const actionTypeOptions = [
  { label: 'Emit', value: 'emit' as const },
  { label: 'API', value: 'api' as const },
  { label: 'Navigate', value: 'navigate' as const },
  { label: 'Dialog', value: 'dialog' as const },
]

const buttonTypeOptions = [
  { label: 'Default', value: '' as const },
  { label: 'Primary', value: 'primary' as const },
  { label: 'Success', value: 'success' as const },
  { label: 'Warning', value: 'warning' as const },
  { label: 'Danger', value: 'danger' as const },
  { label: 'Info', value: 'info' as const },
]

const apiMethodOptions = [
  { label: 'GET', value: 'get' as const },
  { label: 'POST', value: 'post' as const },
  { label: 'PUT', value: 'put' as const },
  { label: 'DELETE', value: 'delete' as const },
]

function addAction() {
  const action: SearchListRowAction = {
    label: '',
    buttonType: '' as SearchListRowAction['buttonType'],
    type: 'emit',
    emitEvent: '',
  }
  emit('update:rowActions', [...props.rowActions, action])
}

function removeAction(index: number) {
  emit('update:rowActions', props.rowActions.filter((_, i) => i !== index))
}

function moveUp(index: number) {
  if (index === 0) return
  const updated = [...props.rowActions]
  ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
  emit('update:rowActions', updated)
}

function moveDown(index: number) {
  if (index >= props.rowActions.length - 1) return
  const updated = [...props.rowActions]
  ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
  emit('update:rowActions', updated)
}

function updateAction<K extends keyof SearchListRowAction>(index: number, field: K, value: SearchListRowAction[K]) {
  const updated = props.rowActions.map((a, i) =>
    i === index ? { ...a, [field]: value } : a,
  )
  emit('update:rowActions', updated)
}

function parseDialogSchemaJson(text: string): import('@/components/FormGrid/types').FormSchemaItem[] | undefined {
  if (!text.trim()) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function parseNavigateQuery(text: string): Record<string, string> | undefined {
  if (!text.trim()) return undefined
  try {
    return JSON.parse(text) as Record<string, string>
  } catch {
    return undefined
  }
}
</script>

<template>
  <div class="row-actions-editor">
    <div v-if="rowActions.length === 0" class="row-actions-editor__empty">
      No row actions configured.
    </div>

    <div
      v-for="(action, idx) in rowActions"
      :key="idx"
      class="row-actions-editor__item"
    >
      <div class="row-actions-editor__item-header">
        <span class="row-actions-editor__item-title">Action {{ idx + 1 }}</span>
        <div class="row-actions-editor__item-actions">
          <el-button
            :icon="Top"
            size="small"
            text
            :disabled="idx === 0"
            @click="moveUp(idx)"
          />
          <el-button
            :icon="Bottom"
            size="small"
            text
            :disabled="idx === rowActions.length - 1"
            @click="moveDown(idx)"
          />
          <el-button
            type="danger"
            :icon="Delete"
            size="small"
            text
            @click="removeAction(idx)"
          />
        </div>
      </div>

      <div class="row-actions-editor__field">
        <label class="row-actions-editor__label">Label</label>
        <el-input
          :model-value="action.label"
          size="small"
          placeholder="Button text"
          @update:model-value="updateAction(idx, 'label', $event)"
        />
      </div>

      <div class="row-actions-editor__field">
        <label class="row-actions-editor__label">Button Type</label>
        <el-select
          :model-value="action.buttonType ?? ''"
          size="small"
          style="width: 100%"
          @update:model-value="updateAction(idx, 'buttonType', $event)"
        >
          <el-option
            v-for="opt in buttonTypeOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>

      <div class="row-actions-editor__field">
        <label class="row-actions-editor__label">Icon</label>
        <el-input
          :model-value="action.icon ?? ''"
          size="small"
          placeholder="e.g. Edit or EditPen"
          @update:model-value="updateAction(idx, 'icon', $event || undefined)"
        />
      </div>

      <div class="row-actions-editor__field">
        <label class="row-actions-editor__label">Action Type</label>
        <el-select
          :model-value="action.type"
          size="small"
          style="width: 100%"
          @update:model-value="updateAction(idx, 'type', $event)"
        >
          <el-option
            v-for="opt in actionTypeOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>

      <!-- Emit type: event name -->
      <div v-if="action.type === 'emit'" class="row-actions-editor__field">
        <label class="row-actions-editor__label">Emit Event</label>
        <el-input
          :model-value="action.emitEvent ?? ''"
          size="small"
          placeholder="e.g. edit"
          @update:model-value="updateAction(idx, 'emitEvent', $event || undefined)"
        />
      </div>

      <!-- API type: url and method -->
      <template v-if="action.type === 'api'">
        <div class="row-actions-editor__field">
          <label class="row-actions-editor__label">API URL</label>
          <el-input
            :model-value="action.apiUrl ?? ''"
            size="small"
            placeholder="/api/item/:id"
            @update:model-value="updateAction(idx, 'apiUrl', $event || undefined)"
          />
        </div>
        <div class="row-actions-editor__field">
          <label class="row-actions-editor__label">API Method</label>
          <el-select
            :model-value="action.apiMethod ?? 'get'"
            size="small"
            style="width: 100%"
            @update:model-value="updateAction(idx, 'apiMethod', $event)"
          >
            <el-option
              v-for="opt in apiMethodOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </div>
      </template>

      <!-- Navigate type: path + query -->
      <div v-if="action.type === 'navigate'" class="row-actions-editor__field">
        <label class="row-actions-editor__label">Navigate Path</label>
        <el-input
          :model-value="action.navigatePath ?? ''"
          size="small"
          placeholder="/detail/:id"
          @update:model-value="updateAction(idx, 'navigatePath', $event || undefined)"
        />
      </div>
      <div v-if="action.type === 'navigate'" class="row-actions-editor__field">
        <label class="row-actions-editor__label">Navigate Query (JSON)</label>
        <el-input
          :model-value="action.navigateQuery ? JSON.stringify(action.navigateQuery, null, 2) : ''"
          type="textarea"
          :rows="2"
          size="small"
          placeholder='{"from":"list"}'
          @update:model-value="updateAction(idx, 'navigateQuery', parseNavigateQuery($event))"
        />
      </div>

      <!-- Dialog type: title, width, and schema -->
      <template v-if="action.type === 'dialog'">
        <div class="row-actions-editor__field">
          <label class="row-actions-editor__label">Dialog Title</label>
          <el-input
            :model-value="action.dialogTitle ?? ''"
            size="small"
            placeholder="Dialog title"
            @update:model-value="updateAction(idx, 'dialogTitle', $event || undefined)"
          />
        </div>
        <div class="row-actions-editor__field">
          <label class="row-actions-editor__label">Dialog Width</label>
          <el-input
            :model-value="action.dialogWidth ?? ''"
            size="small"
            placeholder="e.g. 600px"
            @update:model-value="updateAction(idx, 'dialogWidth', $event || undefined)"
          />
        </div>
        <div class="row-actions-editor__field">
          <label class="row-actions-editor__label">Dialog Schema (JSON)</label>
          <el-input
            :model-value="action.dialogSchema ? JSON.stringify(action.dialogSchema, null, 2) : ''"
            type="textarea"
            :rows="4"
            size="small"
            placeholder='[{"type":"input","field":"name","label":"Name"}]'
            @update:model-value="updateAction(idx, 'dialogSchema', $event ? parseDialogSchemaJson($event) : undefined)"
          />
        </div>
      </template>

      <div class="row-actions-editor__field">
        <label class="row-actions-editor__label">Confirm Message</label>
        <el-input
          :model-value="action.confirm ?? ''"
          size="small"
          placeholder="e.g. Are you sure?"
          @update:model-value="updateAction(idx, 'confirm', $event || undefined)"
        />
      </div>

      <div class="row-actions-editor__field">
        <label class="row-actions-editor__label">Visible On (expression)</label>
        <el-input
          :model-value="action.visibleOn ?? ''"
          size="small"
          placeholder="e.g. status === 'active'"
          @update:model-value="updateAction(idx, 'visibleOn', $event || undefined)"
        />
      </div>

      <div class="row-actions-editor__field">
        <label class="row-actions-editor__label">Disabled On (expression)</label>
        <el-input
          :model-value="action.disabledOn ?? ''"
          size="small"
          placeholder="e.g. status === 'closed'"
          @update:model-value="updateAction(idx, 'disabledOn', $event || undefined)"
        />
      </div>
    </div>

    <el-button
      type="primary"
      :icon="Plus"
      size="small"
      plain
      style="width: 100%; margin-top: 8px"
      @click="addAction"
    >
      Add Row Action
    </el-button>
  </div>
</template>

<style scoped lang="scss">
.row-actions-editor {
  &__empty {
    text-align: center;
    color: #909399;
    font-size: 12px;
    padding: 12px 0;
  }

  &__item {
    border: 1px solid #ebeef5;
    border-radius: 4px;
    padding: 10px;
    margin-bottom: 10px;
    background: #fafafa;
  }

  &__item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  &__item-title {
    font-size: 12px;
    font-weight: 600;
    color: #303133;
  }

  &__item-actions {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  &__field {
    margin-bottom: 8px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__label {
    display: block;
    font-size: 11px;
    font-weight: 500;
    color: #606266;
    margin-bottom: 3px;
  }
}
</style>
