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
 */
import { ref, computed } from 'vue'
import FormGrid from '@/components/FormGrid/index.vue'
import type { FormSchemaItem, SchemaType } from '@/components/FormGrid/types'
import { isFullWidthType } from '@/components/FormGrid/types'

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
    return { type, label: type === 'card' ? 'Card' : undefined, children: [] }
  }
  if (type === 'title') return { type: 'title', label: 'Title' }
  if (type === 'divider') return { type: 'divider' }
  if (type === 'spacer') return { type: 'spacer' }
  if (type === 'steps') {
    return {
      type: 'steps',
      props: { steps: [{ title: 'Step 1' }, { title: 'Step 2' }] },
      children: [
        { type: 'grid-row', children: [] },
        { type: 'grid-row', children: [] },
      ],
    }
  }
  if (type === 'tabs') {
    return {
      type: 'tabs',
      props: { tabs: [{ title: 'Tab 1' }] },
      children: [{ type: 'grid-row', children: [] }],
    }
  }

  const field = `field_${Date.now().toString(36)}`
  const base: FormSchemaItem = { type, field }

  let item: FormSchemaItem
  switch (type) {
    case 'input':
    case 'textarea':
      item = { ...base, label: 'Input', props: { placeholder: 'Please enter' } }
      break
    case 'number':
      item = { ...base, label: 'Number', props: { placeholder: 'Please enter' } }
      break
    case 'select':
      item = { ...base, label: 'Select', options: [{ label: 'Option A', value: 'a' }, { label: 'Option B', value: 'b' }] }
      break
    case 'radio':
      item = { ...base, label: 'Radio', options: [{ label: 'Option A', value: 'a' }, { label: 'Option B', value: 'b' }] }
      break
    case 'checkbox':
      item = { ...base, label: 'Checkbox', options: [{ label: 'Option A', value: 'a' }, { label: 'Option B', value: 'b' }] }
      break
    case 'date':
      item = { ...base, label: 'Date' }
      break
    case 'date-range':
      item = { ...base, label: 'Date Range' }
      break
    case 'button-list':
      item = {
        type: 'button-list',
        buttons: [
          { text: 'Submit', buttonType: 'primary', actions: [{ type: 'submit' }] },
          { text: 'Reset', actions: [{ type: 'reset' }] },
        ],
      }
      break
    case 'upload':
      item = { ...base, label: 'Upload' }
      break
    case 'table':
      item = { ...base, label: 'Table', props: { columnSchema: [], showActions: true } }
      break
    case 'pagination':
      item = { type: 'pagination', props: { currentPage: 1, pageSize: 10, total: 0 } }
      break
    case 'search-list':
      item = {
        type: 'search-list', label: 'Search List',
        props: { pageSize: 10, rowKey: 'id', showSelection: false, showIndex: true, border: true, stripe: true },
        listApi: { url: '/api/list', method: 'post' },
        searchFields: [
          { type: 'input', field: 'keyword', label: 'Keyword', span: 6 },
          { type: 'date-range', field: 'dateRange', label: 'Date', span: 8 },
        ],
        columns: [
          { prop: 'name', label: 'Name', width: 120 },
          { prop: 'status', label: 'Status', width: 100, render: 'tag', colorMap: { active: 'success', inactive: 'danger' } },
        ],
        rowActions: [{ label: 'Edit', type: 'emit', emitEvent: 'edit-row' }],
        buttons: [{ text: 'Add', buttonType: 'primary', actions: [{ type: 'emit', eventName: 'add-item' }] }],
      }
      break
    default:
      item = { type, field }
  }

  if (isFullWidthType(type)) item.span = 24
  return item
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = false

  const raw = event.dataTransfer?.getData('application/schema-drag')
  if (!raw) {
    const type = event.dataTransfer?.getData('schema-type') as SchemaType | undefined
    if (!type) return
    const newItem = createDefaultSchema(type)
    const newSchema = [...props.schema, newItem]
    emit('update:schema', newSchema)
    emit('select', newSchema.length - 1)
    return
  }

  try {
    const data = JSON.parse(raw) as { source: 'panel' | 'canvas'; type: SchemaType; sourcePath?: number[] }
    if (data.source === 'panel') {
      const newItem = createDefaultSchema(data.type)
      const newSchema = [...props.schema, newItem]
      emit('update:schema', newSchema)
      emit('select', newSchema.length - 1)
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
        <p>Drag components here to build your form</p>
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
        <div class="editor-canvas__item-badge">{{ item.type }}</div>
        <FormGrid
          :schema="[item]"
          :editable="true"
          :is-dragging="isDragActive"
          @container-drop="handleNestedContainerDrop"
        />
      </div>
    </div>

    <!-- Preview mode: full FormGrid render -->
    <div v-else class="editor-canvas__inner editor-canvas__inner--preview">
      <FormGrid v-if="schema.length > 0" :schema="schema" />
      <div v-else class="editor-canvas__empty">
        <p>No components to preview</p>
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
    padding: 24px;

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

      .editor-canvas__item-badge {
        background: #409eff;
        color: #fff;
      }
    }

    &--multi-selected {
      border-color: #79bbff;

      .editor-canvas__item-badge {
        background: #79bbff;
        color: #fff;
      }
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

  &__item-badge {
    position: absolute;
    top: -1px;
    left: -1px;
    padding: 2px 8px;
    font-size: 11px;
    background: #909399;
    color: #fff;
    border-radius: 0 0 4px 0;
    z-index: 2;
    pointer-events: none;
  }
}
</style>
