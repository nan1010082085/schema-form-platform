<script setup lang="ts">
/**
 * VariableSnapshot — 变量快照表格
 *
 * 展示工作流执行时的变量名称、类型、最新值。
 * 支持展开行查看变量的历史值变化。
 */
import { ref, computed } from 'vue'
import styles from './VariableSnapshot.module.scss'

// ── Types ──
interface VariableEntry {
  name: string
  value: unknown
  type: string
}

// ── Props ──
const props = defineProps<{
  variables: Record<string, unknown>
}>()

// ── State ──
const expandedRows = ref<Set<string>>(new Set())

// ── Computed ──
const entries = computed<VariableEntry[]>(() => {
  if (!props.variables) return []
  return Object.entries(props.variables).map(([name, value]) => ({
    name,
    value,
    type: inferType(value),
  }))
})

// ── Table columns ──
const tableColumns = computed(() => {
  const cols = [
    { colKey: 'name', title: '变量名', minWidth: 160 },
    { colKey: 'type', title: '类型', width: 120 },
    { colKey: 'value', title: '最新值', minWidth: 200 },
  ]
  if (entries.value.some(e => isExpandable(e.value))) {
    cols.push({ colKey: 'history', title: '历史', width: 100 })
  }
  return cols
})

// ── Helpers ──
function inferType(val: unknown): string {
  if (val === null || val === undefined) return 'null'
  if (Array.isArray(val)) return `Array(${val.length})`
  return typeof val
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '-'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

function isExpandable(val: unknown): boolean {
  return val !== null && val !== undefined && typeof val === 'object'
}

function formatExpandedValue(val: unknown): string {
  if (!val || typeof val !== 'object') return String(val)
  return JSON.stringify(val, null, 2)
}

function toggleRow(name: string) {
  if (expandedRows.value.has(name)) {
    expandedRows.value.delete(name)
  } else {
    expandedRows.value.add(name)
  }
}
</script>

<template>
  <div v-if="entries.length > 0" :class="styles.root">
    <t-table
      :data="entries"
      :columns="tableColumns"
      stripe
      :class="styles.table"
      size="small"
      bordered
    >
      <template #name="{ row }">
        <span :class="styles.varName">{{ row.name }}</span>
      </template>

      <template #type="{ row }">
        <t-tag size="small" :class="styles.varType">{{ row.type }}</t-tag>
      </template>

      <template #value="{ row }">
        <t-popup
          :content="formatValue(row.value)"
          placement="top"
          :disabled="typeof row.value !== 'object'"
        >
          <span :class="styles.varValue">{{ formatValue(row.value) }}</span>
        </t-popup>
      </template>

      <template #history="{ row }">
        <template v-if="isExpandable(row.value)">
          <span
            :class="styles.historyToggle"
            @click="toggleRow(row.name)"
          >
            {{ expandedRows.has(row.name) ? '收起' : '展开' }}
          </span>
        </template>
        <span v-else style="color: var(--text-color-placeholder); font-size: 12px">-</span>
      </template>
    </t-table>
  </div>

  <div v-else :class="styles.empty">
    暂无变量数据
  </div>
</template>
