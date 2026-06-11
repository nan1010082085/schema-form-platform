<script setup lang="ts">
/**
 * CredentialListView -- Credential management page
 *
 * Table display with search, type filter, pagination, create/edit/delete.
 */
import { onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Key } from '@element-plus/icons-vue'
import { useCredentialStore } from '@/stores/credential'
import CredentialFormDialog from '@/components/Credential/CredentialFormDialog.vue'
import type { CredentialItem, CredentialDetail, CredentialType } from '@/types/credential'
import { CREDENTIAL_TYPE_LABELS } from '@/types/credential'
import styles from './CredentialListView.module.scss'

const credentialStore = useCredentialStore()

const searchInput = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

const typeOptions = [
  { label: 'All Types', value: '' },
  ...Object.entries(CREDENTIAL_TYPE_LABELS).map(([value, label]) => ({ label, value })),
]

const activeType = ref<CredentialType | ''>('')

// Dialog state
const formDialogVisible = ref(false)
const editingCredential = ref<CredentialDetail | null>(null)

// Data loading
onMounted(() => {
  credentialStore.fetchCredentials()
})

function handleSearch(val: string) {
  searchInput.value = val
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    credentialStore.fetchCredentials({ search: val, type: activeType.value, page: 1 })
  }, 300)
}

watch(activeType, (val) => {
  credentialStore.fetchCredentials({
    search: searchInput.value || undefined,
    type: val,
    page: 1,
  })
})

function handlePageChange(page: number) {
  credentialStore.fetchCredentials({
    search: searchInput.value || undefined,
    type: activeType.value,
    page,
  })
}

// CRUD operations
function openCreateDialog() {
  editingCredential.value = null
  formDialogVisible.value = true
}

async function openEditDialog(credential: CredentialItem) {
  const detail = await credentialStore.fetchCredentialById(credential.id)
  if (detail) {
    editingCredential.value = detail
    formDialogVisible.value = true
  } else {
    ElMessage.error(credentialStore.error || 'Failed to fetch credential details')
  }
}

async function handleDelete(credential: CredentialItem) {
  try {
    await ElMessageBox.confirm(
      `Delete credential "${credential.name}"? This cannot be undone.`,
      'Confirm Delete',
      { type: 'warning', confirmButtonText: 'Delete', confirmButtonClass: 'el-button--danger' },
    )
    const ok = await credentialStore.deleteCredential(credential.id)
    if (ok) ElMessage.success('Credential deleted')
    else ElMessage.error(credentialStore.error || 'Delete failed')
  } catch { /* cancelled */ }
}

function handleSaved() {
  credentialStore.fetchCredentials({
    search: searchInput.value || undefined,
    type: activeType.value,
  })
}

// Helpers
function formatDate(d: string): string {
  return new Date(d).toLocaleString('zh-CN')
}

function typeLabel(type: CredentialType): string {
  return CREDENTIAL_TYPE_LABELS[type] ?? type
}

function typeTagType(type: CredentialType): '' | 'success' | 'info' | 'warning' {
  const map: Record<CredentialType, '' | 'success' | 'info' | 'warning'> = {
    api_key: 'success',
    basic_auth: '',
    bearer_token: 'warning',
  }
  return map[type]
}
</script>

<template>
  <div :class="styles.credentialView">
    <el-scrollbar :class="styles.scrollbar">
      <!-- Header -->
      <div :class="styles.header">
        <div :class="styles.titleRow">
          <div>
            <h1 :class="styles.title">Credentials</h1>
            <p :class="styles.subtitle">Manage API keys, tokens, and authentication credentials</p>
          </div>
          <div :class="styles.headerActions">
            <el-button type="primary" :icon="Plus" @click="openCreateDialog">Create Credential</el-button>
          </div>
        </div>

        <!-- Toolbar -->
        <div :class="styles.toolbar">
          <div :class="styles.toolbarLeft">
            <el-input
              v-model="searchInput"
              :prefix-icon="Search"
              placeholder="Search by name..."
              clearable
              :class="styles.searchInput"
              @input="handleSearch"
              @clear="handleSearch('')"
            />
            <el-select v-model="activeType" :class="styles.typeSelect">
              <el-option
                v-for="opt in typeOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="credentialStore.loading && !credentialStore.hasCredentials" :class="styles.tableWrapper">
        <el-skeleton :rows="8" animated />
      </div>

      <!-- Empty -->
      <div v-else-if="credentialStore.isEmpty" :class="styles.emptyState">
        <div :class="styles.emptyIcon">
          <el-icon :size="64"><Key /></el-icon>
        </div>
        <h2 :class="styles.emptyTitle">No credentials yet</h2>
        <p :class="styles.emptyDesc">Create your first credential to get started</p>
        <el-button type="primary" :icon="Plus" @click="openCreateDialog">Create Credential</el-button>
      </div>

      <!-- Table -->
      <div v-else :class="styles.tableWrapper">
        <el-table :data="credentialStore.credentials" stripe style="width: 100%">
          <el-table-column prop="name" label="Name" min-width="200" show-overflow-tooltip />
          <el-table-column prop="type" label="Type" width="140">
            <template #default="{ row }">
              <el-tag :type="typeTagType(row.type)" size="small">{{ typeLabel(row.type) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Created" width="170">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="Updated" width="170">
            <template #default="{ row }">
              {{ formatDate(row.updatedAt) }}
            </template>
          </el-table-column>
          <el-table-column label="Actions" width="150" fixed="right">
            <template #default="{ row }">
              <el-button size="small" text type="primary" @click="openEditDialog(row)">Edit</el-button>
              <el-button size="small" text type="danger" @click="handleDelete(row)">Delete</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- Pagination -->
        <div v-if="credentialStore.pagination.total > 0" :class="styles.pagination">
          <el-pagination
            v-model:current-page="credentialStore.pagination.page"
            :page-size="credentialStore.pagination.pageSize"
            :total="credentialStore.pagination.total"
            layout="total, prev, pager, next"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </el-scrollbar>

    <!-- Create/Edit Dialog -->
    <CredentialFormDialog
      v-model:visible="formDialogVisible"
      :initial-data="editingCredential"
      @saved="handleSaved"
    />
  </div>
</template>
