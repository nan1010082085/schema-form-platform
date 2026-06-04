<script setup lang="ts">
/**
 * SchemaVersionCompare — Schema 版本对比组件
 *
 * 功能：
 * - 版本列表（按时间倒序）
 * - 选择两个版本进行对比
 * - 字段级变更高亮（新增/删除/修改/移动）
 * - 版本回滚
 * - 版本导出
 *
 * 依赖：
 * - useSchemaVersionStore — 版本状态管理
 * - schemaDiff — Widget 树差异算法
 */
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowRight, Download, RefreshLeft, Refresh, Close } from '@element-plus/icons-vue'
import { useSchemaVersionStore } from '@/stores/schemaVersion'
import { useWidgetStore } from '@/stores/widget'
import { useEditorStore } from '@/stores/editor'
import type { VersionEntry } from '@/types/api'
import type { Widget } from '@/widgets/base/types'

const versionStore = useSchemaVersionStore()
const widgetStore = useWidgetStore()
const editorStore = useEditorStore()

const emit = defineEmits<{
  close: []
  'version-loaded': [version: string]
}>()

// ---- 视图状态 ----

type ViewMode = 'list' | 'compare'
const viewMode = ref<ViewMode>('list')

// ---- 格式化 ----

function formatVersion(v: string): string {
  if (!v || v.length !== 14) return v
  return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)} ${v.slice(8, 10)}:${v.slice(10, 12)}:${v.slice(12, 14)}`
}

function formatTime(iso: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return iso
  }
}

// ---- 版本选择 ----

const selectedForCompare = ref<Set<string>>(new Set())

function toggleSelect(version: string) {
  if (selectedForCompare.value.has(version)) {
    selectedForCompare.value.delete(version)
  } else {
    // 最多选两个
    if (selectedForCompare.value.size >= 2) {
      // 移除最早选的
      const first = selectedForCompare.value.values().next().value!
      selectedForCompare.value.delete(first)
    }
    selectedForCompare.value.add(version)
  }
  // 触发响应式更新
  selectedForCompare.value = new Set(selectedForCompare.value)
}

function isSelected(version: string): boolean {
  return selectedForCompare.value.has(version)
}

const canCompare = computed(() => selectedForCompare.value.size === 2)

const selectedVersions = computed(() => Array.from(selectedForCompare.value))

// ---- 进入对比 ----

async function handleCompare() {
  if (selectedVersions.value.length !== 2) return

  // 排序：较早的放左边
  const sorted = [...selectedVersions.value].sort((a, b) => a.localeCompare(b))

  versionStore.selectForCompare(sorted[0], 'left')
  versionStore.selectForCompare(sorted[1], 'right')

  const success = await versionStore.executeCompare()
  if (success) {
    viewMode.value = 'compare'
  }
}

function handleBackToList() {
  viewMode.value = 'list'
  versionStore.clearCompare()
  selectedForCompare.value = new Set()
}

// ---- 版本回滚 ----

async function handleRollback(version: string) {
  try {
    await ElMessageBox.confirm(
      `确认回滚到版本 ${formatVersion(version)}？当前未保存的修改将丢失。`,
      '版本回滚',
      { type: 'warning', confirmButtonText: '回滚', cancelButtonText: '取消' },
    )
  } catch {
    return
  }

  const detail = await versionStore.rollbackToVersion(version)
  if (detail) {
    widgetStore.loadWidgets(detail.json as unknown as Widget[])
    editorStore.markClean()
    emit('version-loaded', version)
    ElMessage.success(`已回滚到版本 ${formatVersion(version)}`)
    emit('close')
  } else {
    ElMessage.error('回滚失败')
  }
}

// ---- 版本导出 ----

function downloadJson(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function handleExport(version: string) {
  const json = await versionStore.exportVersion(version)
  if (json) {
    const filename = `schema-${versionStore.editId}-${version}.json`
    downloadJson(json, filename)
    ElMessage.success('导出成功')
  } else {
    ElMessage.error('导出失败')
  }
}

// ---- 版本删除 ----

async function handleDelete(entry: VersionEntry) {
  if (entry.published) {
    ElMessage.warning('不能删除已发布的版本')
    return
  }
  if (entry.version === versionStore.currentVersion) {
    ElMessage.warning('不能删除当前版本')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确认删除版本 ${formatVersion(entry.version)}？此操作不可恢复。`,
      '删除版本',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }

  const success = await versionStore.removeVersion(entry.version)
  if (success) {
    ElMessage.success('版本已删除')
  } else {
    ElMessage.error('删除失败')
  }
}

// ---- 刷新 ----

function handleRefresh() {
  versionStore.loadVersions(versionStore.page)
}

// ---- Diff status helpers ----

function getStatusColor(status: string): string {
  switch (status) {
    case 'added': return '#67c23a'
    case 'removed': return '#f56c6c'
    case 'modified': return '#e6a23c'
    case 'moved': return '#409eff'
    default: return '#909399'
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'added': return '新增'
    case 'removed': return '删除'
    case 'modified': return '修改'
    case 'moved': return '移动'
    default: return '相同'
  }
}

// ---- Diff summary counts ----

const diffSummaryCounts = computed(() => {
  if (!versionStore.diffResult) return { added: 0, removed: 0, modified: 0, moved: 0 }
  return {
    added: versionStore.diffResult.added.length,
    removed: versionStore.diffResult.removed.length,
    modified: versionStore.diffResult.modified.length,
    moved: versionStore.diffResult.moved.length,
  }
})

// ---- Flatten diffs for table ----

interface DiffRow {
  id: string
  name: string
  type: string
  label?: string
  path: string
  status: 'added' | 'removed' | 'modified' | 'moved'
  changes?: Array<{ field: string; oldValue: unknown; newValue: unknown }>
}

const diffRows = computed<DiffRow[]>(() => {
  if (!versionStore.diffResult) return []
  const rows: DiffRow[] = []
  const r = versionStore.diffResult

  for (const d of r.added) {
    rows.push({ ...d, status: 'added' })
  }
  for (const d of r.removed) {
    rows.push({ ...d, status: 'removed' })
  }
  for (const d of r.modified) {
    rows.push({ ...d, status: 'modified', changes: d.changes })
  }
  for (const d of r.moved) {
    rows.push({ ...d, status: 'moved' })
  }

  return rows
})

// ---- 侧边标记 ----

function getSideLabel(version: string): string {
  if (version === versionStore.compareLeft) return '旧'
  if (version === versionStore.compareRight) return '新'
  return ''
}

/**
 * 格式化变更值用于展示。
 */
function formatChangeValue(val: unknown): string {
  if (val === null || val === undefined) return '(空)'
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val)
    } catch {
      return String(val)
    }
  }
  return String(val)
}
</script>

<template>
  <div :class="$style.compare">
    <!-- Header -->
    <div :class="$style.header">
      <span :class="$style.title">版本历史</span>
      <button :class="$style.closeBtn" @click="emit('close')">
        <el-icon :size="16"><Close /></el-icon>
      </button>
    </div>

    <!-- 版本列表视图 -->
    <template v-if="viewMode === 'list'">
      <div :class="$style.versionPanel">
        <!-- 操作栏 -->
        <div :class="$style.versionHeader">
          <div :class="$style.versionHeaderLeft">
            <span :class="$style.versionTitle">版本列表</span>
            <span :class="$style.versionBadge">
              共 {{ versionStore.total }} 个版本
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <el-button
              :class="$style.compareBtn"
              type="primary"
              size="small"
              :disabled="!canCompare"
              @click="handleCompare"
            >
              对比选中版本
            </el-button>
            <el-button size="small" text @click="handleRefresh">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </div>
        </div>

        <!-- 列表 -->
        <el-scrollbar :class="$style.versionList">
          <div v-if="versionStore.loading" :class="$style.versionLoading">
            加载中...
          </div>
          <div v-else-if="versionStore.isEmpty" :class="$style.versionEmpty">
            暂无版本记录
          </div>
          <template v-else>
            <div
              v-for="entry in versionStore.versions"
              :key="entry.version"
              :class="[
                $style.versionItem,
                { [$style.versionItemCurrent]: entry.version === versionStore.currentVersion },
                { [$style.versionItemSelected]: isSelected(entry.version) },
              ]"
            >
              <div :class="$style.versionItemLeft" @click="toggleSelect(entry.version)">
                <el-checkbox
                  :class="$style.versionCheckbox"
                  :model-value="isSelected(entry.version)"
                  @click.stop
                  @change="toggleSelect(entry.version)"
                />
                <div :class="$style.versionInfo">
                  <span :class="$style.versionTime">
                    {{ formatVersion(entry.version) }}
                  </span>
                  <div :class="$style.versionTags">
                    <el-tag v-if="entry.published" type="success" size="small">
                      已发布
                    </el-tag>
                    <el-tag v-if="entry.version === versionStore.currentVersion" type="primary" size="small">
                      当前
                    </el-tag>
                    <el-tag v-if="getSideLabel(entry.version)" type="warning" size="small">
                      {{ getSideLabel(entry.version) }}
                    </el-tag>
                  </div>
                </div>
              </div>

              <div :class="$style.versionItemRight">
                <el-tooltip content="回滚到此版本" placement="top">
                  <el-button
                    size="small"
                    text
                    :disabled="entry.version === versionStore.currentVersion"
                    @click.stop="handleRollback(entry.version)"
                  >
                    <el-icon><RefreshLeft /></el-icon>
                  </el-button>
                </el-tooltip>
                <el-tooltip content="导出" placement="top">
                  <el-button
                    size="small"
                    text
                    @click.stop="handleExport(entry.version)"
                  >
                    <el-icon><Download /></el-icon>
                  </el-button>
                </el-tooltip>
                <el-tooltip
                  v-if="!entry.published && entry.version !== versionStore.currentVersion"
                  content="删除此版本"
                  placement="top"
                >
                  <el-button
                    size="small"
                    text
                    type="danger"
                    @click.stop="handleDelete(entry)"
                  >
                    <el-icon><Close /></el-icon>
                  </el-button>
                </el-tooltip>
              </div>
            </div>
          </template>
        </el-scrollbar>

        <!-- 分页 -->
        <div v-if="versionStore.total > versionStore.pageSize" :class="$style.versionPagination">
          <el-pagination
            :current-page="versionStore.page"
            :page-size="versionStore.pageSize"
            :total="versionStore.total"
            layout="prev, pager, next"
            small
            @current-change="(p: number) => versionStore.goToPage(p)"
          />
        </div>
      </div>
    </template>

    <!-- 对比视图 -->
    <template v-if="viewMode === 'compare'">
      <div :class="$style.comparePanel">
        <!-- 对比头部 -->
        <div :class="$style.compareHeader">
          <span :class="$style.compareTitle">版本对比</span>
          <el-button :class="$style.compareBack" size="small" text @click="handleBackToList">
            返回列表
          </el-button>
        </div>

        <!-- 对比信息 -->
        <div :class="$style.compareInfo">
          <span :class="$style.compareLabel">旧版本:</span>
          <span :class="$style.compareVersion">{{ formatVersion(versionStore.compareLeft) }}</span>
          <el-icon :class="$style.compareArrow" :size="12"><ArrowRight /></el-icon>
          <span :class="$style.compareLabel">新版本:</span>
          <span :class="$style.compareVersion">{{ formatVersion(versionStore.compareRight) }}</span>
        </div>

        <!-- Summary -->
        <div v-if="versionStore.hasDiff" :class="$style.summary">
          <span :class="$style.summaryItem">
            <span :class="$style.dot" :style="{ background: '#67c23a' }" />
            新增 {{ diffSummaryCounts.added }}
          </span>
          <span :class="$style.summaryItem">
            <span :class="$style.dot" :style="{ background: '#f56c6c' }" />
            删除 {{ diffSummaryCounts.removed }}
          </span>
          <span :class="$style.summaryItem">
            <span :class="$style.dot" :style="{ background: '#e6a23c' }" />
            修改 {{ diffSummaryCounts.modified }}
          </span>
          <span :class="$style.summaryItem">
            <span :class="$style.dot" :style="{ background: '#409eff' }" />
            移动 {{ diffSummaryCounts.moved }}
          </span>
        </div>

        <!-- Loading -->
        <div v-if="versionStore.compareLoading" :class="$style.compareLoading">
          <el-icon class="is-loading"><Refresh /></el-icon>
          <span>正在对比...</span>
        </div>

        <!-- Error -->
        <div v-else-if="versionStore.hasError" :class="$style.compareError">
          {{ versionStore.error }}
        </div>

        <!-- No diff -->
        <div v-else-if="!versionStore.hasDiff" :class="$style.noDiff">
          两个版本完全相同
        </div>

        <!-- Diff table -->
        <el-scrollbar v-else :class="$style.diffScroll">
          <table :class="$style.diffTable">
            <thead>
              <tr>
                <th :class="$style.diffTh">字段</th>
                <th :class="$style.diffTh">详情</th>
                <th :class="$style.diffTh">状态</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in diffRows"
                :key="row.id + row.status"
                :class="[
                  $style.diffTr,
                  $style[`diffTr${row.status.charAt(0).toUpperCase() + row.status.slice(1)}`],
                ]"
              >
                <td :class="$style.diffTd">
                  <div>
                    <span :class="$style.diffWidgetName">
                      {{ row.label || row.name || row.type }}
                    </span>
                    <span :class="$style.diffWidgetType">({{ row.type }})</span>
                  </div>
                  <div :class="$style.diffPath">{{ row.path }}</div>
                </td>
                <td :class="$style.diffTd">
                  <!-- 修改的字段详情 -->
                  <div v-if="row.status === 'modified' && row.changes?.length" :class="$style.changesList">
                    <div
                      v-for="(change, ci) in row.changes"
                      :key="ci"
                      :class="$style.changeItem"
                    >
                      <span :class="$style.changeField">{{ change.field }}</span>
                      <span :class="$style.changeOld">{{ formatChangeValue(change.oldValue) }}</span>
                      <span :class="$style.changeArrow">&rarr;</span>
                      <span :class="$style.changeNew">{{ formatChangeValue(change.newValue) }}</span>
                    </div>
                  </div>
                  <span v-else-if="row.status === 'added'">新增部件</span>
                  <span v-else-if="row.status === 'removed'">已删除</span>
                  <span v-else-if="row.status === 'moved'">位置变更</span>
                </td>
                <td :class="$style.diffTd">
                  <span
                    :class="$style.statusBadge"
                    :style="{ background: getStatusColor(row.status) }"
                  >
                    {{ getStatusLabel(row.status) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </el-scrollbar>
      </div>
    </template>
  </div>
</template>

<style module src="./SchemaVersionCompare.module.css" />
