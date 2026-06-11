<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, Connection, Document, SetUp, Timer, Edit, Cpu, Warning } from '@element-plus/icons-vue'
import type { VariableGroup, VariableLeaf, VariableSource } from '../composables/useVariableDefinitions.js'
import type { WorkflowVariableGroup, WorkflowVariableLeaf, WorkflowVariableSource } from '../composables/useWorkflowVariables.js'
import styles from './VariableSelector.module.css'

type AnyVariableSource = VariableSource | WorkflowVariableSource
type AnyVariableGroup = VariableGroup | WorkflowVariableGroup
type AnyVariableLeaf = VariableLeaf | WorkflowVariableLeaf

const props = withDefaults(defineProps<{
  modelValue?: string
  /** Variable tree grouped by source */
  groups?: AnyVariableGroup[]
  placeholder?: string
  /** Insert format: 'template' produces {{path}}, 'raw' produces the path directly */
  insertMode?: 'template' | 'raw'
}>(), {
  modelValue: '',
  groups: () => [],
  placeholder: '输入或选择变量',
  insertMode: 'template',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const popoverVisible = ref(false)
const searchQuery = ref('')

/* --- Source icon --- */

function sourceIcon(source: AnyVariableSource) {
  switch (source) {
    case 'env': return SetUp
    case 'form': return Document
    case 'node': return Connection
    case 'trigger': return Timer
    case 'editor': return Edit
    case 'flow': return Connection
    case 'ai': return Cpu
    case 'system': return Warning
  }
}

function sourceTagType(source: AnyVariableSource): '' | 'success' | 'warning' | 'danger' | 'info' {
  switch (source) {
    case 'env': return ''
    case 'form': return 'success'
    case 'node': return 'warning'
    case 'trigger': return 'warning'
    case 'editor': return 'success'
    case 'flow': return 'info'
    case 'ai': return 'danger'
    case 'system': return ''
  }
}

function sourceLabel(source: AnyVariableSource): string {
  switch (source) {
    case 'env': return '环境'
    case 'form': return '表单'
    case 'node': return '节点'
    case 'trigger': return '触发器'
    case 'editor': return 'Editor'
    case 'flow': return 'Flow'
    case 'ai': return 'AI'
    case 'system': return '系统'
  }
}

function sourceColor(source: AnyVariableSource): string {
  switch (source) {
    case 'trigger': return 'var(--node-accent-trigger, #f59e0b)'
    case 'editor': return 'var(--node-accent-editor, #10b981)'
    case 'flow': return 'var(--node-accent-flow, #6366f1)'
    case 'ai': return 'var(--node-accent-ai, #8b5cf6)'
    case 'system': return 'var(--node-accent-system, #64748b)'
    default: return ''
  }
}

/* --- Filtered tree --- */

const filteredGroups = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return props.groups

  return props.groups
    .map((group) => ({
      ...group,
      children: group.children.filter(
        (v) =>
          v.label.toLowerCase().includes(q) ||
          v.key.toLowerCase().includes(q) ||
          v.path.toLowerCase().includes(q),
      ),
    }))
    .filter((group) => group.children.length > 0)
})

/* --- Selection --- */

function selectVariable(variable: AnyVariableLeaf) {
  const formatted =
    props.insertMode === 'template'
      ? `{{${variable.path}}}`
      : variable.path

  emit('update:modelValue', formatted)
  popoverVisible.value = false
  searchQuery.value = ''
}

function onInputChange(value: string) {
  emit('update:modelValue', value)
}

function onPopoverChange(visible: boolean) {
  if (!visible) {
    searchQuery.value = ''
  }
}
</script>

<template>
  <div :class="styles.wrapper">
    <el-input
      :model-value="modelValue"
      :placeholder="placeholder"
      :class="styles.input"
      @input="onInputChange"
    />
    <el-popover
      :visible="popoverVisible"
      placement="bottom-end"
      :width="280"
      trigger="click"
      :show-arrow="false"
      :offset="4"
      :popper-class="styles.popover"
      @update:visible="popoverVisible = $event"
      @change="onPopoverChange"
    >
      <template #reference>
        <el-tooltip content="插入变量" placement="top" :show-after="300">
          <el-icon :class="styles.trigger" @click="popoverVisible = !popoverVisible">
            <Connection />
          </el-icon>
        </el-tooltip>
      </template>

      <!-- Search -->
      <div :class="styles.searchBox">
        <el-input
          v-model="searchQuery"
          :class="styles.searchInput"
          placeholder="搜索变量..."
          :prefix-icon="Search"
          size="small"
          clearable
        />
      </div>

      <!-- Variable tree -->
      <div :class="styles.treeContainer">
        <template v-if="filteredGroups.length > 0">
          <div
            v-for="group in filteredGroups"
            :key="group.source"
            :class="styles.group"
          >
            <div
              :class="styles.groupHeader"
              :style="{ '--group-color': sourceColor(group.source) }"
            >
              <el-icon :class="styles.groupIcon">
                <component :is="sourceIcon(group.source)" />
              </el-icon>
              <span>{{ group.label }}</span>
            </div>

            <div
              v-for="variable in group.children"
              :key="variable.path"
              :class="styles.leafItem"
              @click="selectVariable(variable)"
            >
              <span :class="styles.leafLabel">{{ variable.label }}</span>
              <el-tag
                :type="sourceTagType(variable.source)"
                size="small"
                :class="styles.sourceTag"
                :style="sourceColor(variable.source) ? { '--el-tag-bg-color': sourceColor(variable.source) + '15', '--el-tag-text-color': sourceColor(variable.source) } : {}"
              >
                {{ sourceLabel(variable.source) }}
              </el-tag>
            </div>
          </div>
        </template>

        <div v-else :class="styles.emptyState">
          {{ searchQuery ? '无匹配变量' : '暂无可用变量' }}
        </div>
      </div>
    </el-popover>
  </div>
</template>
