<script setup lang="ts">
/**
 * TenantListView — 租户管理页
 *
 * 表格展示所有租户，支持搜索、状态筛选、分页、创建/编辑/启停用/删除。
 */
import { onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useTenantStore } from '@/stores/tenant'
import TenantFormDialog from '@/components/System/TenantFormDialog.vue'
import type { TenantItem, TenantStatus } from '@/types/tenant'
import styles from './TenantListView.module.scss'
import AppIcon from '@schema-form/shared-components/common/AppIcon.vue'

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
  try {
    await ElMessageBox.confirm(
      `确认删除租户 "${tenant.name}"？删除后不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    const ok = await tenantStore.deleteTenant(tenant.id)
    if (ok) ElMessage.success('已删除')
    else ElMessage.error(tenantStore.error || '删除失败')
  } catch {
    // 用户取消
  }
}

async function handleToggleStatus(tenant: TenantItem) {
  const newStatus: TenantStatus = tenant.status === 'active' ? 'inactive' : 'active'
  const actionLabel = newStatus === 'active' ? '启用' : '停用'
  try {
    await ElMessageBox.confirm(
      `确认${actionLabel}租户 "${tenant.name}"？`,
      `${actionLabel}确认`,
      {
        confirmButtonText: actionLabel,
        cancelButtonText: '取消',
        type: 'info',
      }
    )
    const result = await tenantStore.toggleTenantStatus(tenant.id, newStatus)
    if (result) ElMessage.success(`已${actionLabel}`)
    else ElMessage.error(tenantStore.error || `${actionLabel}失败`)
  } catch {
    // 用户取消
  }
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

function statusTagType(status: TenantStatus): 'success' | 'info' | 'warning' {
  const map: Record<TenantStatus, 'success' | 'info' | 'warning'> = {
    active: 'success',
    inactive: 'info',
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
            <el-button type="primary" @click="openCreateDialog">
              <AppIcon name="plus" />
              创建租户
            </el-button>
          </div>
        </div>

        <!-- Toolbar -->
        <div :class="styles.toolbar">
          <div :class="styles.toolbarLeft">
            <el-input
              v-model="searchInput"
              placeholder="搜索名称或编码..."
              clearable
              :class="styles.searchInput"
              @input="handleSearch"
              @clear="handleSearch('')"
            >
              <template #prefix>
                <AppIcon name="search" />
              </template>
            </el-input>
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
      <div v-if="tenantStore.loading && !tenantStore.hasTenants" :class="styles.tableWrapper">
        <el-skeleton :rows="8" animated />
      </div>

      <!-- Empty -->
      <div v-else-if="tenantStore.isEmpty" :class="styles.emptyState">
        <div :class="styles.emptyIcon">
          <AppIcon name="user" :size="64" />
        </div>
        <h2 :class="styles.emptyTitle">暂无租户</h2>
        <p :class="styles.emptyDesc">创建第一个租户来开始使用</p>
        <el-button type="primary" @click="openCreateDialog">
          <AppIcon name="plus" />
          创建租户
        </el-button>
      </div>

      <!-- Table -->
      <div v-else :class="styles.tableWrapper">
        <el-table
          :data="tenantStore.tenants"
          stripe
          row-key="id"
        >
          <el-table-column prop="name" label="租户名称" min-width="160" show-overflow-tooltip />
          <el-table-column prop="code" label="编码" min-width="140" show-overflow-tooltip>
            <template #default="{ row }">
              <el-tag size="small">{{ row.code }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <div :class="styles.stateCell">
                <span :class="[styles.stateDot, styles[`stateDot${row.status.charAt(0).toUpperCase()}${row.status.slice(1)}`]]" />
                <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="maxUsers" label="用户上限" width="100" align="center">
            <template #default="{ row }">
              {{ row.config.maxUsers }}
            </template>
          </el-table-column>
          <el-table-column prop="features" label="功能特性" min-width="180">
            <template #default="{ row }">
              <div :class="styles.featureTags">
                <template v-if="row.config.features.length">
                  <el-tag
                    v-for="feat in row.config.features"
                    :key="feat"
                    size="small"
                    :class="styles.featureTag"
                  >{{ feat }}</el-tag>
                </template>
                <span v-else :class="styles.placeholderDash">-</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="170">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button size="small" type="primary" link @click="openEditDialog(row)">编辑</el-button>
              <el-button
                size="small"
                :type="row.status === 'active' ? 'warning' : 'success'"
                link
                @click="handleToggleStatus(row)"
              >
                {{ row.status === 'active' ? '停用' : '启用' }}
              </el-button>
              <el-button size="small" type="danger" link @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- Pagination -->
        <div v-if="tenantStore.pagination.total > 0" :class="styles.pagination">
          <el-pagination
            v-model:current-page="tenantStore.pagination.page"
            :page-size="tenantStore.pagination.pageSize"
            :total="tenantStore.pagination.total"
            layout="prev, pager, next"
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
