<script setup lang="ts">
/**
 * TenantListView — 租户管理页
 *
 * 表格展示所有租户，支持搜索、状态筛选、分页、创建/编辑/启停用/删除。
 */
import { onMounted, ref, watch } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import { AddIcon, SearchIcon, UserIcon } from 'tdesign-icons-vue-next'
import { useTenantStore } from '@/stores/tenant'
import TenantFormDialog from '@/components/System/TenantFormDialog.vue'
import type { TenantItem, TenantStatus } from '@/types/tenant'
import styles from './TenantListView.module.scss'

const tenantStore = useTenantStore()

const searchInput = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '启用', value: 'active' },
  { label: '停用', value: 'inactive' },
  { label: '冻结', value: 'suspended' },
]

const activeStatus = ref<TenantStatus | ''>('')

// ── 弹窗状态 ──
const formDialogVisible = ref(false)
const editingTenant = ref<TenantItem | null>(null)

// ── 数据加载 ──
onMounted(() => {
  tenantStore.fetchTenants()
})

function handleSearch(val: string) {
  searchInput.value = val
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    tenantStore.fetchTenants({ search: val, status: activeStatus.value, page: 1 })
  }, 300)
}

watch(activeStatus, (val) => {
  tenantStore.fetchTenants({
    search: searchInput.value || undefined,
    status: val,
    page: 1,
  })
})

function handlePageChange(page: number) {
  tenantStore.fetchTenants({
    search: searchInput.value || undefined,
    status: activeStatus.value,
    page,
  })
}

// ── CRUD 操作 ──
function openCreateDialog() {
  editingTenant.value = null
  formDialogVisible.value = true
}

function openEditDialog(tenant: TenantItem) {
  editingTenant.value = tenant
  formDialogVisible.value = true
}

async function handleDelete(tenant: TenantItem) {
  const confirmDia = DialogPlugin.confirm({
    header: '删除确认',
    body: `确认删除租户 "${tenant.name}"？删除后不可恢复。`,
    theme: 'warning',
    confirmBtn: '删除',
    onConfirm: async () => {
      const ok = await tenantStore.deleteTenant(tenant.id)
      if (ok) MessagePlugin.success('已删除')
      else MessagePlugin.error(tenantStore.error || '删除失败')
      confirmDia.hide()
    },
  })
}

async function handleToggleStatus(tenant: TenantItem) {
  const newStatus: TenantStatus = tenant.status === 'active' ? 'inactive' : 'active'
  const actionLabel = newStatus === 'active' ? '启用' : '停用'
  const confirmDia = DialogPlugin.confirm({
    header: `${actionLabel}确认`,
    body: `确认${actionLabel}租户 "${tenant.name}"？`,
    theme: 'info',
    confirmBtn: actionLabel,
    onConfirm: async () => {
      const result = await tenantStore.toggleTenantStatus(tenant.id, newStatus)
      if (result) MessagePlugin.success(`已${actionLabel}`)
      else MessagePlugin.error(tenantStore.error || `${actionLabel}失败`)
      confirmDia.hide()
    },
  })
}

function handleSaved() {
  tenantStore.fetchTenants({
    search: searchInput.value || undefined,
    status: activeStatus.value,
  })
}

// ── 辅助函数 ──
function formatDate(d: string): string {
  return new Date(d).toLocaleString('zh-CN')
}

function statusLabel(status: TenantStatus): string {
  const map: Record<TenantStatus, string> = { active: '启用', inactive: '停用', suspended: '冻结' }
  return map[status]
}

function statusTagTheme(status: TenantStatus): 'success' | 'default' | 'warning' {
  const map: Record<TenantStatus, 'success' | 'default' | 'warning'> = {
    active: 'success',
    inactive: 'default',
    suspended: 'warning',
  }
  return map[status]
}
</script>

<template>
  <div :class="styles.tenantView">
    <div :class="styles.scrollbar">
      <!-- Header -->
      <div :class="styles.header">
        <div :class="styles.titleRow">
          <div>
            <h1 :class="styles.title">租户管理</h1>
            <p :class="styles.subtitle">管理系统中的所有租户</p>
          </div>
          <div :class="styles.headerActions">
            <t-button theme="primary" @click="openCreateDialog">
              <template #icon><AddIcon /></template>
              创建租户
            </t-button>
          </div>
        </div>

        <!-- Toolbar -->
        <div :class="styles.toolbar">
          <div :class="styles.toolbarLeft">
            <t-input
              v-model="searchInput"
              placeholder="搜索名称或编码..."
              clearable
              :class="styles.searchInput"
              @input="handleSearch"
              @clear="handleSearch('')"
            >
              <template #prefix-icon><SearchIcon /></template>
            </t-input>
            <t-select v-model="activeStatus" :class="styles.statusSelect">
              <t-option
                v-for="opt in statusOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </t-select>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="tenantStore.loading && !tenantStore.hasTenants" :class="styles.tableWrapper">
        <t-skeleton :row-col="[{ width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }]" animation="gradient" />
      </div>

      <!-- Empty -->
      <div v-else-if="tenantStore.isEmpty" :class="styles.emptyState">
        <div :class="styles.emptyIcon">
          <UserIcon :size="64" />
        </div>
        <h2 :class="styles.emptyTitle">暂无租户</h2>
        <p :class="styles.emptyDesc">创建第一个租户来开始使用</p>
        <t-button theme="primary" @click="openCreateDialog">
          <template #icon><AddIcon /></template>
          创建租户
        </t-button>
      </div>

      <!-- Table -->
      <div v-else :class="styles.tableWrapper">
        <t-table
          :data="tenantStore.tenants"
          :columns="[
            { colKey: 'name', title: '租户名称', minWidth: 160, ellipsis: true },
            { colKey: 'code', title: '编码', minWidth: 140, ellipsis: true },
            { colKey: 'status', title: '状态', width: 100 },
            { colKey: 'maxUsers', title: '用户上限', width: 100, align: 'center' },
            { colKey: 'features', title: '功能特性', minWidth: 180 },
            { colKey: 'createdAt', title: '创建时间', width: 170 },
            { colKey: 'actions', title: '操作', width: 200, fixed: 'right' },
          ]"
          stripe
          row-key="id"
        >
          <template #code="{ row }">
            <t-tag size="small" theme="default">{{ row.code }}</t-tag>
          </template>
          <template #status="{ row }">
            <div :class="styles.stateCell">
              <span :class="[styles.stateDot, styles[`stateDot${row.status.charAt(0).toUpperCase()}${row.status.slice(1)}`]]" />
              <t-tag :theme="statusTagTheme(row.status)" size="small">{{ statusLabel(row.status) }}</t-tag>
            </div>
          </template>
          <template #maxUsers="{ row }">
            {{ row.config.maxUsers }}
          </template>
          <template #features="{ row }">
            <div :class="styles.featureTags">
              <template v-if="row.config.features.length">
                <t-tag
                  v-for="feat in row.config.features"
                  :key="feat"
                  size="small"
                  theme="default"
                  :class="styles.featureTag"
                >{{ feat }}</t-tag>
              </template>
              <span v-else :class="styles.placeholderDash">-</span>
            </div>
          </template>
          <template #createdAt="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
          <template #actions="{ row }">
            <t-button size="small" variant="text" theme="primary" @click="openEditDialog(row)">编辑</t-button>
            <t-button
              size="small"
              variant="text"
              :theme="row.status === 'active' ? 'warning' : 'success'"
              @click="handleToggleStatus(row)"
            >
              {{ row.status === 'active' ? '停用' : '启用' }}
            </t-button>
            <t-button size="small" variant="text" theme="danger" @click="handleDelete(row)">删除</t-button>
          </template>
        </t-table>

        <!-- Pagination -->
        <div v-if="tenantStore.pagination.total > 0" :class="styles.pagination">
          <t-pagination
            v-model="tenantStore.pagination.page"
            :page-size="tenantStore.pagination.pageSize"
            :total="tenantStore.pagination.total"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>

    <!-- Create/Edit Dialog -->
    <TenantFormDialog
      v-model:visible="formDialogVisible"
      :initial-data="editingTenant"
      @saved="handleSaved"
    />
  </div>
</template>
