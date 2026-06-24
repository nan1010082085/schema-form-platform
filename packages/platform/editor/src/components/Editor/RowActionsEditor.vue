<script setup lang="ts">
/**
 * RowActionsEditor -- CRUD editor for SearchListRowAction[].
 *
 * List-based editor for search-list row operation buttons.
 * Conditional fields shown based on action type (emit/api/navigate/dialog).
 */
import type { SearchListRowAction } from '@/components/WidgetRenderer/types'
import AppIcon from '@schema-form/platform-shared/components/common/AppIcon.vue'
import styles from './RowActionsEditor.module.scss'

const props = defineProps<{
  rowActions: SearchListRowAction[]
}>()

const emit = defineEmits<{
  'update:rowActions': [actions: SearchListRowAction[]]
}>()

const actionTypeOptions = [
  { label: '触发事件', value: 'emit' as const },
  { label: '接口请求', value: 'api' as const },
  { label: '页面跳转', value: 'navigate' as const },
  { label: '弹窗', value: 'dialog' as const },
]

const buttonTypeOptions = [
  { label: '默认', value: '' as const },
  { label: '主要', value: 'primary' as const },
  { label: '成功', value: 'success' as const },
  { label: '警告', value: 'warning' as const },
  { label: '危险', value: 'danger' as const },
  { label: '信息', value: 'info' as const },
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

function parseDialogSchemaJson(text: string): import('@/components/WidgetRenderer/types').PartialWidget[] | undefined {
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
  <div :class="styles['row-actions-editor']">
    <div v-if="rowActions.length === 0" :class="styles['row-actions-editor__empty']">
      未配置行操作。
    </div>

    <div
      v-for="(action, idx) in rowActions"
      :key="idx"
      :class="styles['row-actions-editor__item']"
    >
      <div :class="styles['row-actions-editor__item-header']">
        <span :class="styles['row-actions-editor__item-title']">操作 {{ idx + 1 }}</span>
        <div :class="styles['row-actions-editor__item-actions']">
          <el-button
            size="small"
            text
            :disabled="idx === 0"
            @click="moveUp(idx)"
          >
            <AppIcon name="arrow-up" />
          </el-button>
          <el-button
            size="small"
            text
            :disabled="idx === rowActions.length - 1"
            @click="moveDown(idx)"
          >
            <AppIcon name="arrow-down" />
          </el-button>
          <el-button
            type="danger"
            size="small"
            text
            @click="removeAction(idx)"
          >
            <AppIcon name="delete" />
          </el-button>
        </div>
      </div>

      <div :class="styles['row-actions-editor__field']">
        <label :class="styles['row-actions-editor__label']">标签</label>
        <el-input
          :model-value="action.label"
          size="small"
          placeholder="按钮文字"
          @update:model-value="updateAction(idx, 'label', $event)"
        />
      </div>

      <div :class="styles['row-actions-editor__field']">
        <label :class="styles['row-actions-editor__label']">按钮类型</label>
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

      <div :class="styles['row-actions-editor__field']">
        <label :class="styles['row-actions-editor__label']">图标</label>
        <el-input
          :model-value="action.icon ?? ''"
          size="small"
          placeholder="例如: Edit 或 EditPen"
          @update:model-value="updateAction(idx, 'icon', $event || undefined)"
        />
      </div>

      <div :class="styles['row-actions-editor__field']">
        <label :class="styles['row-actions-editor__label']">操作类型</label>
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
      <div v-if="action.type === 'emit'" :class="styles['row-actions-editor__field']">
        <label :class="styles['row-actions-editor__label']">触发事件</label>
        <el-input
          :model-value="action.emitEvent ?? ''"
          size="small"
          placeholder="例如: edit"
          @update:model-value="updateAction(idx, 'emitEvent', $event || undefined)"
        />
      </div>

      <!-- API type: url and method -->
      <template v-if="action.type === 'api'">
        <div :class="styles['row-actions-editor__field']">
          <label :class="styles['row-actions-editor__label']">接口地址</label>
          <el-input
            :model-value="action.apiUrl ?? ''"
            size="small"
            placeholder="/api/item/:id"
            @update:model-value="updateAction(idx, 'apiUrl', $event || undefined)"
          />
        </div>
        <div :class="styles['row-actions-editor__field']">
          <label :class="styles['row-actions-editor__label']">请求方法</label>
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
      <div v-if="action.type === 'navigate'" :class="styles['row-actions-editor__field']">
        <label :class="styles['row-actions-editor__label']">跳转路径</label>
        <el-input
          :model-value="action.navigatePath ?? ''"
          size="small"
          placeholder="/detail/:id"
          @update:model-value="updateAction(idx, 'navigatePath', $event || undefined)"
        />
      </div>
      <div v-if="action.type === 'navigate'" :class="styles['row-actions-editor__field']">
        <label :class="styles['row-actions-editor__label']">跳转参数 (JSON)</label>
        <el-input
          type="textarea"
          :model-value="action.navigateQuery ? JSON.stringify(action.navigateQuery, null, 2) : ''"
          :rows="2"
          placeholder='{"from":"list"}'
          @update:model-value="updateAction(idx, 'navigateQuery', parseNavigateQuery($event))"
        />
      </div>

      <!-- Dialog type: title, width, and schema -->
      <template v-if="action.type === 'dialog'">
        <div :class="styles['row-actions-editor__field']">
          <label :class="styles['row-actions-editor__label']">弹窗标题</label>
          <el-input
            :model-value="action.dialogTitle ?? ''"
            size="small"
            placeholder="弹窗标题"
            @update:model-value="updateAction(idx, 'dialogTitle', $event || undefined)"
          />
        </div>
        <div :class="styles['row-actions-editor__field']">
          <label :class="styles['row-actions-editor__label']">弹窗宽度</label>
          <el-input
            :model-value="action.dialogWidth ?? ''"
            size="small"
            placeholder="例如: 600px"
            @update:model-value="updateAction(idx, 'dialogWidth', $event || undefined)"
          />
        </div>
        <div :class="styles['row-actions-editor__field']">
          <label :class="styles['row-actions-editor__label']">弹窗 Schema (JSON)</label>
          <el-input
            type="textarea"
            :model-value="action.dialogSchema ? JSON.stringify(action.dialogSchema, null, 2) : ''"
            :rows="4"
            placeholder='[{"type":"input","field":"name","label":"Name"}]'
            @update:model-value="updateAction(idx, 'dialogSchema', $event ? parseDialogSchemaJson($event) : undefined)"
          />
        </div>
      </template>

      <div :class="styles['row-actions-editor__field']">
        <label :class="styles['row-actions-editor__label']">确认提示</label>
        <el-input
          :model-value="action.confirm ?? ''"
          size="small"
          placeholder="例如: 确定要执行吗？"
          @update:model-value="updateAction(idx, 'confirm', $event || undefined)"
        />
      </div>

      <div :class="styles['row-actions-editor__field']">
        <label :class="styles['row-actions-editor__label']">显示条件 (表达式)</label>
        <el-input
          :model-value="action.visibleOn ?? ''"
          size="small"
          placeholder="例如: status === 'active'"
          @update:model-value="updateAction(idx, 'visibleOn', $event || undefined)"
        />
      </div>

      <div :class="styles['row-actions-editor__field']">
        <label :class="styles['row-actions-editor__label']">禁用条件 (表达式)</label>
        <el-input
          :model-value="action.disabledOn ?? ''"
          size="small"
          placeholder="例如: status === 'closed'"
          @update:model-value="updateAction(idx, 'disabledOn', $event || undefined)"
        />
      </div>
    </div>

    <el-button
      type="primary"
      size="small"
      plain
      style="width: 100%; margin-top: 8px"
      @click="addAction"
    >
      <AppIcon name="plus" />
      添加行操作
    </el-button>
  </div>
</template>

