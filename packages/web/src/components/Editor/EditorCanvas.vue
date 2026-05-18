<script setup lang="ts">
/**
 * EditorCanvas — 中间画布 (Phase 3)
 *
 * 功能：
 * 1. 复用 FormGrid 实时渲染 schema
 * 2. 支持从组件面板拖拽添加组件（含嵌套容器）
 * 3. 支持选中高亮（点击选中，Ctrl/Shift 多选）
 * 4. 支持容器内拖拽放置（card/page/toolbar）
 * 5. 跨层级拖拽移动
 *
 * Phase 3: 接受 canvasWidth/canvasHeight props，画布填充固定尺寸父容器
 *
 * Phase 3.1: 浮动属性标签
 * - 点击组件显示浮动标签，点击标签才打开属性抽屉
 * - 拖拽放置不再自动选中或打开抽屉
 */
import { ref, computed } from 'vue'
import FormGrid from '@/components/FormGrid/index.vue'
import type { FormSchemaItem, SchemaType } from '@/components/FormGrid/types'
import { isFullWidthType } from '@/components/FormGrid/types'

/** SchemaType → 中文标签映射（浮动标签 + 组件面板显示） */
const TYPE_LABEL_ZH: Record<string, string> = {
  'grid-row': '行容器', 'grid-col': '列容器', 'page': '页面', 'card': '卡片',
  'toolbar': '工具栏', 'title': '标题', 'divider': '分割线', 'spacer': '间距',
  'steps': '步骤条', 'tabs': '标签页',
  'input': '输入框', 'number': '数字', 'select': '下拉选择', 'radio': '单选',
  'checkbox': '多选', 'date': '日期', 'date-range': '日期范围',
  'textarea': '多行文本', 'richtext': '富文本',
  'button-list': '按钮列表', 'toolbar-buttons': '工具栏按钮', 'upload': '上传',
  'table': '表格', 'pagination': '分页', 'file-list': '文件列表',
  'person-select': '人员选择', 'dept-select': '部门选择', 'transfer': '穿梭框',
  'detail-form': '详情表单', 'banner': '横幅', 'tree-layout': '树形布局',
  'date-time-slot': '日期时间段', 'dialog': '对话框', 'search-list': '搜索列表',
}
function typeLabel(type: string): string { return TYPE_LABEL_ZH[type] ?? type }

const props = defineProps<{
  schema: FormSchemaItem[]
  selectedIndex: number | null
  selectedIndices: number[]
  mode: 'edit' | 'preview'
  /** Phase 3: Canvas width for sizing awareness */
  canvasWidth?: number
  /** Phase 3: Canvas height for sizing awareness */
  canvasHeight?: number
}>()

const emit = defineEmits<{
  'update:schema': [schema: FormSchemaItem[]]
  'select': [index: number | null, ctrl?: boolean, shift?: boolean]
  'open-properties': []
  'drag-reorder': [fromIndex: number, toIndex: number]
  'drop-to-container': [parentPath: number[], index: number, item: FormSchemaItem]
  'drag-to-container': [sourcePath: number[], targetPath: number[], targetIndex: number]
}>()

// ---- Combined drag state ----
const isDragActive = computed(() => isDragging.value || isDragOver.value)

// ---- Top-level drag from component panel ----
const isDragOver = ref(false)
const isDragging = ref(false)

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  event.dataTransfer!.dropEffect = 'copy'
  isDragOver.value = true
}

function handleDragLeave() {
  isDragOver.value = false
}

/**
 * 根据 SchemaType 创建默认的 FormSchemaItem
 */
function createDefaultSchema(type: SchemaType): FormSchemaItem {
  if (type === 'grid-row') return { type: 'grid-row', children: [] }
  if (type === 'grid-col') return { type: 'grid-col', span: 12, children: [] }
  if (type === 'card' || type === 'page' || type === 'toolbar') {
    return { type, label: type === 'card' ? '卡片' : undefined, children: [] }
  }
  if (type === 'title') return { type: 'title', label: '标题' }
  if (type === 'divider') return { type: 'divider' }
  if (type === 'spacer') return { type: 'spacer' }
  if (type === 'steps') {
    return {
      type: 'steps',
      props: { steps: [{ title: '步骤一' }, { title: '步骤二' }] },
      children: [
        { type: 'grid-row', children: [] },
        { type: 'grid-row', children: [] },
      ],
    }
  }
  if (type === 'tabs') {
    return {
      type: 'tabs',
      props: { tabs: [{ title: '标签一' }] },
      children: [{ type: 'grid-row', children: [] }],
    }
  }

  const field = `field_${Date.now().toString(36)}`
  const base: FormSchemaItem = { type, field }

  let item: FormSchemaItem
  switch (type) {
    case 'input':
    case 'textarea':
      item = { ...base, label: '输入框', props: { placeholder: '请输入' } }
      break
    case 'number':
      item = { ...base, label: '数字', props: { placeholder: '请输入' } }
      break
    case 'select':
      item = { ...base, label: '下拉选择', options: [{ label: '选项一', value: 'a' }, { label: '选项二', value: 'b' }] }
      break
    case 'radio':
      item = { ...base, label: '单选', options: [{ label: '选项一', value: 'a' }, { label: '选项二', value: 'b' }] }
      break
    case 'checkbox':
      item = { ...base, label: '多选', options: [{ label: '选项一', value: 'a' }, { label: '选项二', value: 'b' }] }
      break
    case 'date':
      item = { ...base, label: '日期' }
      break
    case 'date-range':
      item = { ...base, label: '日期范围' }
      break
    case 'button-list':
      item = {
        type: 'button-list',
        buttons: [
          { text: '提交', buttonType: 'primary', actions: [{ type: 'submit' }] },
          { text: '重置', actions: [{ type: 'reset' }] },
        ],
      }
      break
    case 'upload':
      item = { ...base, label: '上传' }
      break
    case 'table':
      item = { ...base, label: '表格', props: { columnSchema: [], showActions: true } }
      break
    case 'pagination':
      item = { type: 'pagination', props: { currentPage: 1, pageSize: 10, total: 0 } }
      break
    case 'search-list':
      item = {
        type: 'search-list', label: '搜索列表',
        props: { pageSize: 10, rowKey: 'id', showSelection: false, showIndex: true, border: true, stripe: true },
        listApi: { url: '/api/list', method: 'post' },
        searchFields: [
          { type: 'input', field: 'keyword', label: '关键词', span: 6 },
          { type: 'date-range', field: 'dateRange', label: '日期', span: 8 },
        ],
        columns: [
          { prop: 'name', label: '名称', width: 120 },
          { prop: 'status', label: '状态', width: 100, render: 'tag', colorMap: { active: 'success', inactive: 'danger' } },
        ],
        rowActions: [{ label: '编辑', type: 'emit', emitEvent: 'edit-row' }],
        buttons: [{ text: '新增', buttonType: 'primary', actions: [{ type: 'emit', eventName: 'add-item' }] }],
      }
      break
    default:
      item = { type, field }
  }

  if (isFullWidthType(type)) item.span = 24
  return item
}

/**
 * 拖放组件到画布 — 不再自动选中或打开属性抽屉
 */
function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = false

  const raw = event.dataTransfer?.getData('application/schema-drag')
  if (!raw) {
    const type = event.dataTransfer?.getData('schema-type') as SchemaType | undefined
    if (!type) return
    const newItem = createDefaultSchema(type)
    emit('update:schema', [...props.schema, newItem])
    return
  }

  try {
    const data = JSON.parse(raw) as { source: 'panel' | 'canvas'; type: SchemaType; sourcePath?: number[] }
    if (data.source === 'panel') {
      const newItem = createDefaultSchema(data.type)
      emit('update:schema', [...props.schema, newItem])
    }
  } catch { /* ignore malformed data */ }
}

// ---- Click-to-select with modifier keys ----
function handleItemClick(event: MouseEvent, idx: number) {
  emit('select', idx, event.ctrlKey || event.metaKey, event.shiftKey)
}

// ---- Top-level drag reordering ----
const dragIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)
const dropPosition = ref<'top' | 'bottom' | null>(null)

function handleItemDragStart(event: DragEvent, index: number) {
  isDragging.value = true
  dragIndex.value = index
  event.dataTransfer!.effectAllowed = 'move'
  event.dataTransfer!.setData('text/plain', String(index))
  event.dataTransfer!.setData('application/schema-drag', JSON.stringify({
    source: 'canvas',
    type: props.schema[index]?.type,
    sourcePath: [index],
  }))
}

function handleItemDragOver(event: DragEvent, index: number) {
  event.preventDefault()
  event.dataTransfer!.dropEffect = 'move'
  dragOverIndex.value = index
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const midY = rect.top + rect.height / 2
  dropPosition.value = event.clientY < midY ? 'top' : 'bottom'
}

function handleItemDragLeave() {
  dragOverIndex.value = null
  dropPosition.value = null
}

function handleItemDrop(event: DragEvent, toIndex: number) {
  event.preventDefault()
  event.stopPropagation()

  const raw = event.dataTransfer?.getData('application/schema-drag')
  if (raw) {
    try {
      const data = JSON.parse(raw) as { source: 'panel' | 'canvas'; type: SchemaType; sourcePath?: number[] }
      if (data.source === 'panel') {
        const newItem = createDefaultSchema(data.type)
        emit('drop-to-container', [], toIndex, newItem)
        handleItemDragEnd()
        return
      }
    } catch { /* ignore */ }
  }

  const fromIndex = dragIndex.value
  if (fromIndex === null || fromIndex === toIndex) { handleItemDragEnd(); return }

  let targetIndex = dropPosition.value === 'bottom' ? toIndex + 1 : toIndex
  if (fromIndex < targetIndex) targetIndex--
  if (fromIndex !== targetIndex) emit('drag-reorder', fromIndex, targetIndex)

  handleItemDragEnd()
}

function handleItemDragEnd() {
  isDragging.value = false
  dragIndex.value = null
  dragOverIndex.value = null
  dropPosition.value = null
}

// ---- Nested container drop handler ----
function handleNestedContainerDrop(payload: { parentPath: number[]; index: number; dragDataRaw: string }) {
  try {
    const data = JSON.parse(payload.dragDataRaw) as { source: 'panel' | 'canvas'; type: SchemaType; sourcePath?: number[] }
    if (data.source === 'panel') {
      const newItem = createDefaultSchema(data.type)
      emit('drop-to-container', payload.parentPath, payload.index, newItem)
    } else if (data.source === 'canvas' && data.sourcePath) {
      emit('drag-to-container', data.sourcePath, payload.parentPath, payload.index)
    }
  } catch { /* ignore malformed data */ }
}

// ---- Canvas click (deselect) ----
function handleCanvasClick(event: Event) {
  const target = event.target as HTMLElement
  if (target.classList.contains('editor-canvas__inner') || target.classList.contains('editor-canvas')) {
    emit('select', null)
  }
}
</script>

<template>
  <div
    class="editor-canvas"
    :class="{ 'editor-canvas--drag-over': isDragOver }"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    @click="handleCanvasClick"
  >
    <!-- Edit mode: click overlay for selection -->
    <div v-if="mode === 'edit'" class="editor-canvas__inner">
      <div v-if="schema.length === 0" class="editor-canvas__empty">
        <p>拖拽组件到此处构建表单</p>
      </div>

      <div
        v-for="(item, idx) in schema"
        :key="idx"
        class="editor-canvas__item"
        :class="{
          'editor-canvas__item--selected': selectedIndex === idx,
          'editor-canvas__item--multi-selected': selectedIndices.includes(idx) && selectedIndex !== idx,
          'editor-canvas__item--dragging': dragIndex === idx,
          'editor-canvas__drop-indicator--top': dragOverIndex === idx && dropPosition === 'top',
          'editor-canvas__drop-indicator--bottom': dragOverIndex === idx && dropPosition === 'bottom',
        }"
        draggable="true"
        @click.stop="handleItemClick($event, idx)"
        @dragstart="handleItemDragStart($event, idx)"
        @dragover="handleItemDragOver($event, idx)"
        @dragleave="handleItemDragLeave"
        @drop="handleItemDrop($event, idx)"
        @dragend="handleItemDragEnd"
      >
        <!-- Floating property tag: only shown when selected, clicking opens drawer -->
        <div
          v-if="selectedIndex === idx"
          class="editor-canvas__item-tag"
          @click.stop="emit('open-properties')"
        >
          {{ typeLabel(item.type) }}
        </div>
        <FormGrid
          :schema="[item]"
          :editable="true"
          :is-dragging="isDragActive"
          @container-drop="(e) => handleNestedContainerDrop({ ...e, parentPath: e.parentPath.length ? [idx, ...e.parentPath.slice(1)] : [] })"
        />
      </div>
    </div>

    <!-- Preview mode: full FormGrid render -->
    <div v-else class="editor-canvas__inner editor-canvas__inner--preview">
      <FormGrid v-if="schema.length > 0" :schema="schema" />
      <div v-else class="editor-canvas__empty">
        <p>预览模式无组件</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.editor-canvas {
  width: 100%;
  height: 100%;
  background: #fff;
  outline: none;

  &--drag-over {
    background: #ecf5ff;
  }

  &__inner {
    width: 100%;
    min-height: 100%;
    padding: 10px;

    &--preview {
      max-width: 960px;
      margin: 0 auto;
    }
  }

  &__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    border: 2px dashed #dcdfe6;
    border-radius: 8px;
    color: #909399;
    font-size: 14px;
  }

  &__item {
    position: relative;
    border: 2px solid transparent;
    border-radius: 4px;
    transition: border-color 0.2s;
    margin-bottom: 8px;

    &:hover {
      border-color: #c0c4cc;
    }

    &--selected {
      border-color: #409eff;
    }

    &--multi-selected {
      border-color: #79bbff;
    }

    &--dragging {
      opacity: 0.4;
    }
  }

  &__drop-indicator--top {
    box-shadow: 0 -2px 0 0 #409eff;
  }

  &__drop-indicator--bottom {
    box-shadow: 0 2px 0 0 #409eff;
  }

  // Floating property tag — shown on selected item, click to open drawer
  &__item-tag {
    position: absolute;
    top: -24px;
    left: 0;
    padding: 2px 10px;
    font-size: 12px;
    background: rgba(64, 158, 255, 0.85);
    color: #fff;
    border-radius: 10px;
    z-index: 3;
    cursor: pointer;
    white-space: nowrap;
    user-select: none;

    &:hover {
      background: rgba(64, 158, 255, 1);
    }
  }
}
</style>
