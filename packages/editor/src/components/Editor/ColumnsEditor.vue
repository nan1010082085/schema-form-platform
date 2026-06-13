<script setup lang="ts">
/**
 * ColumnsEditor -- CRUD editor for SearchListColumnSchema[].
 *
 * Table-based inline editor for search-list column definitions.
 * Each column row has up/down reorder and delete buttons.
 */
import { AddIcon, DeleteIcon, ChevronUpIcon, ChevronDownIcon } from 'tdesign-icons-vue-next'
import type { SearchListColumnSchema, SchemaApiConfig } from '@/components/WidgetRenderer/types'

const props = defineProps<{
  columns: SearchListColumnSchema[]
}>()

const emit = defineEmits<{
  'update:columns': [columns: SearchListColumnSchema[]]
}>()

const renderOptions = [
  { label: '文本', value: 'text' },
  { label: '提示', value: 'tooltip' },
  { label: '标签', value: 'tag' },
  { label: '链接', value: 'link' },
  { label: '徽章', value: 'badge' },
  { label: '图片', value: 'image' },
  { label: '自定义', value: 'custom' },
]

const fixedOptions = [
  { label: '无', value: undefined as boolean | 'left' | 'right' | undefined },
  { label: '左', value: 'left' as const },
  { label: '右', value: 'right' as const },
]

const alignOptions = [
  { label: '左', value: 'left' },
  { label: '居中', value: 'center' },
  { label: '右', value: 'right' },
]

function addColumn() {
  const col: SearchListColumnSchema = {
    prop: '',
    label: '',
    width: '',
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

function updateColumn<K extends keyof SearchListColumnSchema>(index: number, field: K, value: SearchListColumnSchema[K]) {
  const updated = props.columns.map((col, i) =>
    i === index ? { ...col, [field]: value } : col,
  )
  emit('update:columns', updated)
}

function updateColorMap(index: number, text: string) {
  if (!text.trim()) {
    updateColumn(index, 'colorMap', undefined)
    return
  }
  try {
    const parsed = JSON.parse(text) as Record<string, string>
    updateColumn(index, 'colorMap', parsed)
  } catch {
    // Keep invalid JSON until fixed by user; don't clobber colorMap
  }
}

function colorMapToText(cm?: Record<string, string>): string {
  if (!cm) return ''
  return JSON.stringify(cm, null, 2)
}

/** Check if render type needs colorMap editor */
function needsColorMap(render?: string): boolean {
  return render === 'tag' || render === 'badge'
}

/** Column API helpers */
function updateColumnApi(index: number, patch: Partial<SchemaApiConfig>) {
  const current: SchemaApiConfig | undefined = props.columns[index]?.api
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
    updateColumnApi(idx, { params: JSON.parse(text) as Record<string, unknown> })
  } catch { /* invalid JSON */ }
}
</script>

<template>
  <div class="columns-editor">
    <div v-if="columns.length === 0" class="columns-editor__empty">
      未配置列。
    </div>

    <div
      v-for="(col, idx) in columns"
      :key="idx"
      class="columns-editor__item"
    >
      <div class="columns-editor__item-header">
        <span class="columns-editor__item-title">列 {{ idx + 1 }}</span>
        <div class="columns-editor__item-actions">
          <t-button
            size="small"
            variant="text"
            :disabled="idx === 0"
            @click="moveUp(idx)"
          >
            <template #icon><ChevronUpIcon /></template>
          </t-button>
          <t-button
            size="small"
            variant="text"
            :disabled="idx === columns.length - 1"
            @click="moveDown(idx)"
          >
            <template #icon><ChevronDownIcon /></template>
          </t-button>
          <t-button
            theme="danger"
            size="small"
            variant="text"
            @click="removeColumn(idx)"
          >
            <template #icon><DeleteIcon /></template>
          </t-button>
        </div>
      </div>

      <div class="columns-editor__field">
        <label class="columns-editor__label">字段名</label>
        <t-input
          :value="col.prop"
          size="small"
          placeholder="字段名"
          @change="(v: string) => updateColumn(idx, 'prop', v)"
        />
      </div>

      <div class="columns-editor__field">
        <label class="columns-editor__label">标签</label>
        <t-input
          :value="col.label"
          size="small"
          placeholder="显示标签"
          @change="(v: string) => updateColumn(idx, 'label', v)"
        />
      </div>

      <div class="columns-editor__field">
        <label class="columns-editor__label">宽度</label>
        <t-input
          :value="col.width ?? ''"
          size="small"
          placeholder="例如: 120 或 120px"
          @change="(v: string) => updateColumn(idx, 'width', v || undefined)"
        />
      </div>

      <div class="columns-editor__field">
        <label class="columns-editor__label">最小宽度</label>
        <t-input
          :value="col.minWidth ?? ''"
          size="small"
          placeholder="例如: 80"
          @change="(v: string) => updateColumn(idx, 'minWidth', v || undefined)"
        />
      </div>

      <div class="columns-editor__field">
        <label class="columns-editor__label">渲染方式</label>
        <t-select
          :value="col.render ?? 'text'"
          size="small"
          style="width: 100%"
          @change="(v: string) => updateColumn(idx, 'render', v)"
        >
          <t-option
            v-for="opt in renderOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </t-select>
      </div>

      <div v-if="needsColorMap(col.render)" class="columns-editor__field">
        <label class="columns-editor__label">颜色映射 (JSON)</label>
        <t-textarea
          :value="colorMapToText(col.colorMap)"
          :rows="2"
          size="small"
          placeholder='{"active":"success","inactive":"danger"}'
          @change="(v: string) => updateColorMap(idx, v)"
        />
      </div>

      <!-- Column API config (for value-label mapping from remote) -->
      <div v-if="needsColorMap(col.render)" class="columns-editor__api-section">
        <div class="columns-editor__field">
          <label class="columns-editor__label">接口地址 (动态选项)</label>
          <t-input
            :value="col.api?.url ?? ''"
            size="small"
            placeholder="/api/options"
            @change="(v: string) => updateColumnApi(idx, { url: v || '' })"
          />
        </div>

        <template v-if="col.api?.url">
          <div class="columns-editor__field">
            <label class="columns-editor__label">请求方法</label>
            <t-select
              :value="col.api?.method ?? 'get'"
              size="small"
              style="width: 100%"
              @change="(v: string) => updateColumnApi(idx, { method: v as 'get' | 'post' })"
            >
              <t-option label="GET" value="get" />
              <t-option label="POST" value="post" />
            </t-select>
          </div>

          <div class="columns-editor__field">
            <label class="columns-editor__label">参数 (JSON)</label>
            <t-textarea
              :value="getApiParamsText(idx)"
              :rows="2"
              size="small"
              placeholder='{"key": "value"}'
              @change="(v: string) => handleApiParamsChange(idx, v)"
            />
          </div>

          <div class="columns-editor__field">
            <label class="columns-editor__label">数据路径</label>
            <t-input
              :value="col.api?.dataPath ?? ''"
              size="small"
              placeholder="data"
              @change="(v: string) => updateColumnApi(idx, { dataPath: v || undefined })"
            />
          </div>

          <div class="columns-editor__field api-config__field--row">
            <div style="flex: 1">
              <label class="columns-editor__label">标签字段</label>
              <t-input
                :value="col.api?.labelKey ?? 'label'"
                size="small"
                placeholder="label"
                @change="(v: string) => updateColumnApi(idx, { labelKey: v || undefined })"
              />
            </div>
            <div style="flex: 1">
              <label class="columns-editor__label">值字段</label>
              <t-input
                :value="col.api?.valueKey ?? 'value'"
                size="small"
                placeholder="value"
                @change="(v: string) => updateColumnApi(idx, { valueKey: v || undefined })"
              />
            </div>
          </div>

          <t-button size="small" theme="danger" variant="outline" style="width:100%;margin-top:4px" @click="removeColumnApi(idx)">
            移除 API
          </t-button>
        </template>
      </div>

      <!-- Render-specific fields -->
      <div v-if="col.render === 'tooltip'" class="columns-editor__field">
        <label class="columns-editor__label">提示字段</label>
        <t-input :value="col.tooltipField ?? ''" size="small" placeholder="提示内容的字段名" @change="(v: string) => updateColumn(idx, 'tooltipField', v || undefined)" />
      </div>

      <div v-if="col.render === 'link'" class="columns-editor__field">
        <label class="columns-editor__label">链接事件</label>
        <t-input :value="col.linkEvent ?? ''" size="small" placeholder="事件名 例如: view" @change="(v: string) => updateColumn(idx, 'linkEvent', v || undefined)" />
      </div>

      <div v-if="col.render === 'image'" class="columns-editor__field">
        <label class="columns-editor__label">图片宽度 (px)</label>
        <t-input-number :value="col.imageWidth ?? 40" :min="20" :max="400" size="small" style="width:100%" theme="column" @change="(v: number) => updateColumn(idx, 'imageWidth', v)" />
      </div>

      <div v-if="col.render === 'custom'" class="columns-editor__field">
        <label class="columns-editor__label">渲染函数名</label>
        <t-input :value="col.renderFn ?? ''" size="small" placeholder="自定义渲染函数名" @change="(v: string) => updateColumn(idx, 'renderFn', v || undefined)" />
      </div>

      <div class="columns-editor__field">
        <label class="columns-editor__label">可排序</label>
        <t-switch
          :value="col.sortable ?? false"
          @change="(v: boolean) => updateColumn(idx, 'sortable', v)"
        />
      </div>

      <div class="columns-editor__field">
        <label class="columns-editor__label">固定列</label>
        <t-select
          :value="col.fixed"
          size="small"
          style="width: 100%"
          @change="(v: string) => updateColumn(idx, 'fixed', v)"
        >
          <t-option
            v-for="opt in fixedOptions"
            :key="String(opt.value)"
            :label="opt.label"
            :value="opt.value"
          />
        </t-select>
      </div>

      <div class="columns-editor__field">
        <label class="columns-editor__label">对齐方式</label>
        <t-select
          :value="col.align ?? 'left'"
          size="small"
          style="width: 100%"
          @change="(v: string) => updateColumn(idx, 'align', v)"
        >
          <t-option
            v-for="opt in alignOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </t-select>
      </div>
    </div>

    <t-button
      theme="primary"
      size="small"
      variant="outline"
      style="width: 100%; margin-top: 8px"
      @click="addColumn"
    >
      <template #icon><AddIcon /></template>
      添加列
    </t-button>
  </div>
</template>

<style scoped lang="scss">
.columns-editor {
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

  &__api-section {
    margin-top: 4px;
    padding: 8px;
    border: 1px dashed #dcdfe6;
    border-radius: 4px;
    background: #fff;
  }
}

.api-config__field--row {
  display: flex;
  gap: 8px;
}
</style>
