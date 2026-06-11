<script setup lang="ts">
/**
 * WorkflowListView — 工作流管理列表页
 *
 * CRUD 工作流，支持按状态筛选、分页、发布/停用、删除。
 */
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Setting } from '@element-plus/icons-vue'
import {
  fetchWorkflows,
  deleteWorkflow,
  toggleWorkflowStatus,
  type WorkflowItem,
} from '@/utils/apiClient'
import type { PaginatedResponse } from '@/types/api'
import styles from './WorkflowListView.module.scss'

const router = useRouter()

// ── 数据 ──
const workflows = ref<WorkflowItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)

// ── 筛选 ──
const activeStatus = ref('')

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '草稿', value: 'draft' },
  { label: '已发布', value: 'published' },
  { label: '已归档', value: 'archived' },
]

// ── 加载列表 ──
async function loadWorkflows() {
  loading.value = true
  try {
    const res: PaginatedResponse<WorkflowItem> = await fetchWorkflows({
      status: activeStatus.value || undefined,
      page: page.value,
      pageSize: pageSize.value,
    })
    workflows.value = res.items
    total.value = res.total
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '加载工作流列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadWorkflows)

watch(activeStatus, () => {
  page.value = 1
  loadWorkflows()
})

// ── 分页 ──
function handlePageChange(p: number) {
  page.value = p
  loadWorkflows()
}

// ── 创建 ──
async function handleCreate() {
  router.push('/workflow/create')
}

// ── 编辑 ──
function handleEdit(item: WorkflowItem) {
  router.push(`/workflow/${item.id}`)
}

// ── 发布/归档 ──
async function handleToggleStatus(item: WorkflowItem) {
  const nextStatus = item.status === 'published' ? 'archived' : 'published'
  const actionLabel = nextStatus === 'published' ? '发布' : '归档'
  try {
    await ElMessageBox.confirm(
      `确认${actionLabel}工作流「${item.name}」？`,
      `${actionLabel}确认`,
      { type: 'warning', confirmButtonText: actionLabel },
    )
    await toggleWorkflowStatus(item.id, nextStatus)
    ElMessage.success(`已${actionLabel}`)
    await loadWorkflows()
  } catch { /* cancelled */ }
}

// ── 删除 ──
async function handleDelete(item: WorkflowItem) {
  try {
    await ElMessageBox.confirm(
      `确认删除工作流「${item.name}」？删除后不可恢复。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', confirmButtonClass: 'el-button--danger' },
    )
    await deleteWorkflow(item.id)
    ElMessage.success('已删除')
    await loadWorkflows()
  } catch { /* cancelled */ }
}

// ── 辅助函数 ──
function formatDate(d: string): string {
  return new Date(d).toLocaleString('zh-CN')
}

function statusLabel(status: string): string {
  const map: Record<string, string> = { draft: '草稿', published: '已发布', archived: '已归档' }
  return map[status] ?? status
}

function statusTagType(status: string): '' | 'success' | 'info' | 'warning' | 'danger' {
  const map: Record<string, '' | 'success' | 'info' | 'warning' | 'danger'> = {
    draft: 'info',
    published: 'success',
    archived: 'warning',
  }
  return map[status] ?? 'info'
}
</script>

<template>
  <div :class="styles.workflowView">
    <el-scrollbar :class="styles.scrollbar">
      <!-- Header -->
      <div :class="styles.header">
        <div :class="styles.titleRow">
          <div>
            <h1 :class="styles.title">工作流管理</h1>
            <p :class="styles.subtitle">创建和管理表单工作流</p>
          </div>
          <div :class="styles.headerActions">
            <el-button type="primary" :icon="Plus" @click="handleCreate">
              创建工作流
            </el-button>
          </div>
        </div>

        <!-- Toolbar -->
        <div :class="styles.toolbar">
          <div :class="styles.toolbarLeft">
            <el-select v-model="activeStatus" :class="styles.statusSelect">
              <el-option
                v-for="opt in statusOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading && workflows.length === 0" :class="styles.tableWrapper">
        <el-skeleton :rows="8" animated />
      </div>

      <!-- Empty -->
      <div v-else-if="total === 0 && !loading" :class="styles.emptyState">
        <div :class="styles.emptyIcon">
          <el-icon :size="64"><Setting /></el-icon>
        </div>
        <h2 :class="styles.emptyTitle">暂无工作流</h2>
        <p :class="styles.emptyDesc">点击「创建工作流」开始构建自动化流程</p>
      </div>

      <!-- Table -->
      <div v-else :class="styles.tableWrapper">
        <el-table :data="workflows" stripe style="width: 100%" v-loading="loading">
          <el-table-column prop="name" label="名称" min-width="180" show-overflow-tooltip />
          <el-table-column label="关联表单" min-width="160" show-overflow-tooltip>
            <template #default="{ row }">
              {{ row.formSchemaId ?? '-' }}
            </template>
          </el-table-column>
          <el-table-column label="关联流程" min-width="160" show-overflow-tooltip>
            <template #default="{ row }">
              {{ row.flowDefinitionId ?? '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="statusTagType(row.status)" size="small">
                {{ statusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="170">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button size="small" text type="primary" @click="handleEdit(row)">编辑</el-button>
              <el-button
                size="small"
                text
                :type="row.status === 'published' ? 'warning' : 'success'"
                @click="handleToggleStatus(row)"
              >
                {{ row.status === 'published' ? '归档' : '发布' }}
              </el-button>
              <el-button size="small" text type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- Pagination -->
        <div v-if="total > 0" :class="styles.pagination">
          <el-pagination
            v-model:current-page="page"
            :page-size="pageSize"
            :total="total"
            layout="total, prev, pager, next"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </el-scrollbar>
  </div>
</template>
