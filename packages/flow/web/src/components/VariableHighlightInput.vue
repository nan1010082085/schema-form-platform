<script setup lang="ts">
/**
 * VariableHighlightInput — 变量引用高亮输入框
 *
 * 支持 {{nodeId.field}} 语法，变量引用显示为蓝色标签
 * 支持点击编辑/删除变量引用
 */

import { ref, computed } from 'vue'
import { LinkIcon, DeleteIcon } from 'tdesign-icons-vue-next'
import type { WorkflowVariableLeaf, WorkflowVariableSource } from '../composables/useWorkflowVariables'
import styles from './VariableHighlightInput.module.css'

interface VariableSegment {
  type: 'text' | 'variable'
  content: string
  path?: string
  label?: string
  source?: WorkflowVariableSource
}

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  variables?: WorkflowVariableLeaf[]
  disabled?: boolean
}>(), {
  modelValue: '',
  placeholder: '输入内容，可使用 {{变量}} 语法',
  variables: () => [],
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputRef = ref<HTMLDivElement>()
const popoverVisible = ref(false)
const editingIndex = ref<number | null>(null)
const popoverPosition = ref({ x: 0, y: 0 })

/** Parse input value into segments */
const segments = computed<VariableSegment[]>(() => {
  const result: VariableSegment[] = []
  const regex = /\{\{(\w+\.\w+)\}\}/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(props.modelValue)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      result.push({
        type: 'text',
        content: props.modelValue.slice(lastIndex, match.index),
      })
    }

    // Add variable segment
    const path = match[1]
    const variable = props.variables.find(v => v.path === path)
    result.push({
      type: 'variable',
      content: match[0],
      path,
      label: variable?.label || path,
      source: variable?.source,
    })

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < props.modelValue.length) {
    result.push({
      type: 'text',
      content: props.modelValue.slice(lastIndex),
    })
  }

  return result
})

/** Get variable source color */
function getSourceColor(source?: WorkflowVariableSource): string {
  switch (source) {
    case 'trigger': return 'var(--node-accent-trigger, #f59e0b)'
    case 'editor': return 'var(--node-accent-editor, #10b981)'
    case 'flow': return 'var(--node-accent-flow, #6366f1)'
    case 'ai': return 'var(--node-accent-ai, #8b5cf6)'
    case 'system': return 'var(--node-accent-system, #64748b)'
    default: return 'var(--color-primary)'
  }
}

/** Handle text input */
function handleTextChange(e: Event) {
  const target = e.target as HTMLDivElement
  emit('update:modelValue', target.textContent || '')
}

/** Handle variable tag click - show edit/delete popover */
function handleVariableClick(index: number, e: MouseEvent) {
  if (props.disabled) return

  editingIndex.value = index
  popoverPosition.value = { x: e.clientX, y: e.clientY }
  popoverVisible.value = true
}

/** Delete variable reference */
function deleteVariable(index: number) {
  const newSegments = [...segments.value]
  newSegments.splice(index, 1)

  const newValue = newSegments.map(s => s.content).join('')
  emit('update:modelValue', newValue)
  popoverVisible.value = false
  editingIndex.value = null
}

/** Replace variable reference */
function _replaceVariable(index: number, newVariable: WorkflowVariableLeaf) {
  const newSegments = [...segments.value]
  newSegments[index] = {
    type: 'variable',
    content: `{{${newVariable.path}}}`,
    path: newVariable.path,
    label: newVariable.label,
    source: newVariable.source,
  }

  const newValue = newSegments.map(s => s.content).join('')
  emit('update:modelValue', newValue)
  popoverVisible.value = false
  editingIndex.value = null
}

/** Close popover */
function closePopover() {
  popoverVisible.value = false
  editingIndex.value = null
}
</script>

<template>
  <div :class="styles.wrapper">
    <div
      ref="inputRef"
      :class="[styles.inputContainer, { [styles.disabled]: disabled }]"
      contenteditable="true"
      @input="handleTextChange"
      @blur="handleTextChange"
    >
      <template v-for="(segment, index) in segments" :key="index">
        <span
          v-if="segment.type === 'text'"
          :class="styles.textSegment"
        >{{ segment.content }}</span>
        <span
          v-else
          :class="styles.variableTag"
          :style="{ '--tag-color': getSourceColor(segment.source) }"
          @click="handleVariableClick(index, $event)"
        >
          <LinkIcon :class="styles.variableIcon" />
          {{ segment.label }}
        </span>
      </template>
    </div>

    <!-- Variable edit/delete popover -->
    <div
      v-if="popoverVisible && editingIndex !== null"
      :class="styles.popoverOverlay"
      @click="closePopover"
    >
      <div
        :class="styles.popoverContent"
        :style="{ left: `${popoverPosition.x}px`, top: `${popoverPosition.y}px` }"
        @click.stop
      >
        <div :class="styles.popoverHeader">
          <span :class="styles.popoverTitle">变量操作</span>
          <DeleteIcon :class="styles.popoverClose" @click="closePopover" />
        </div>
        <div :class="styles.popoverBody">
          <div :class="styles.popoverPath">
            {{ segments[editingIndex]?.path }}
          </div>
          <div :class="styles.popoverActions">
            <t-button size="small" @click="deleteVariable(editingIndex)">
              <DeleteIcon />
              删除
            </t-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
