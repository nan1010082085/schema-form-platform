<script setup lang="ts">
/**
 * InstancesView — Schema 实例管理页
 *
 * 卡片网格展示所有 Schema 实例。支持搜索、筛选标签、排序、批量删除。
 * 使用 el-scrollbar 替代原生滚动条。
 */
import { onMounted, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Delete, Edit, View, Promotion, List, Document, Sort } from '@element-plus/icons-vue'
import { useSchemaStore } from '@/stores/schema'
import type { SchemaListItem } from '@/types/api'

const router = useRouter()
const store = useSchemaStore()
const searchInput = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

// ---- Filter & Sort ----
const activeTab = ref<'all' | 'form' | 'search-list' | 'draft' | 'published'>('all')
const sortBy = ref<'newest' | 'oldest' | 'name'>('newest')
const bulkMode = ref(false)
const selectedIds = ref<Set<string>>(new Set())

const filterTabs = [
  { label: '全部', value: 'all' as const },
  { label: '表单', value: 'form' as const },
  { label: '搜索列表', value: 'search-list' as const },
  { label: '草稿', value: 'draft' as const },
  { label: '已发布', value: 'published' as const },
]

const sortOptions = [
  { label: '最新优先', value: 'newest' as const },
  { label: '最早优先', value: 'oldest' as const },
  { label: '名称 A-Z', value: 'name' as const },
]

// ---- Create Dialog ----
const createDialogVisible = ref(false)
const createType = ref<'form' | 'search-list'>('form')
const createName = ref('')

function openCreateDialog() {
  createName.value = ''
  createDialogVisible.value = true
}

async function confirmCreate() {
  const name = createName.value.trim()
  if (!name) {
    ElMessage.warning('请输入实例名称')
    return
  }
  const result = await store.createSchema({ name, type: createType.value, json: [] })
  if (result) {
    createDialogVisible.value = false
    ElMessage.success(`${createType.value === 'form' ? '表单' : '搜索列表'}创建成功`)
    router.push({ path: '/editor', query: { id: result.id } })
  } else {
    ElMessage.error(store.error || '创建失败')
  }
}

// ---- Data fetching ----
onMounted(() => {
  store.fetchSchemas()
})

function handleSearch(val: string) {
  searchInput.value = val
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    const filter = buildFilter()
    store.fetchSchemas({ search: val, page: 1, ...filter })
  }, 300)
}

function buildFilter(): { type?: string; status?: string } {
  const filter: { type?: string; status?: string } = {}
  if (activeTab.value === 'form') filter.type = 'form'
  else if (activeTab.value === 'search-list') filter.type = 'search_list'
  else if (activeTab.value === 'draft') filter.status = 'draft'
  else if (activeTab.value === 'published') filter.status = 'published'
  return filter
}

watch(activeTab, () => {
  const filter = buildFilter()
  store.fetchSchemas({ search: searchInput.value || undefined, page: 1, ...filter })
})

function handlePageChange(page: number) {
  const filter = buildFilter()
  store.fetchSchemas({ search: searchInput.value || undefined, page, ...filter })
}

// ---- Sort (client-side) ----
const sortedSchemas = computed(() => {
  const items = [...store.schemas]
  if (sortBy.value === 'oldest') return items.reverse()
  if (sortBy.value === 'name') return [...items].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  return items
})

// ---- CRUD ----
async function handleDelete(item: SchemaListItem) {
  try {
    await ElMessageBox.confirm(`确认删除 "${item.name}"？`, '删除确认', { type: 'warning' })
    const ok = await store.deleteSchema(item.id)
    if (ok) ElMessage.success('已删除')
    else ElMessage.error(store.error || '删除失败')
  } catch { /* cancelled */ }
}

function handleEdit(id: string) {
  router.push({ path: '/editor', query: { id } })
}

function handlePreview(id: string) {
  router.push({ path: '/preview', query: { id } })
}

function handlePublish(id: string) {
  router.push({ path: '/view', query: { id } })
}

// ---- Bulk operations ----
function toggleBulkMode() {
  bulkMode.value = !bulkMode.value
  selectedIds.value.clear()
}

function toggleSelect(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

async function handleBulkDelete() {
  if (selectedIds.value.size === 0) return
  try {
    await ElMessageBox.confirm(
      `确认删除选中的 ${selectedIds.value.size} 个实例？此操作不可撤销。`,
      '批量删除',
      { type: 'warning', confirmButtonText: '删除', confirmButtonClass: 'el-button--danger' },
    )
  } catch { return }

  let success = 0
  let fail = 0
  for (const id of selectedIds.value) {
    const ok = await store.deleteSchema(id)
    if (ok) success++
    else fail++
  }
  if (fail === 0) ElMessage.success(`已删除 ${success} 个实例`)
  else ElMessage.warning(`删除 ${success} 个成功，${fail} 个失败`)

  bulkMode.value = false
  selectedIds.value.clear()
}

// ---- Helpers ----
function formatDate(d: string) {
  return new Date(d).toLocaleString('zh-CN')
}

function typeLabel(type: string): string {
  return type === 'form' ? '表单' : '搜索列表'
}

function typeTagType(type: string): '' | 'success' | 'info' | 'warning' | 'danger' {
  return type === 'form' ? '' : 'success'
}

function statusLabel(status: string): string {
  return status === 'published' ? '已发布' : '草稿'
}

function statusTagType(status: string): '' | 'success' | 'info' | 'warning' | 'danger' {
  return status === 'published' ? 'success' : 'info'
}

const isFiltered = computed(() =>
  activeTab.value !== 'all' || (searchInput.value && searchInput.value.trim().length > 0),
)
</script>

<template>
  <div class="fg-instances">
    <el-scrollbar class="fg-instances__scrollbar">
      <!-- Header -->
      <div class="fg-instances__header">
        <div class="fg-instances__title-row">
          <div>
            <h1>Schema 实例管理</h1>
            <p class="fg-instances__subtitle">管理所有表单和搜索列表实例</p>
          </div>
          <div class="fg-instances__header-actions">
            <el-button type="primary" :icon="Plus" @click="openCreateDialog">新建实例</el-button>
          </div>
        </div>

        <!-- Filter bar -->
        <div class="fg-instances__toolbar">
          <div class="fg-instances__tabs">
            <button
              v-for="tab in filterTabs"
              :key="tab.value"
              class="fg-instances__tab"
              :class="{ 'fg-instances__tab--active': activeTab === tab.value }"
              @click="activeTab = tab.value"
            >{{ tab.label }}</button>
          </div>

          <div class="fg-instances__toolbar-right">
            <el-input
              v-model="searchInput"
              :prefix-icon="Search"
              placeholder="搜索名称..."
              clearable
              class="fg-instances__search"
              @input="handleSearch"
              @clear="handleSearch('')"
            />
            <el-dropdown trigger="click" @command="(v: any) => sortBy = v">
              <el-button size="small" :icon="Sort">
                {{ sortOptions.find(s => s.value === sortBy)?.label }}
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="opt in sortOptions"
                    :key="opt.value"
                    :command="opt.value"
                    :class="{ 'is-active': sortBy === opt.value }"
                  >{{ opt.label }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>

            <el-button
              size="small"
              :type="bulkMode ? 'danger' : 'default'"
              :icon="List"
              @click="toggleBulkMode"
            >{{ bulkMode ? '取消' : '批量操作' }}</el-button>

            <el-button
              v-if="bulkMode && selectedIds.size > 0"
              size="small"
              type="danger"
              :icon="Delete"
              @click="handleBulkDelete"
            >删除 ({{ selectedIds.size }})</el-button>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="store.loading && !store.hasSchemas" class="fg-instances__content">
        <el-skeleton :rows="6" animated />
      </div>

      <!-- Error -->
      <div v-else-if="store.hasError && !store.hasSchemas" class="fg-instances__content">
        <el-alert :title="store.error ?? ''" type="error" show-icon :closable="false">
          <template #default>
            <el-button size="small" @click="store.fetchSchemas()">重试</el-button>
          </template>
        </el-alert>
      </div>

      <!-- Empty (global) -->
      <div v-else-if="store.isEmpty" class="fg-instances__state--empty">
        <div class="fg-instances__empty-icon">
          <el-icon :size="64"><Document /></el-icon>
        </div>
        <h2 class="fg-instances__empty-title">还没有 Schema 实例</h2>
        <p class="fg-instances__empty-desc">创建您的第一个表单或搜索列表来开始使用</p>
        <div class="fg-instances__empty-actions">
          <el-button type="primary" size="large" :icon="Plus" @click="openCreateDialog">创建实例</el-button>
        </div>
      </div>

      <!-- No search results -->
      <div v-else-if="isFiltered && sortedSchemas.length === 0 && !store.loading" class="fg-instances__state--no-results">
        <p>未找到匹配的实例</p>
        <el-button @click="activeTab = 'all'; searchInput = ''; store.fetchSchemas()">清除筛选</el-button>
      </div>

      <!-- Card Grid -->
      <div v-else class="fg-instances__content">
        <div class="fg-instances__cards">
          <div
            v-for="item in sortedSchemas"
            :key="item.id"
            class="fg-instances-card"
          >
            <!-- Bulk select checkbox -->
            <div v-if="bulkMode" class="fg-instances-card__check">
              <el-checkbox
                :model-value="selectedIds.has(item.id)"
                @change="toggleSelect(item.id)"
              />
            </div>

            <div class="fg-instances-card__body">
              <h3 class="fg-instances-card__name">{{ item.name }}</h3>
              <div class="fg-instances-card__meta">
                <el-tag :type="typeTagType(item.type)" size="small">{{ typeLabel(item.type) }}</el-tag>
                <el-tag :type="statusTagType(item.status)" size="small">{{ statusLabel(item.status) }}</el-tag>
                <!-- Publish ID -->
                <el-popover
                  v-if="item.status === 'published' && item.publishId"
                  trigger="hover"
                  :width="280"
                  placement="top"
                >
                  <template #reference>
                    <code class="fg-instances-card__pub-badge">{{ item.publishId.slice(0, 8) }}</code>
                  </template>
                  <div style="font-size:12px; word-break:break-all;">{{ item.publishId }}</div>
                </el-popover>
                <!-- Component count -->
                <span v-if="item.json?.length" class="fg-instances-card__count">
                  {{ item.json.length }} 个组件
                </span>
                <span class="fg-instances-card__date">{{ formatDate(item.updatedAt) }}</span>
              </div>
            </div>
            <div class="fg-instances-card__actions">
              <el-button size="small" text type="primary" :icon="Edit" @click="handleEdit(item.id)">编辑</el-button>
              <el-button size="small" text type="warning" :icon="View" @click="handlePreview(item.id)">预览</el-button>
              <el-button
                v-if="item.status === 'draft'"
                size="small"
                text
                type="success"
                :icon="Promotion"
                @click="handlePublish(item.id)"
              >发布</el-button>
              <el-button size="small" text type="danger" :icon="Delete" @click="handleDelete(item)" />
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="store.pagination.total > 0" class="fg-instances__pagination">
          <el-pagination
            v-model:current-page="store.pagination.page"
            :page-size="store.pagination.pageSize"
            :total="store.pagination.total"
            layout="total, prev, pager, next"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </el-scrollbar>

    <!-- Create Dialog -->
    <el-dialog
      v-model="createDialogVisible"
      title="新建实例"
      width="440px"
      :close-on-click-modal="false"
      append-to-body
    >
      <el-form label-position="top" @submit.prevent="confirmCreate">
        <el-form-item label="实例名称">
          <el-input
            v-model="createName"
            placeholder="请输入实例名称"
            maxlength="100"
            show-word-limit
            @keyup.enter="confirmCreate"
          />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="createType" style="width:100%">
            <el-option label="表单 (Form)" value="form" />
            <el-option label="搜索列表 (Search List)" value="search-list" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmCreate">创建并编辑</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.fg-instances {
  height: 100vh;
  background: #f0f2f5;

  &__scrollbar {
    height: 100%;
  }

  // ---- Header ----
  &__header {
    max-width: 1200px;
    margin: 0 auto;
    padding: 28px 24px 0;
  }

  &__title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 16px;

    h1 { font-size: 22px; font-weight: 700; margin: 0 0 4px; color: #303133; }
  }

  &__subtitle {
    margin: 0;
    font-size: 13px;
    color: #909399;
  }

  &__header-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  // ---- Toolbar (tabs + search + sort) ----
  &__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e4e7ed;
    flex-wrap: wrap;
  }

  &__tabs {
    display: flex;
    gap: 2px;
    background: #e8eaed;
    border-radius: 8px;
    padding: 3px;
  }

  &__tab {
    padding: 6px 16px;
    font-size: 13px;
    font-weight: 500;
    color: #606266;
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;

    &:hover { color: #303133; }
    &--active {
      color: #303133;
      background: #fff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }
  }

  &__toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__search {
    width: 200px;
    :deep(.el-input__inner) { height: 32px; font-size: 13px; }
  }

  // Dialog form inputs should match button heights
  :deep(.el-dialog) {
    .el-input__inner { height: 32px; font-size: 14px; }
    .el-select .el-input__inner { height: 32px; }
  }

  // ---- Content area ----
  &__content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px 24px 0;
  }

  // ---- States ----
  &__state--empty {
    max-width: 1200px;
    margin: 0 auto;
    padding: 100px 24px 0;
    text-align: center;
  }

  &__empty-icon {
    color: #dcdfe6;
    margin-bottom: 20px;
  }

  &__empty-title {
    font-size: 18px;
    color: #303133;
    margin: 0 0 8px;
  }

  &__empty-desc {
    font-size: 14px;
    color: #909399;
    margin: 0 0 24px;
  }

  &__empty-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
  }

  &__state--no-results {
    max-width: 1200px;
    margin: 0 auto;
    padding: 60px 24px 0;
    text-align: center;
    color: #909399;
    font-size: 15px;

    p { margin: 0 0 16px; }
  }

  // ---- Cards ----
  &__cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
    gap: 16px;
  }

  &__pagination {
    display: flex;
    justify-content: center;
    margin-top: 28px;
    padding-bottom: 32px;
  }
}

// ---- Card ----
.fg-instances-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  padding: 20px 24px;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    border-color: #409eff;
    box-shadow: 0 4px 16px rgba(64, 158, 255, 0.1);
    transform: translateY(-1px);
  }

  animation: cardFadeIn 0.35s ease backwards;
  @for $i from 1 through 30 {
    &:nth-child(#{$i}) { animation-delay: #{$i * 0.04}s; }
  }

  &__check {
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 2;
  }

  &__body { margin-bottom: 14px; }

  &__name {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  &__pub-badge {
    font-size: 11px;
    background: #f0f2f5;
    color: #909399;
    padding: 2px 6px;
    border-radius: 4px;
    cursor: pointer;
    font-family: monospace;
  }

  &__count {
    font-size: 11px;
    color: #c0c4cc;
    margin-left: auto;
  }

  &__date {
    font-size: 12px;
    color: #c0c4cc;
    margin-left: auto;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 4px;
    padding-top: 12px;
    border-top: 1px solid #f0f2f5;
  }
}

@keyframes cardFadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
