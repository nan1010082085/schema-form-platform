<script setup lang="ts">
/**
 * CredentialListView -- Credential management page
 *
 * Table display with search, type filter, pagination, create/edit/delete.
 */
import { onMounted, ref, watch } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import { AddIcon, SearchIcon, KeyIcon } from 'tdesign-icons-vue-next'
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
    MessagePlugin.error(credentialStore.error || 'Failed to fetch credential details')
  }
}

async function handleDelete(credential: CredentialItem) {
  const confirmDia = DialogPlugin.confirm({
    header: 'Confirm Delete',
    body: `Delete credential "${credential.name}"? This cannot be undone.`,
    theme: 'warning',
    confirmBtn: 'Delete',
    onConfirm: async () => {
      const ok = await credentialStore.deleteCredential(credential.id)
      if (ok) MessagePlugin.success('Credential deleted')
      else MessagePlugin.error(credentialStore.error || 'Delete failed')
      confirmDia.hide()
    },
  })
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

function typeTagTheme(type: CredentialType): 'success' | 'default' | 'warning' {
  const map: Record<CredentialType, 'success' | 'default' | 'warning'> = {
    api_key: 'success',
    basic_auth: 'default',
    bearer_token: 'warning',
  }
  return map[type]
}
</script>

<template>
  <div :class="styles.credentialView">
    <div :class="styles.scrollbar">
      <!-- Header -->
      <div :class="styles.header">
        <div :class="styles.titleRow">
          <div>
            <h1 :class="styles.title">Credentials</h1>
            <p :class="styles.subtitle">Manage API keys, tokens, and authentication credentials</p>
          </div>
          <div :class="styles.headerActions">
            <t-button theme="primary" @click="openCreateDialog">
              <template #icon><AddIcon /></template>
              Create Credential
            </t-button>
          </div>
        </div>

        <!-- Toolbar -->
        <div :class="styles.toolbar">
          <div :class="styles.toolbarLeft">
            <t-input
              v-model:value="searchInput"
              placeholder="Search by name..."
              clearable
              :class="styles.searchInput"
              @input="handleSearch"
              @clear="handleSearch('')"
            >
              <template #prefix-icon><SearchIcon /></template>
            </t-input>
            <t-select v-model:value="activeType" :class="styles.typeSelect">
              <t-option
                v-for="opt in typeOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </t-select>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="credentialStore.loading && !credentialStore.hasCredentials" :class="styles.tableWrapper">
        <t-skeleton :row-col="[{ width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }]" animation="gradient" />
      </div>

      <!-- Empty -->
      <div v-else-if="credentialStore.isEmpty" :class="styles.emptyState">
        <div :class="styles.emptyIcon">
          <KeyIcon :size="64" />
        </div>
        <h2 :class="styles.emptyTitle">No credentials yet</h2>
        <p :class="styles.emptyDesc">Create your first credential to get started</p>
        <t-button theme="primary" @click="openCreateDialog">
          <template #icon><AddIcon /></template>
          Create Credential
        </t-button>
      </div>

      <!-- Table -->
      <div v-else :class="styles.tableWrapper">
        <t-table
          :data="credentialStore.credentials"
          :columns="[
            { colKey: 'name', title: 'Name', minWidth: 200, ellipsis: true },
            { colKey: 'type', title: 'Type', width: 140 },
            { colKey: 'createdAt', title: 'Created', width: 170 },
            { colKey: 'updatedAt', title: 'Updated', width: 170 },
            { colKey: 'actions', title: 'Actions', width: 150, fixed: 'right' },
          ]"
          stripe
          row-key="id"
        >
          <template #type="{ row }">
            <t-tag :theme="typeTagTheme(row.type)" size="small">{{ typeLabel(row.type) }}</t-tag>
          </template>
          <template #createdAt="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
          <template #updatedAt="{ row }">
            {{ formatDate(row.updatedAt) }}
          </template>
          <template #actions="{ row }">
            <t-button size="small" variant="text" theme="primary" @click="openEditDialog(row)">编辑</t-button>
            <t-button size="small" variant="text" theme="danger" @click="handleDelete(row)">删除</t-button>
          </template>
        </t-table>

        <!-- Pagination -->
        <div v-if="credentialStore.pagination.total > 0" :class="styles.pagination">
          <t-pagination
            v-model:value="credentialStore.pagination.page"
            :page-size="credentialStore.pagination.pageSize"
            :total="credentialStore.pagination.total"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>

    <!-- Create/Edit Dialog -->
    <CredentialFormDialog
      v-model:visible="formDialogVisible"
      :initial-data="editingCredential"
      @saved="handleSaved"
    />
  </div>
</template>
