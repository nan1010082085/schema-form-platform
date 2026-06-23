<script setup lang="ts">
/**
 * AdvancedColumnsEditor -- 高级表格列配置编辑器
 *
 * 支持：render 模式、tooltip、filterable、buttons 行内按钮、linkEvent、colorMap、api、align、fixed 等
 */
import { ref } from 'vue'
import type { AdvancedTableColumn, ActionButton } from '@/widgets/advanced-table/config'
import type { SchemaApiConfig } from '@/components/WidgetRenderer/types'
import AppIcon from '@schema-form/shared-components/common/AppIcon.vue'
import ActionListEditor from '@/components/Editor/ActionListEditor.vue'
import type { ActionTypeOption } from '@/components/Editor/ActionListEditor.vue'

const props = defineProps<{
  columns: AdvancedTableColumn[]
}>()

const emit = defineEmits<{
  'update:columns': [columns: AdvancedTableColumn[]]
}>()

// ---- Options ----

const renderOptions = [
  { label: '文本', value: 'text' },
  { label: '链接', value: 'link' },
  { label: '标签', value: 'tag' },
  { label: '徽章', value: 'badge' },
  { label: '图片', value: 'image' },
  { label: '按钮组', value: 'buttons' },
  { label: '提示', value: 'tooltip' },
  { label: '自定义', value: 'custom' },
]

const fixedOptions = [
  { label: '无', value: undefined as 'left' | 'right' | undefined },
  { label: '左', value: 'left' as const },
  { label: '右', value: 'right' as const },
]

const alignOptions = [
  { label: '左', value: 'left' },
  { label: '居中', value: 'center' },
  { label: '右', value: 'right' },
]

const buttonTypeOptions = [
  { label: '默认', value: '' },
  { label: '主要', value: 'primary' },
  { label: '成功', value: 'success' },
  { label: '警告', value: 'warning' },
  { label: '危险', value: 'danger' },
  { label: '信息', value: 'info' },
  { label: '文字', value: 'text' },
]

const actionTypeOptions: ActionTypeOption[] = [
  { label: '显示', value: 'show' },
  { label: '隐藏', value: 'hide' },
  { label: '打开弹窗', value: 'open-dialog' },
  { label: '关闭弹窗', value: 'close-dialog' },
  { label: '切换标签', value: 'switch-tab' },
  { label: '设置值', value: 'set-value' },
  { label: '提交表单', value: 'submit' },
  { label: '重置表单', value: 'reset' },
  { label: '触发事件', value: 'emit' },
  { label: '触发组件事件', value: 'trigger-event' },
  { label: '设置变量', value: 'set-variable' },
  { label: '调用 API', value: 'api' },
  { label: '路由跳转', value: 'navigate' },
  { label: '发送消息', value: 'post-message' },
  { label: '复制文本', value: 'copy' },
  { label: '刷新数据', value: 'refresh' },
  { label: '关闭页签', value: 'close-tab' },
  { label: '发起流程', value: 'startFlow' },
  { label: '结束流程', value: 'endFlow' },
]

// ---- Column CRUD ----

function addColumn() {
  const col: AdvancedTableColumn = {
    prop: '',
    label: '',
    render: 'text',
    sortable: false,
    align: 'left',
    fixed: undefined,
  }
  emit('update:columns', [...props.columns, col])
}

function removeColumn(index: number) {
  emit('update:columns', props.columns.filter((_, i) => i !== index))
}

function moveUp(index: number) {
  if (index === 0) return
  const updated = [...props.columns]
  ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
  emit('update:columns', updated)
}

function moveDown(index: number) {
  if (index >= props.columns.length - 1) return
  const updated = [...props.columns]
  ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
  emit('update:columns', updated)
}

function updateColumn<K extends keyof AdvancedTableColumn>(index: number, field: K, value: AdvancedTableColumn[K]) {
  const updated = props.columns.map((col, i) =>
    i === index ? { ...col, [field]: value } : col,
  )
  emit('update:columns', updated)
}

// ---- ColorMap helpers ----

function updateColorMap(index: number, text: string) {
  if (!text.trim()) {
    updateColumn(index, 'colorMap', undefined)
    return
  }
  try {
    updateColumn(index, 'colorMap', JSON.parse(text))
  } catch { /* keep until valid */ }
}

function colorMapToText(cm?: Record<string, string>): string {
  return cm ? JSON.stringify(cm, null, 2) : ''
}

// ---- Options helpers (for tag/badge) ----

function updateOptions(index: number, text: string) {
  if (!text.trim()) {
    updateColumn(index, 'options', undefined)
    return
  }
  try {
    updateColumn(index, 'options', JSON.parse(text))
  } catch { /* keep until valid */ }
}

function optionsToText(opts?: Array<{ label: string; value: unknown }>): string {
  return opts ? JSON.stringify(opts, null, 2) : ''
}

// ---- Column API helpers ----

function updateColumnApi(index: number, patch: Partial<SchemaApiConfig>) {
  const current = props.columns[index]?.api
  if (current) {
    updateColumn(index, 'api', { ...current, ...patch })
  } else {
    updateColumn(index, 'api', { url: '', ...patch } as SchemaApiConfig)
  }
}

function removeColumnApi(index: number) {
  updateColumn(index, 'api', undefined)
}

const apiParamsCache: Record<number, string> = {}

function getApiParamsText(idx: number): string {
  if (idx in apiParamsCache) return apiParamsCache[idx]
  const p = props.columns[idx]?.api?.params
  return p ? JSON.stringify(p, null, 2) : ''
}

function handleApiParamsChange(idx: number, text: string) {
  apiParamsCache[idx] = text
  if (!text.trim()) {
    updateColumnApi(idx, { params: undefined })
    return
  }
  try {
    updateColumnApi(idx, { params: JSON.parse(text) })
  } catch { /* invalid JSON */ }
}

// ---- Buttons (row actions) ----

function addRowButton(colIndex: number) {
  const col = props.columns[colIndex]
  const buttons = [...(col.buttons || [])]
  buttons.push({
    key: `btn${buttons.length + 1}`,
    label: '按钮',
    type: 'primary',
    size: 'small',
  })
  updateColumn(colIndex, 'buttons', buttons)
}

function removeRowButton(colIndex: number, btnIndex: number) {
  const buttons = (props.columns[colIndex].buttons || []).filter((_, i) => i !== btnIndex)
  updateColumn(colIndex, 'buttons', buttons)
}

function updateRowButton(colIndex: number, btnIndex: number, field: keyof ActionButton, value: unknown) {
  const buttons = (props.columns[colIndex].buttons || []).map((btn, i) =>
    i === btnIndex ? { ...btn, [field]: value } : btn,
  )
  updateColumn(colIndex, 'buttons', buttons)
}

function updateRowButtonEvents(colIndex: number, btnIndex: number, events: ActionButton['events']) {
  updateRowButton(colIndex, btnIndex, 'events', events)
}

// ---- Expand state for button events ----

const expandedButtonEvents = ref<string>('')

function toggleButtonEvents(key: string) {
  expandedButtonEvents.value = expandedButtonEvents.value === key ? '' : key
}
</script>

<template>
  <div class="adv-columns-editor">
    <div v-if="columns.length === 0" class="adv-columns-editor__empty">
      未配置列。
    </div>

    <div
      v-for="(col, idx) in columns"
      :key="idx"
      class="adv-columns-editor__item"
    >
      <!-- Header -->
      <div class="adv-columns-editor__item-header">
        <span class="adv-columns-editor__item-title">列 {{ idx + 1 }}{{ col.label ? ` — ${col.label}` : '' }}</span>
        <div class="adv-columns-editor__item-actions">
          <el-button size="small" text :disabled="idx === 0" @click="moveUp(idx)">
            <AppIcon name="arrow-up" />
          </el-button>
          <el-button size="small" text :disabled="idx === columns.length - 1" @click="moveDown(idx)">
            <AppIcon name="arrow-down" />
          </el-button>
          <el-button type="danger" size="small" text @click="removeColumn(idx)">
            <AppIcon name="delete" />
          </el-button>
        </div>
      </div>

      <!-- Basic fields -->
      <div class="adv-columns-editor__row">
        <div class="adv-columns-editor__field">
          <label class="adv-columns-editor__label">字段名</label>
          <el-input :model-value="col.prop" size="small" placeholder="prop" @update:model-value="(v: string) => updateColumn(idx, 'prop', v)" />
        </div>
        <div class="adv-columns-editor__field">
          <label class="adv-columns-editor__label">标签</label>
          <el-input :model-value="col.label" size="small" placeholder="label" @update:model-value="(v: string) => updateColumn(idx, 'label', v)" />
        </div>
      </div>

      <div class="adv-columns-editor__row">
        <div class="adv-columns-editor__field">
          <label class="adv-columns-editor__label">宽度</label>
          <el-input :model-value="col.width ?? ''" size="small" placeholder="120" @update:model-value="(v: string) => updateColumn(idx, 'width', v ? Number(v) : undefined)" />
        </div>
        <div class="adv-columns-editor__field">
          <label class="adv-columns-editor__label">最小宽度</label>
          <el-input :model-value="col.minWidth ?? ''" size="small" placeholder="80" @update:model-value="(v: string) => updateColumn(idx, 'minWidth', v ? Number(v) : undefined)" />
        </div>
      </div>

      <div class="adv-columns-editor__row">
        <div class="adv-columns-editor__field">
          <label class="adv-columns-editor__label">渲染方式</label>
          <el-select :model-value="col.render ?? 'text'" size="small" style="width:100%" @update:model-value="(v: string) => updateColumn(idx, 'render', v)">
            <el-option v-for="opt in renderOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </div>
        <div class="adv-columns-editor__field">
          <label class="adv-columns-editor__label">对齐</label>
          <el-select :model-value="col.align ?? 'left'" size="small" style="width:100%" @update:model-value="(v: string) => updateColumn(idx, 'align', v)">
            <el-option v-for="opt in alignOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </div>
      </div>

      <div class="adv-columns-editor__row">
        <div class="adv-columns-editor__field">
          <label class="adv-columns-editor__label">固定列</label>
          <el-select :model-value="col.fixed" size="small" style="width:100%" clearable @update:model-value="(v: string) => updateColumn(idx, 'fixed', v)">
            <el-option v-for="opt in fixedOptions" :key="String(opt.value)" :label="opt.label" :value="opt.value" />
          </el-select>
        </div>
        <div class="adv-columns-editor__field">
          <label class="adv-columns-editor__label">排序</label>
          <el-switch :model-value="col.sortable ?? false" @update:model-value="(v: boolean) => updateColumn(idx, 'sortable', v)" />
        </div>
      </div>

      <!-- Tooltip -->
      <div class="adv-columns-editor__row">
        <div class="adv-columns-editor__field">
          <label class="adv-columns-editor__label">溢出省略提示</label>
          <el-switch :model-value="col.showTooltip ?? false" @update:model-value="(v: boolean) => updateColumn(idx, 'showTooltip', v)" />
        </div>
        <div class="adv-columns-editor__field">
          <label class="adv-columns-editor__label">提示字段</label>
          <el-input :model-value="col.tooltipField ?? ''" size="small" placeholder="tooltipField" @update:model-value="(v: string) => updateColumn(idx, 'tooltipField', v || undefined)" />
        </div>
      </div>

      <!-- Filterable -->
      <div class="adv-columns-editor__field">
        <label class="adv-columns-editor__label">列筛选</label>
        <el-switch :model-value="col.filterable ?? false" @update:model-value="(v: boolean) => updateColumn(idx, 'filterable', v)" />
      </div>

      <!-- link render fields -->
      <div v-if="col.render === 'link'" class="adv-columns-editor__field">
        <label class="adv-columns-editor__label">链接事件名</label>
        <el-input :model-value="col.linkEvent ?? ''" size="small" placeholder="如: view" @update:model-value="(v: string) => updateColumn(idx, 'linkEvent', v || undefined)" />
      </div>

      <!-- tag/badge render fields -->
      <template v-if="col.render === 'tag' || col.render === 'badge'">
        <div class="adv-columns-editor__field">
          <label class="adv-columns-editor__label">颜色映射 (JSON)</label>
          <el-input :model-value="colorMapToText(col.colorMap)" :rows="2" type="textarea" placeholder='{"启用":"success","停用":"danger"}' @update:model-value="(v: string) => updateColorMap(idx, v)" />
        </div>
        <div class="adv-columns-editor__field">
          <label class="adv-columns-editor__label">静态选项 (JSON)</label>
          <el-input :model-value="optionsToText(col.options)" :rows="2" type="textarea" placeholder='[{"label":"启用","value":"启用"}]' @update:model-value="(v: string) => updateOptions(idx, v)" />
        </div>
        <div class="adv-columns-editor__api-section">
          <div class="adv-columns-editor__field">
            <label class="adv-columns-editor__label">动态选项接口</label>
            <el-input :model-value="col.api?.url ?? ''" size="small" placeholder="/api/options" @update:model-value="(v: string) => updateColumnApi(idx, { url: v || '' })" />
          </div>
          <template v-if="col.api?.url">
            <div class="adv-columns-editor__row">
              <div class="adv-columns-editor__field" style="flex:1">
                <label class="adv-columns-editor__label">方法</label>
                <el-select :model-value="col.api?.method ?? 'get'" size="small" style="width:100%" @update:model-value="(v: string) => updateColumnApi(idx, { method: v as 'get' | 'post' })">
                  <el-option label="GET" value="get" />
                  <el-option label="POST" value="post" />
                </el-select>
              </div>
              <div class="adv-columns-editor__field" style="flex:1">
                <label class="adv-columns-editor__label">数据路径</label>
                <el-input :model-value="col.api?.dataPath ?? ''" size="small" placeholder="data" @update:model-value="(v: string) => updateColumnApi(idx, { dataPath: v || undefined })" />
              </div>
            </div>
            <div class="adv-columns-editor__field">
              <label class="adv-columns-editor__label">参数 (JSON)</label>
              <el-input :model-value="getApiParamsText(idx)" :rows="2" type="textarea" placeholder='{"key":"value"}' @update:model-value="(v: string) => handleApiParamsChange(idx, v)" />
            </div>
            <el-button size="small" type="danger" plain style="width:100%" @click="removeColumnApi(idx)">移除 API</el-button>
          </template>
        </div>
      </template>

      <!-- image render fields -->
      <div v-if="col.render === 'image'" class="adv-columns-editor__field">
        <label class="adv-columns-editor__label">图片宽度 (px)</label>
        <el-input-number :model-value="col.imageWidth ?? 40" :min="20" :max="400" size="small" style="width:100%" @update:model-value="(v: number) => updateColumn(idx, 'imageWidth', v)" />
      </div>

      <!-- custom render fields -->
      <div v-if="col.render === 'custom'" class="adv-columns-editor__field">
        <label class="adv-columns-editor__label">渲染函数名</label>
        <el-input :model-value="col.renderFn ?? ''" size="small" placeholder="renderFn" @update:model-value="(v: string) => updateColumn(idx, 'renderFn', v || undefined)" />
      </div>

      <!-- buttons render: row action buttons editor -->
      <div v-if="col.render === 'buttons'" class="adv-columns-editor__buttons-section">
        <label class="adv-columns-editor__label">行内按钮</label>
        <div v-if="!col.buttons?.length" class="adv-columns-editor__empty-hint">暂无按钮</div>
        <div
          v-for="(btn, bi) in col.buttons"
          :key="bi"
          class="adv-columns-editor__btn-item"
        >
          <div class="adv-columns-editor__btn-header">
            <span class="adv-columns-editor__btn-title">{{ btn.label || btn.key }}</span>
            <el-button type="danger" size="small" text @click="removeRowButton(idx, bi)">
              <AppIcon name="delete" />
            </el-button>
          </div>
          <div class="adv-columns-editor__row">
            <div class="adv-columns-editor__field">
              <label class="adv-columns-editor__label">key</label>
              <el-input :model-value="btn.key" size="small" @update:model-value="(v: string) => updateRowButton(idx, bi, 'key', v)" />
            </div>
            <div class="adv-columns-editor__field">
              <label class="adv-columns-editor__label">文字</label>
              <el-input :model-value="btn.label" size="small" @update:model-value="(v: string) => updateRowButton(idx, bi, 'label', v)" />
            </div>
          </div>
          <div class="adv-columns-editor__row">
            <div class="adv-columns-editor__field">
              <label class="adv-columns-editor__label">类型</label>
              <el-select :model-value="btn.type || ''" size="small" style="width:100%" @update:model-value="(v: string) => updateRowButton(idx, bi, 'type', v)">
                <el-option v-for="opt in buttonTypeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </div>
            <div class="adv-columns-editor__field">
              <label class="adv-columns-editor__label">确认提示</label>
              <el-input :model-value="btn.confirm ?? ''" size="small" placeholder="可选" @update:model-value="(v: string) => updateRowButton(idx, bi, 'confirm', v || undefined)" />
            </div>
          </div>
          <div class="adv-columns-editor__field">
            <label class="adv-columns-editor__label">显示条件</label>
            <el-input :model-value="btn.visibleCondition ?? ''" size="small" placeholder="如: row.status === 'draft'" @update:model-value="(v: string) => updateRowButton(idx, bi, 'visibleCondition', v || undefined)" />
          </div>

          <!-- Button events -->
          <div class="adv-columns-editor__btn-events-toggle" @click="toggleButtonEvents(`${idx}-${bi}`)">
            <AppIcon :name="expandedButtonEvents === `${idx}-${bi}` ? 'arrow-down' : 'arrow-right'" />
            <span>事件配置 ({{ btn.events?.length || 0 }})</span>
          </div>
          <div v-if="expandedButtonEvents === `${idx}-${bi}`" class="adv-columns-editor__btn-events">
            <ActionListEditor
              :actions="btn.events?.[0]?.actions ?? []"
              :action-types="actionTypeOptions"
              @update:actions="(actions) => {
                const events = actions.length ? [{ trigger: 'click', actions }] : []
                updateRowButtonEvents(idx, bi, events)
              }"
            />
          </div>
        </div>
        <el-button type="primary" size="small" plain style="width:100%;margin-top:6px" @click="addRowButton(idx)">
          <AppIcon name="plus" /> 添加按钮
        </el-button>
      </div>
    </div>

    <el-button type="primary" size="small" plain style="width:100%;margin-top:8px" @click="addColumn">
      <AppIcon name="plus" /> 添加列
    </el-button>
  </div>
</template>

<style scoped lang="scss">
.adv-columns-editor {
  &__empty {
    text-align: center;
    color: #909399;
    font-size: 12px;
    padding: 12px 0;
  }

  &__empty-hint {
    text-align: center;
    color: #c0c4cc;
    font-size: 11px;
    padding: 6px 0;
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

  &__row {
    display: flex;
    gap: 8px;
    > * { flex: 1; }
  }

  &__field {
    margin-bottom: 8px;
    &:last-child { margin-bottom: 0; }
  }

  &__label {
    display: block;
    font-size: 11px;
    font-weight: 500;
    color: #606266;
    margin-bottom: 3px;
  }

  &__api-section {
    margin-top: 4px;
    padding: 8px;
    border: 1px dashed #dcdfe6;
    border-radius: 4px;
    background: #fff;
  }

  &__buttons-section {
    margin-top: 4px;
    padding: 8px;
    border: 1px dashed #dcdfe6;
    border-radius: 4px;
    background: #fff;
  }

  &__btn-item {
    border: 1px solid #e4e7ed;
    border-radius: 4px;
    padding: 8px;
    margin-top: 6px;
    background: #f5f7fa;
  }

  &__btn-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }

  &__btn-title {
    font-size: 11px;
    font-weight: 600;
    color: #303133;
  }

  &__btn-events-toggle {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: #409eff;
    cursor: pointer;
    margin-top: 4px;
    user-select: none;
  }

  &__btn-events {
    margin-top: 6px;
    padding: 6px;
    border: 1px solid #e4e7ed;
    border-radius: 4px;
    background: #fff;
  }
}
</style>
