<script setup lang="ts">
import { ref, computed } from 'vue'
import type { VariableGroup, VariableLeaf, VariableSource } from '../composables/useVariableDefinitions.js'
import styles from './VariableSelector.module.scss'
import AppIcon from '@schema-form/shared-components/common/AppIcon.vue'

type AnyVariableSource = VariableSource
type AnyVariableGroup = VariableGroup
type AnyVariableLeaf = VariableLeaf

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

function sourceIcon(source: AnyVariableSource): string {
  switch (source) {
    case 'env': return 'setting'
    case 'form': return 'document'
    case 'node': return 'link'
  }
}

function sourceTagType(source: AnyVariableSource): 'info' | 'primary' | 'success' | 'warning' | 'danger' {
  switch (source) {
    case 'env': return 'info'
    case 'form': return 'success'
    case 'node': return 'warning'
  }
}

function sourceLabel(source: AnyVariableSource): string {
  switch (source) {
    case 'env': return '环境'
    case 'form': return '表单'
    case 'node': return '节点'
  }
}

function sourceColor(source: AnyVariableSource): string {
  switch (source) {
    case 'env': return 'var(--node-accent-trigger, #f59e0b)'
    case 'form': return 'var(--node-accent-editor, #10b981)'
    case 'node': return 'var(--node-accent-flow, #6366f1)'
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
      v-model:visible="popoverVisible"
      placement="bottom-end"
      trigger="click"
      :show-arrow="false"
      :width="280"
      :popper-class="styles.popover"
      @update:visible="onPopoverChange"
    >
      <!-- Search -->
      <div :class="styles.searchBox">
        <el-input
          v-model="searchQuery"
          :class="styles.searchInput"
          placeholder="搜索变量..."
          size="small"
          clearable
        >
          <template #prefix>
            <AppIcon name="search" />
          </template>
        </el-input>
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
              <AppIcon :name="sourceIcon(group.source)" :class="styles.groupIcon" />
              <span>{{ group.label }}</span>
            </div>
            <div v-for="variable in group.children" :key="variable.path" :class="styles.leafItem" @click="selectVariable(variable)">
              <span :class="styles.leafLabel">{{ variable.label }}</span>
              <el-tag :type="sourceTagType(variable.source)" size="small" :class="styles.sourceTag" :style="sourceColor(variable.source) ? { background: sourceColor(variable.source) + '15', color: sourceColor(variable.source) } : {}">
                {{ sourceLabel(variable.source) }}
              </el-tag>
            </div>
          </div>
        </template>
        <div v-else :class="styles.emptyState">
          {{ searchQuery ? '无匹配变量' : '暂无可用变量' }}
        </div>
      </div>
      <!-- Trigger -->
      <template #reference>
        <el-tooltip content="插入变量" placement="top" :show-after="300">
          <AppIcon name="link" :class="styles.trigger" @click="popoverVisible = !popoverVisible" />
        </el-tooltip>
      </template>
    </el-popover>
  </div>
</template>
