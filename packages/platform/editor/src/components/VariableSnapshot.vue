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
    <el-table
      :data="entries"
      stripe
      :class="styles.table"
      size="small"
      border
    >
      <el-table-column prop="name" label="变量名" min-width="160">
        <template #default="{ row }">
          <span :class="styles.varName">{{ row.name }}</span>
        </template>
      </el-table-column>

      <el-table-column prop="type" label="类型" width="120">
        <template #default="{ row }">
          <el-tag size="small" :class="styles.varType">{{ row.type }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="value" label="最新值" min-width="200">
        <template #default="{ row }">
          <el-tooltip
            :content="formatValue(row.value)"
            placement="top"
            :disabled="typeof row.value !== 'object'"
          >
            <span :class="styles.varValue">{{ formatValue(row.value) }}</span>
          </el-tooltip>
        </template>
      </el-table-column>

      <el-table-column v-if="entries.some(e => isExpandable(e.value))" label="历史" width="100">
        <template #default="{ row }">
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
      </el-table-column>
    </el-table>
  </div>

  <div v-else :class="styles.empty">
    暂无变量数据
  </div>
</template>
