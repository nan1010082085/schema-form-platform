<script setup lang="ts">
/**
 * WorkflowListView — 工作流管理列表页
 *
 * 卡片/列表双视图，支持搜索、按状态筛选、分页、发布/归档、复制、删除。
 */
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@schema-form/shared-components/common/AppIcon.vue'
import {
  fetchWorkflows,
  deleteWorkflow,
  toggleWorkflowStatus,
  duplicateWorkflow,
  type WorkflowItem,
} from '@/utils/apiClient'
import WorkflowCard from '@/components/WorkflowCard.vue'
import type { PaginatedResponse } from '@/types/api'
import styles from './WorkflowListView.module.scss'

const router = useRouter()

// ---- 视图模式 ----
const viewMode = ref<'card' | 'list'>('card')

// ---- 数据 ----
const workflows = ref<WorkflowItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)

// ---- 筛选 ----
const searchInput = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null
const activeStatus = ref('')

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '草稿', value: 'draft' },
  { label: '已发布', value: 'published' },
  { label: '已归档', value: 'archived' },
]

// ---- 加载列表 ----
async function loadWorkflows() {
  loading.value = true
  try {
    const res: PaginatedResponse<WorkflowItem> = await fetchWorkflows({
      status: activeStatus.value || undefined,
      search: searchInput.value.trim() || undefined,
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

function handleSearch(val: string) {
  searchInput.value = val
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    loadWorkflows()
  }, 300)
}

watch(activeStatus, () => {
  page.value = 1
  loadWorkflows()
})

// ---- 分页 ----
function handlePageChange(p: number) {
  page.value = p
  loadWorkflows()
}

// ---- 创建 ----
function handleCreate() {
  router.push('/workflow/create')
}

// ---- 编辑 ----
function handleEdit(item: WorkflowItem) {
  router.push(`/workflow/${item.id}`)
}

// ---- 复制 ----
async function handleDuplicate(item: WorkflowItem) {
  try {
    await duplicateWorkflow(item.id)
    ElMessage.success('已复制')
    await loadWorkflows()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '复制失败')
  }
}

// ---- 发布/归档 ----
async function handleToggleStatus(item: WorkflowItem) {
  const nextStatus = item.status === 'published' ? 'archived' : 'published'
  const actionLabel = nextStatus === 'published' ? '发布' : '归档'
  const confirmDia = DialogPlugin.confirm({
    header: `${actionLabel}确认`,
    body: `确认${actionLabel}工作流「${item.name}」？`,
    theme: 'warning',
    confirmBtn: actionLabel,
    onConfirm: async () => {
      await toggleWorkflowStatus(item.id, nextStatus)
      ElMessage.success(`已${actionLabel}`)
      await loadWorkflows()
      confirmDia.hide()
    },
  })
}

// ---- 删除 ----
async function handleDelete(item: WorkflowItem) {
  const confirmDia = DialogPlugin.confirm({
    header: '删除确认',
    body: `确认删除工作流「${item.name}」？删除后不可恢复。`,
    theme: 'warning',
    confirmBtn: '删除',
    onConfirm: async () => {
      await deleteWorkflow(item.id)
      ElMessage.success('已删除')
      await loadWorkflows()
      confirmDia.hide()
    },
  })
}

// ---- 辅助函数 ----
function formatDate(d: string): string {
  return new Date(d).toLocaleString('zh-CN')
}

function statusLabel(status: string): string {
  const map: Record<string, string> = { draft: '草稿', published: '已发布', archived: '已归档' }
  return map[status] ?? status
}

function statusTagTheme(status: string): 'default' | 'success' | 'warning' {
  const map: Record<string, 'default' | 'success' | 'warning'> = {
    draft: 'default',
    published: 'success',
    archived: 'warning',
  }
  return map[status] ?? 'default'
}
</script>

<template>
  <div :class="styles.workflowView">
    <div :class="styles.scrollbar">
      <!-- Header -->
      <div :class="styles.header">
        <div :class="styles.titleRow">
          <div>
            <h1 :class="styles.title">工作流管理</h1>
            <p :class="styles.subtitle">创建和管理表单工作流</p>
          </div>
          <div :class="styles.headerActions">
            <t-button theme="primary" @click="handleCreate">
              <template #icon><AddIcon /></template>
              创建工作流
            </t-button>
          </div>
        </div>

        <!-- Toolbar -->
        <div :class="styles.toolbar">
          <div :class="styles.toolbarLeft">
            <t-input
              v-model:value="searchInput"
              placeholder="搜索工作流名称..."
              clearable
              :class="styles.searchInput"
              @input="handleSearch"
              @clear="handleSearch('')"
            >
              <template #prefix-icon><SearchIcon /></template>
            </t-input>
            <t-select v-model:value="activeStatus" :class="styles.statusSelect" placeholder="状态筛选">
              <t-option
                v-for="opt in statusOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </t-select>
          </div>
          <div :class="styles.toolbarRight">
            <div :class="styles.viewToggle">
              <t-popup content="卡片视图" placement="top" :show-after="300">
                <t-button
                  :theme="viewMode === 'card' ? 'primary' : 'default'"
                  size="small"
                  @click="viewMode = 'card'"
                >
                  <template #icon><GridViewIcon /></template>
                </t-button>
              </t-popup>
              <t-popup content="列表视图" placement="top" :show-after="300">
                <t-button
                  :theme="viewMode === 'list' ? 'primary' : 'default'"
                  size="small"
                  @click="viewMode = 'list'"
                >
                  <template #icon><OrderListIcon /></template>
                </t-button>
              </t-popup>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading && workflows.length === 0" :class="styles.content">
        <t-skeleton :row-col="[{ width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }]" animation="gradient" />
      </div>

      <!-- Empty -->
      <div v-else-if="total === 0 && !loading" :class="styles.emptyState">
        <div :class="styles.emptyIcon">
          <SettingIcon :size="64" />
        </div>
        <h2 :class="styles.emptyTitle">暂无工作流</h2>
        <p :class="styles.emptyDesc">点击「创建工作流」开始构建自动化流程</p>
        <t-button theme="primary" size="large" @click="handleCreate">
          <template #icon><AddIcon /></template>
          创建工作流
        </t-button>
      </div>

      <!-- Card View -->
      <div v-else-if="viewMode === 'card'" :class="styles.content">
        <div :class="styles.cardGrid">
          <WorkflowCard
            v-for="item in workflows"
            :key="item.id"
            :item="item"
            @edit="handleEdit"
            @duplicate="handleDuplicate"
            @publish="handleToggleStatus"
            @delete="handleDelete"
          />
        </div>

        <div v-if="total > 0" :class="styles.pagination">
          <t-pagination
            v-model:value="page"
            :page-size="pageSize"
            :total="total"
            @current-change="handlePageChange"
          />
        </div>
      </div>

      <!-- List View -->
      <div v-else :class="styles.content">
        <t-loading :loading="loading">
          <t-table
            :data="workflows"
            :columns="[
              { colKey: 'name', title: '名称', minWidth: 180, ellipsis: true },
              { colKey: 'description', title: '描述', minWidth: 200, ellipsis: true },
              { colKey: 'status', title: '状态', width: 100 },
              { colKey: 'createdAt', title: '创建时间', width: 170 },
              { colKey: 'actions', title: '操作', width: 220, fixed: 'right' },
            ]"
            stripe
            row-key="id"
          >
            <template #description="{ row }">
              {{ row.description || '-' }}
            </template>
            <template #status="{ row }">
              <t-tag :theme="statusTagTheme(row.status)" size="small">
                {{ statusLabel(row.status) }}
              </t-tag>
            </template>
            <template #createdAt="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
            <template #actions="{ row }">
              <t-button size="small" variant="text" theme="primary" @click="handleEdit(row)">编辑</t-button>
              <t-button size="small" variant="text" @click="handleDuplicate(row)">复制</t-button>
              <t-button
                size="small"
                variant="text"
                :theme="row.status === 'published' ? 'warning' : 'success'"
                @click="handleToggleStatus(row)"
              >
                {{ row.status === 'published' ? '归档' : '发布' }}
              </t-button>
              <t-button size="small" variant="text" theme="danger" @click="handleDelete(row)">删除</t-button>
            </template>
          </t-table>
        </t-loading>

        <div v-if="total > 0" :class="styles.pagination">
          <t-pagination
            v-model:value="page"
            :page-size="pageSize"
            :total="total"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>
