<script setup lang="ts">
/**
 * 预览对比组件
 *
 * 并排显示修改前后的 Schema/Flow，高亮差异。
 */

import { computed } from 'vue'
import type { Widget, FlowGraph } from '@/types'

export interface AiPreviewCompareProps {
  /** 修改前的内容 */
  before: Widget[] | FlowGraph | null
  /** 修改后的内容 */
  after: Widget[] | FlowGraph | null
  /** 内容类型 */
  type: 'schema' | 'flow'
  /** 修改前标签 */
  beforeLabel?: string
  /** 修改后标签 */
  afterLabel?: string
}

const props = withDefaults(defineProps<AiPreviewCompareProps>(), {
  beforeLabel: '修改前',
  afterLabel: '修改后',
})

const emit = defineEmits<{
  close: []
  'apply-selected': [ids: string[]]
}>()

// ---- Schema Diff ----

interface SchemaDiffItem {
  id: string
  label: string
  type: string
  status: 'added' | 'removed' | 'changed' | 'unchanged'
  beforeProps?: Record<string, unknown>
  afterProps?: Record<string, unknown>
  changedFields?: string[]
}

const schemaDiffs = computed<SchemaDiffItem[]>(() => {
  if (props.type !== 'schema') return []

  const beforeWidgets = (props.before as Widget[]) ?? []
  const afterWidgets = (props.after as Widget[]) ?? []

  const beforeMap = new Map(beforeWidgets.map((w) => [w.id, w]))
  const afterMap = new Map(afterWidgets.map((w) => [w.id, w]))

  const diffs: SchemaDiffItem[] = []

  // 检查新增和修改
  for (const [id, after] of afterMap) {
    const before = beforeMap.get(id)
    if (!before) {
      diffs.push({
        id,
        label: after.label ?? after.field ?? after.type,
        type: after.type,
        status: 'added',
        afterProps: after.props,
      })
    } else {
      const changedFields = getChangedFields(before, after)
      diffs.push({
        id,
        label: after.label ?? after.field ?? after.type,
        type: after.type,
        status: changedFields.length > 0 ? 'changed' : 'unchanged',
        beforeProps: before.props,
        afterProps: after.props,
        changedFields,
      })
    }
  }

  // 检查删除
  for (const [id, before] of beforeMap) {
    if (!afterMap.has(id)) {
      diffs.push({
        id,
        label: before.label ?? before.field ?? before.type,
        type: before.type,
        status: 'removed',
        beforeProps: before.props,
      })
    }
  }

  return diffs
})

function getChangedFields(before: Widget, after: Widget): string[] {
  const changed: string[] = []

  if (before.label !== after.label) changed.push('label')
  if (before.field !== after.field) changed.push('field')
  if (before.type !== after.type) changed.push('type')

  // 比较 props
  const beforeProps = before.props ?? {}
  const afterProps = after.props ?? {}
  const allKeys = new Set([...Object.keys(beforeProps), ...Object.keys(afterProps)])

  for (const key of allKeys) {
    if (JSON.stringify(beforeProps[key]) !== JSON.stringify(afterProps[key])) {
      changed.push(`props.${key}`)
    }
  }

  return changed
}

// ---- Flow Diff ----

interface FlowDiffItem {
  id: string
  label: string
  type: 'node' | 'edge'
  status: 'added' | 'removed' | 'changed' | 'unchanged'
  beforeData?: Record<string, unknown>
  afterData?: Record<string, unknown>
}

const flowDiffs = computed<FlowDiffItem[]>(() => {
  if (props.type !== 'flow') return []

  const beforeFlow = (props.before as FlowGraph) ?? { nodes: [], edges: [] }
  const afterFlow = (props.after as FlowGraph) ?? { nodes: [], edges: [] }

  const diffs: FlowDiffItem[] = []

  // 节点对比
  const beforeNodes = new Map(beforeFlow.nodes.map((n) => [n.id, n]))
  const afterNodes = new Map(afterFlow.nodes.map((n) => [n.id, n]))

  for (const [id, node] of afterNodes) {
    const before = beforeNodes.get(id)
    diffs.push({
      id,
      label: node.data.label ?? node.data.bpmnType ?? id,
      type: 'node',
      status: !before ? 'added' : JSON.stringify(node) !== JSON.stringify(before) ? 'changed' : 'unchanged',
      beforeData: before?.data,
      afterData: node.data,
    })
  }

  for (const [id, node] of beforeNodes) {
    if (!afterNodes.has(id)) {
      diffs.push({
        id,
        label: node.data.label ?? node.data.bpmnType ?? id,
        type: 'node',
        status: 'removed',
        beforeData: node.data,
      })
    }
  }

  // 边对比
  const beforeEdges = new Map(beforeFlow.edges.map((e) => [e.id, e]))
  const afterEdges = new Map(afterFlow.edges.map((e) => [e.id, e]))

  for (const [id, edge] of afterEdges) {
    const before = beforeEdges.get(id)
    diffs.push({
      id,
      label: id,
      type: 'edge',
      status: !before ? 'added' : JSON.stringify(edge) !== JSON.stringify(before) ? 'changed' : 'unchanged',
      beforeData: before,
      afterData: edge,
    })
  }

  for (const [id, edge] of beforeEdges) {
    if (!afterEdges.has(id)) {
      diffs.push({
        id,
        label: id,
        type: 'edge',
        status: 'removed',
        beforeData: edge,
      })
    }
  }

  return diffs
})

// ---- 统计 ----

const summary = computed(() => {
  const items = props.type === 'schema' ? schemaDiffs.value : flowDiffs.value
  return {
    added: items.filter((d) => d.status === 'added').length,
    removed: items.filter((d) => d.status === 'removed').length,
    changed: items.filter((d) => d.status === 'changed').length,
    unchanged: items.filter((d) => d.status === 'unchanged').length,
  }
})

const hasDiffs = computed(() =>
  summary.value.added + summary.value.removed + summary.value.changed > 0,
)

// ---- 样式 ----

function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    added: 'var(--ai-color-success, #26A036)',
    removed: 'var(--ai-color-danger, #E50113)',
    changed: 'var(--ai-color-warning, #E6A23C)',
    unchanged: 'var(--ai-text-secondary, #666666)',
  }
  return colorMap[status] ?? colorMap.unchanged
}

function getStatusLabel(status: string): string {
  const labelMap: Record<string, string> = {
    added: '新增',
    removed: '删除',
    changed: '修改',
    unchanged: '相同',
  }
  return labelMap[status] ?? status
}

function getStatusBg(status: string): string {
  const bgMap: Record<string, string> = {
    added: 'var(--ai-color-success-bg, rgba(82, 196, 26, 0.1))',
    removed: 'var(--ai-color-danger-bg, rgba(229, 1, 19, 0.08))',
    changed: 'var(--ai-color-warning-bg, rgba(230, 162, 60, 0.1))',
    unchanged: 'transparent',
  }
  return bgMap[status] ?? bgMap.unchanged
}

// ---- 操作 ----

function handleApplyAll() {
  const items = props.type === 'schema' ? schemaDiffs.value : flowDiffs.value
  const changedIds = items
    .filter((d) => d.status !== 'removed')
    .map((d) => d.id)
  emit('apply-selected', changedIds)
}

function handleApplySelected() {
  // TODO: 支持勾选特定项
  emit('apply-selected', [])
}
</script>

<template>
  <div :class="$style.compare">
    <!-- Header -->
    <div :class="$style.header">
      <span :class="$style.title">版本对比</span>
      <div :class="$style.labels">
        <span :class="$style.label">{{ beforeLabel }}</span>
        <span :class="$style.labelSeparator">→</span>
        <span :class="$style.label">{{ afterLabel }}</span>
      </div>
      <div :class="$style.summary" data-testid="summary">
        <span :class="$style.summaryItem">
          <span :class="$style.dot" :style="{ background: 'var(--ai-color-success, #26A036)' }" />
          新增 {{ summary.added }}
        </span>
        <span :class="$style.summaryItem">
          <span :class="$style.dot" :style="{ background: 'var(--ai-color-danger, #E50113)' }" />
          删除 {{ summary.removed }}
        </span>
        <span :class="$style.summaryItem">
          <span :class="$style.dot" :style="{ background: 'var(--ai-color-warning, #E6A23C)' }" />
          修改 {{ summary.changed }}
        </span>
      </div>
      <button :class="$style.closeBtn" @click="emit('close')">
        &times;
      </button>
    </div>

    <!-- Diff 列表 -->
    <div :class="$style.body">
      <div v-if="!hasDiffs" :class="$style.noDiff" data-testid="no-diff">
        <span>两个版本完全相同</span>
      </div>

      <div v-else :class="$style.diffList">
        <!-- Schema Diffs -->
        <template v-if="type === 'schema'">
          <div
            v-for="diff in schemaDiffs"
            :key="diff.id"
            :class="[$style.diffItem, $style[`status-${diff.status}`]]"
            :style="{ background: getStatusBg(diff.status) }"
          >
            <div :class="$style.diffHeader">
              <span :class="$style.diffBadge" :style="{ background: getStatusColor(diff.status) }">
                {{ getStatusLabel(diff.status) }}
              </span>
              <span :class="$style.diffLabel">{{ diff.label }}</span>
              <span :class="$style.diffType">{{ diff.type }}</span>
            </div>

            <!-- 变更详情 -->
            <div v-if="diff.changedFields && diff.changedFields.length > 0" :class="$style.changes">
              <span v-for="field in diff.changedFields" :key="field" :class="$style.changeTag">
                {{ field }}
              </span>
            </div>
          </div>
        </template>

        <!-- Flow Diffs -->
        <template v-if="type === 'flow'">
          <div
            v-for="diff in flowDiffs"
            :key="diff.id"
            :class="[$style.diffItem, $style[`status-${diff.status}`]]"
            :style="{ background: getStatusBg(diff.status) }"
          >
            <div :class="$style.diffHeader">
              <span :class="$style.diffBadge" :style="{ background: getStatusColor(diff.status) }">
                {{ getStatusLabel(diff.status) }}
              </span>
              <span :class="$style.diffLabel">{{ diff.label }}</span>
              <span :class="$style.diffType">{{ diff.type === 'node' ? '节点' : '连线' }}</span>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Actions -->
    <div v-if="hasDiffs" :class="$style.actions">
      <button :class="$style.btnPrimary" @click="handleApplyAll">
        应用全部变更
      </button>
      <button :class="$style.btnGhost" @click="handleApplySelected">
        部分应用
      </button>
    </div>
  </div>
</template>

<style module>
.compare {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--ai-bg-white, #FFFFFF);
  border: 1px solid var(--ai-border-base, #D5DDE3);
  border-radius: var(--ai-radius-md, 4px);
  overflow: hidden;
}

.header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--ai-border-base, #D5DDE3);
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--ai-bg-gray-light, #FAFAFA);
}

.title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ai-text-primary, #333333);
}

.labels {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--ai-text-secondary, #666666);
}

.labelSeparator {
  color: var(--ai-text-disabled, #C0C4CC);
}

.summary {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.summaryItem {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--ai-text-secondary, #666666);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.closeBtn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 18px;
  color: var(--ai-text-secondary, #666666);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--ai-radius-sm, 2px);
  margin-left: auto;
}

.closeBtn:hover {
  background: var(--ai-bg-gray, #F5F7FA);
}

.body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.body::-webkit-scrollbar {
  width: 3px;
}

.body::-webkit-scrollbar-thumb {
  background: var(--ai-border-base, #D5DDE3);
  border-radius: 2px;
}

.noDiff {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--ai-text-disabled, #C0C4CC);
  font-size: 13px;
}

.diffList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.diffItem {
  padding: 10px 12px;
  border: 1px solid var(--ai-border-base, #D5DDE3);
  border-radius: var(--ai-radius-md, 4px);
  transition: all 0.2s ease;
}

.diffItem:hover {
  border-color: var(--ai-color-primary, #0060A2);
}

.diffHeader {
  display: flex;
  align-items: center;
  gap: 8px;
}

.diffBadge {
  padding: 2px 6px;
  border-radius: var(--ai-radius-sm, 2px);
  font-size: 10px;
  font-weight: 500;
  color: var(--ai-text-inverse, #FFFFFF);
}

.diffLabel {
  font-size: 12px;
  font-weight: 500;
  color: var(--ai-text-primary, #333333);
}

.diffType {
  font-size: 10px;
  color: var(--ai-text-hint, #999999);
  margin-left: auto;
}

.changes {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.changeTag {
  padding: 2px 6px;
  background: var(--ai-bg-gray, #F5F7FA);
  border-radius: var(--ai-radius-sm, 2px);
  font-size: 10px;
  color: var(--ai-text-secondary, #666666);
  font-family: Consolas, Monaco, monospace;
}

.status-added {
  border-color: var(--ai-color-success, #26A036);
}

.status-removed {
  border-color: var(--ai-color-danger, #E50113);
  opacity: 0.8;
}

.status-changed {
  border-color: var(--ai-color-warning, #E6A23C);
}

.actions {
  padding: 12px 16px;
  border-top: 1px solid var(--ai-border-base, #D5DDE3);
  display: flex;
  gap: 8px;
}

.actions button {
  flex: 1;
  text-align: center;
  padding: 8px;
}

.btnPrimary {
  border-radius: var(--ai-radius-sm, 2px);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  background: var(--ai-color-primary, #0060A2);
  color: var(--ai-text-inverse, #FFFFFF);
  font-family: inherit;
}

.btnPrimary:hover {
  background: var(--ai-color-primary-hover, #035B9C);
}

.btnGhost {
  border-radius: var(--ai-radius-sm, 2px);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  background: transparent;
  color: var(--ai-text-secondary, #666666);
  border: 1px solid var(--ai-border-light, #EBEDF3);
  font-family: inherit;
}

.btnGhost:hover {
  border-color: var(--ai-color-primary, #0060A2);
  color: var(--ai-color-primary, #0060A2);
}
</style>
