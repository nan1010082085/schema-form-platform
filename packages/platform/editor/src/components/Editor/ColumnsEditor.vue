<script setup lang="ts">
/**
 * ColumnsEditor -- CRUD editor for SearchListColumnSchema[].
 *
 * Table-based inline editor for search-list column definitions.
 * Each column row has up/down reorder and delete buttons.
 */
import type { SearchListColumnSchema, SchemaApiConfig } from '@/components/WidgetRenderer/types'
import AppIcon from '@schema-form/platform-shared/components/common/AppIcon.vue'
import styles from './ColumnsEditor.module.scss'

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
  <div :class="styles['columns-editor']">
    <div v-if="columns.length === 0" :class="styles['columns-editor__empty']">
      未配置列。
    </div>

    <div
      v-for="(col, idx) in columns"
      :key="idx"
      :class="styles['columns-editor__item']"
    >
      <div :class="styles['columns-editor__item-header']">
        <span :class="styles['columns-editor__item-title']">列 {{ idx + 1 }}</span>
        <div :class="styles['columns-editor__item-actions']">
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
            :disabled="idx === columns.length - 1"
            @click="moveDown(idx)"
          >
            <AppIcon name="arrow-down" />
          </el-button>
          <el-button
            type="danger"
            size="small"
            text
            @click="removeColumn(idx)"
          >
            <AppIcon name="delete" />
          </el-button>
        </div>
      </div>

      <div :class="styles['columns-editor__field']">
        <label :class="styles['columns-editor__label']">字段名</label>
        <el-input
          :model-value="col.prop"
          size="small"
          placeholder="字段名"
          @update:model-value="(v: string) => updateColumn(idx, 'prop', v)"
        />
      </div>

      <div :class="styles['columns-editor__field']">
        <label :class="styles['columns-editor__label']">标签</label>
        <el-input
          :model-value="col.label"
          size="small"
          placeholder="显示标签"
          @update:model-value="(v: string) => updateColumn(idx, 'label', v)"
        />
      </div>

      <div :class="styles['columns-editor__field']">
        <label :class="styles['columns-editor__label']">宽度</label>
        <el-input
          :model-value="col.width ?? ''"
          size="small"
          placeholder="例如: 120 或 120px"
          @update:model-value="(v: string) => updateColumn(idx, 'width', v || undefined)"
        />
      </div>

      <div :class="styles['columns-editor__field']">
        <label :class="styles['columns-editor__label']">最小宽度</label>
        <el-input
          :model-value="col.minWidth ?? ''"
          size="small"
          placeholder="例如: 80"
          @update:model-value="(v: string) => updateColumn(idx, 'minWidth', v || undefined)"
        />
      </div>

      <div :class="styles['columns-editor__field']">
        <label :class="styles['columns-editor__label']">渲染方式</label>
        <el-select
          :model-value="col.render ?? 'text'"
          size="small"
          style="width: 100%"
          @update:model-value="(v: string) => updateColumn(idx, 'render', v)"
        >
          <el-option
            v-for="opt in renderOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>

      <div v-if="needsColorMap(col.render)" :class="styles['columns-editor__field']">
        <label :class="styles['columns-editor__label']">颜色映射 (JSON)</label>
        <el-input
          :model-value="colorMapToText(col.colorMap)"
          :rows="2"
          type="textarea"
          placeholder='{"active":"success","inactive":"danger"}'
          @update:model-value="(v: string) => updateColorMap(idx, v)"
        />
      </div>

      <!-- Column API config (for value-label mapping from remote) -->
      <div v-if="needsColorMap(col.render)" :class="styles['columns-editor__api-section']">
        <div :class="styles['columns-editor__field']">
          <label :class="styles['columns-editor__label']">接口地址 (动态选项)</label>
          <el-input
            :model-value="col.api?.url ?? ''"
            size="small"
            placeholder="/api/options"
            @update:model-value="(v: string) => updateColumnApi(idx, { url: v || '' })"
          />
        </div>

        <template v-if="col.api?.url">
          <div :class="styles['columns-editor__field']">
            <label :class="styles['columns-editor__label']">请求方法</label>
            <el-select
              :model-value="col.api?.method ?? 'get'"
              size="small"
              style="width: 100%"
              @update:model-value="(v: string) => updateColumnApi(idx, { method: v as 'get' | 'post' })"
            >
              <el-option label="GET" value="get" />
              <el-option label="POST" value="post" />
            </el-select>
          </div>

          <div :class="styles['columns-editor__field']">
            <label :class="styles['columns-editor__label']">参数 (JSON)</label>
            <el-input
              :model-value="getApiParamsText(idx)"
              :rows="2"
              type="textarea"
              placeholder='{"key": "value"}'
              @update:model-value="(v: string) => handleApiParamsChange(idx, v)"
            />
          </div>

          <div :class="styles['columns-editor__field']">
            <label :class="styles['columns-editor__label']">数据路径</label>
            <el-input
              :model-value="col.api?.dataPath ?? ''"
              size="small"
              placeholder="data"
              @update:model-value="(v: string) => updateColumnApi(idx, { dataPath: v || undefined })"
            />
          </div>

          <div :class="[styles['columns-editor__field'], styles['api-config__field--row']]">
            <div style="flex: 1">
              <label :class="styles['columns-editor__label']">标签字段</label>
              <el-input
                :model-value="col.api?.labelKey ?? 'label'"
                size="small"
                placeholder="label"
                @update:model-value="(v: string) => updateColumnApi(idx, { labelKey: v || undefined })"
              />
            </div>
            <div style="flex: 1">
              <label :class="styles['columns-editor__label']">值字段</label>
              <el-input
                :model-value="col.api?.valueKey ?? 'value'"
                size="small"
                placeholder="value"
                @update:model-value="(v: string) => updateColumnApi(idx, { valueKey: v || undefined })"
              />
            </div>
          </div>

          <el-button size="small" type="danger" plain style="width:100%;margin-top:4px" @click="removeColumnApi(idx)">
            移除 API
          </el-button>
        </template>
      </div>

      <!-- Render-specific fields -->
      <div v-if="col.render === 'tooltip'" :class="styles['columns-editor__field']">
        <label :class="styles['columns-editor__label']">提示字段</label>
        <el-input :model-value="col.tooltipField ?? ''" size="small" placeholder="提示内容的字段名" @update:model-value="(v: string) => updateColumn(idx, 'tooltipField', v || undefined)" />
      </div>

      <div v-if="col.render === 'link'" :class="styles['columns-editor__field']">
        <label :class="styles['columns-editor__label']">链接事件</label>
        <el-input :model-value="col.linkEvent ?? ''" size="small" placeholder="事件名 例如: view" @update:model-value="(v: string) => updateColumn(idx, 'linkEvent', v || undefined)" />
      </div>

      <div v-if="col.render === 'image'" :class="styles['columns-editor__field']">
        <label :class="styles['columns-editor__label']">图片宽度 (px)</label>
        <el-input-number :model-value="col.imageWidth ?? 40" :min="20" :max="400" size="small" style="width:100%" @update:model-value="(v: number) => updateColumn(idx, 'imageWidth', v)" />
      </div>

      <div v-if="col.render === 'custom'" :class="styles['columns-editor__field']">
        <label :class="styles['columns-editor__label']">渲染函数名</label>
        <el-input :model-value="col.renderFn ?? ''" size="small" placeholder="自定义渲染函数名" @update:model-value="(v: string) => updateColumn(idx, 'renderFn', v || undefined)" />
      </div>

      <div :class="styles['columns-editor__field']">
        <label :class="styles['columns-editor__label']">可排序</label>
        <el-switch
          :model-value="col.sortable ?? false"
          @update:model-value="(v: boolean) => updateColumn(idx, 'sortable', v)"
        />
      </div>

      <div :class="styles['columns-editor__field']">
        <label :class="styles['columns-editor__label']">固定列</label>
        <el-select
          :model-value="col.fixed"
          size="small"
          style="width: 100%"
          @update:model-value="(v: string) => updateColumn(idx, 'fixed', v)"
        >
          <el-option
            v-for="opt in fixedOptions"
            :key="String(opt.value)"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>

      <div :class="styles['columns-editor__field']">
        <label :class="styles['columns-editor__label']">对齐方式</label>
        <el-select
          :model-value="col.align ?? 'left'"
          size="small"
          style="width: 100%"
          @update:model-value="(v: string) => updateColumn(idx, 'align', v)"
        >
          <el-option
            v-for="opt in alignOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>
    </div>

    <el-button
      type="primary"
      size="small"
      plain
      style="width: 100%; margin-top: 8px"
      @click="addColumn"
    >
      <AppIcon name="plus" />
      添加列
    </el-button>
  </div>
</template>

