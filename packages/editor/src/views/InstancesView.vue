<script setup lang="ts">
/**
 * InstancesView — Schema 实例管理页
 *
 * 卡片网格展示所有 Schema 实例。支持搜索、筛选标签、排序、批量删除。
 * 使用 TDesign Vue Next 组件库。
 */
import { onMounted, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import { SearchIcon, AddIcon, DeleteIcon, EditIcon, BrowseIcon, SendIcon, ListIcon, FileIcon, SortIcon, DownloadIcon, UploadIcon, TimeIcon } from 'tdesign-icons-vue-next'
import { useApiStore } from '@/stores/api'
import { downloadSchemaJson, parseImportFile } from '@/utils/schemaExport'
import { importSchema } from '@/utils/apiClient'
import VersionHistoryDialog from '@/components/Editor/VersionHistoryDialog.vue'
import type { SchemaListItem, SchemaDetail } from '@/types/api'

const router = useRouter()
const store = useApiStore()
const searchInput = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

// ---- Filter & Sort ----
const activeTab = ref<'all' | 'form' | 'search-list'>('all')
const sortBy = ref<'newest' | 'oldest' | 'name'>('newest')
const bulkMode = ref(false)
const selectedIds = ref<Set<string>>(new Set())
const publishingId = ref<string | null>(null)
const COOLDOWN_MS = 2000

const filterTabs = [
  { label: '全部', value: 'all' as const },
  { label: '表单', value: 'form' as const },
  { label: '搜索列表', value: 'search-list' as const },
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
    MessagePlugin.warning('请输入实例名称')
    return
  }
  const result = await store.createSchema({ name, type: createType.value, json: [] })
  if (result) {
    createDialogVisible.value = false
    MessagePlugin.success(`${createType.value === 'form' ? '表单' : '搜索列表'}创建成功`)
    router.push({ path: '/editor', query: { id: result.id } })
  } else {
    MessagePlugin.error(store.error || '创建失败')
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

function buildFilter(): { type?: string } {
  const filter: { type?: string } = {}
  if (activeTab.value === 'form') filter.type = 'form'
  else if (activeTab.value === 'search-list') filter.type = 'search_list'
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
function handleDelete(item: SchemaListItem) {
  const isPublished = !!item.publishId
  const message = isPublished
    ? `"${item.name}" 已发布，删除后发布的表单将不可恢复。确认删除？`
    : `确认删除 "${item.name}"？`
  const confirmDia = DialogPlugin.confirm({
    header: '删除确认',
    body: message,
    theme: isPublished ? 'danger' : 'warning',
    confirmBtn: '删除',
    onConfirm: async () => {
      const ok = await store.deleteSchema(item.id)
      if (ok) MessagePlugin.success('已删除')
      else MessagePlugin.error(store.error || '删除失败')
      confirmDia.hide()
    },
  })
}

function handleEdit(id: string) {
  router.push({ path: '/editor', query: { id } })
}

function handlePreview(item: SchemaListItem) {
  if (item.publishId) {
    // 预览发布版本
    router.push({ path: '/view', query: { id: item.publishId } })
  } else {
    // 未发布则预览编辑版本
    router.push({ path: '/editor', query: { id: item.id, mode: 'preview' } })
  }
}

async function handlePublish(item: SchemaListItem) {
  if (publishingId.value) return
  const confirmDia = DialogPlugin.confirm({
    header: '发布确认',
    body: `确认发布 "${item.name}" 的最新版本？`,
    theme: 'info',
    confirmBtn: '发布',
    onConfirm: async () => {
      publishingId.value = item.id
      const result = await store.publishSchema(item.id)
      if (result) {
        MessagePlugin.success('发布成功')
        store.fetchSchemas()
      } else {
        MessagePlugin.error(store.error || '发布失败')
      }
      setTimeout(() => { publishingId.value = null }, COOLDOWN_MS)
      confirmDia.hide()
    },
    onCancel: () => {
      setTimeout(() => { publishingId.value = null }, COOLDOWN_MS)
    },
  })
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
  const confirmDia = DialogPlugin.confirm({
    header: '批量删除',
    body: `确认删除选中的 ${selectedIds.value.size} 个实例？此操作不可撤销。`,
    theme: 'warning',
    confirmBtn: '删除',
    onConfirm: async () => {
      let success = 0
      let fail = 0
      for (const id of selectedIds.value) {
        const ok = await store.deleteSchema(id)
        if (ok) success++
        else fail++
      }
      if (fail === 0) MessagePlugin.success(`已删除 ${success} 个实例`)
      else MessagePlugin.warning(`删除 ${success} 个成功，${fail} 个失败`)

      bulkMode.value = false
      selectedIds.value.clear()
      confirmDia.hide()
    },
  })
}

// ---- Export/Import ----
function handleExport(item: SchemaListItem) {
  // 需要完整的 schema 数据才能导出
  store.fetchSchemaById(item.id).then((detail) => {
    if (detail) {
      downloadSchemaJson(detail as SchemaDetail)
      MessagePlugin.success('导出成功')
    }
  })
}

const importDialogVisible = ref(false)
const importLoading = ref(false)
const importFile = ref<File | null>(null)

function openImportDialog() {
  importFile.value = null
  importDialogVisible.value = true
}

function handleFileChange(file: File) {
  importFile.value = file
}

function handleUploadChange(files: { files: File[] }) {
  if (files.files.length > 0) {
    handleFileChange(files.files[0])
  }
}

async function confirmImport() {
  if (!importFile.value) {
    MessagePlugin.warning('请选择文件')
    return
  }

  importLoading.value = true
  try {
    const parsed = await parseImportFile(importFile.value)
    await importSchema(parsed)
    importDialogVisible.value = false
    MessagePlugin.success('导入成功')
    store.fetchSchemas()
  } catch (err) {
    MessagePlugin.error(err instanceof Error ? err.message : '导入失败')
  } finally {
    importLoading.value = false
  }
}

// ---- Helpers ----
function formatDate(d: string) {
  return new Date(d).toLocaleString('zh-CN')
}

function typeLabel(type: string): string {
  return type === 'form' ? '表单' : '搜索列表'
}

function typeTagTheme(type: string): 'default' | 'success' {
  return type === 'form' ? 'default' : 'success'
}

const isFiltered = computed(() =>
  activeTab.value !== 'all' || (searchInput.value && searchInput.value.trim().length > 0),
)

// ---- Version History ----
const versionDialogVisible = ref(false)
const versionDialogEditId = ref<string | null>(null)
const versionDialogVersion = ref<string | undefined>(undefined)
const versionDialogName = ref<string | undefined>(undefined)

function handleShowVersions(item: SchemaListItem) {
  versionDialogEditId.value = item.editId
  versionDialogVersion.value = item.version
  versionDialogName.value = item.name
  versionDialogVisible.value = true
}

function handleLoadVersion(version: string) {
  // 加载特定版本后跳转到编辑器
  if (versionDialogEditId.value) {
    router.push({ path: '/editor', query: { editId: versionDialogEditId.value, version } })
  }
}

function handleVersionPublished() {
  store.fetchSchemas()
}
</script>

<template>
  <div class="fg-instances">
    <div class="fg-instances__scrollbar">
      <!-- Header -->
      <div class="fg-instances__header">
        <div class="fg-instances__title-row">
          <div>
            <h1>实例管理</h1>
            <p class="fg-instances__subtitle">管理所有表单和搜索列表实例</p>
          </div>
          <div class="fg-instances__header-actions">
            <t-button @click="openImportDialog"><template #icon><UploadIcon /></template>导入</t-button>
            <t-button theme="primary" @click="openCreateDialog"><template #icon><AddIcon /></template>新建实例</t-button>
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
            <t-input
              v-model="searchInput"
              placeholder="搜索名称..."
              clearable
              class="fg-instances__search"
              @input="handleSearch"
              @clear="handleSearch('')"
            >
              <template #prefix-icon>
                <SearchIcon />
              </template>
            </t-input>
            <t-dropdown :options="sortOptions.map(s => ({ content: s.label, value: s.value }))" @click="(data: any) => sortBy = data.value">
              <t-button size="small">
                <template #icon><SortIcon /></template>
                {{ sortOptions.find(s => s.value === sortBy)?.label }}
              </t-button>
            </t-dropdown>

            <t-button
              size="small"
              :theme="bulkMode ? 'danger' : 'default'"
              @click="toggleBulkMode"
            ><template #icon><ListIcon /></template>{{ bulkMode ? '取消' : '批量操作' }}</t-button>

            <t-button
              v-if="bulkMode && selectedIds.size > 0"
              size="small"
              theme="danger"
              @click="handleBulkDelete"
            ><template #icon><DeleteIcon /></template>删除 ({{ selectedIds.size }})</t-button>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="store.loading && !store.hasSchemas" class="fg-instances__content">
        <t-skeleton :row-col="Array(6).fill({ width: '100%' })" animation="gradient" />
      </div>

      <!-- Error -->
      <div v-else-if="store.hasError && !store.hasSchemas" class="fg-instances__content">
        <t-alert theme="error" :message="store.error ?? ''" closeable>
          <template #operation>
            <t-button size="small" @click="store.fetchSchemas()">重试</t-button>
          </template>
        </t-alert>
      </div>

      <!-- Empty (global) -->
      <div v-else-if="store.isEmpty" class="fg-instances__state--empty">
        <div class="fg-instances__empty-icon">
          <FileIcon :size="64" />
        </div>
        <h2 class="fg-instances__empty-title">还没有 Schema 实例</h2>
        <p class="fg-instances__empty-desc">创建您的第一个表单或搜索列表来开始使用</p>
        <div class="fg-instances__empty-actions">
          <t-button theme="primary" size="large" @click="openCreateDialog"><template #icon><AddIcon /></template>创建实例</t-button>
        </div>
      </div>

      <!-- No search results -->
      <div v-else-if="isFiltered && sortedSchemas.length === 0 && !store.loading" class="fg-instances__state--no-results">
        <p>未找到匹配的实例</p>
        <t-button @click="activeTab = 'all'; searchInput = ''; store.fetchSchemas()">清除筛选</t-button>
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
              <t-checkbox
                :checked="selectedIds.has(item.id)"
                @change="toggleSelect(item.id)"
              />
            </div>

            <div class="fg-instances-card__preview" @click="handleEdit(item.id)">
              <img
                v-if="item.thumbnail"
                :src="item.thumbnail"
                :alt="item.name"
                class="fg-instances-card__thumbnail"
              />
              <div v-else class="fg-instances-card__thumbnail-placeholder">
                <FileIcon :size="32" />
              </div>
            </div>

            <div class="fg-instances-card__body">
              <h3 class="fg-instances-card__name">{{ item.name }}</h3>
              <div class="fg-instances-card__meta">
                <t-tag :theme="typeTagTheme(item.type)" size="small">{{ typeLabel(item.type) }}</t-tag>
                <t-tag v-if="item.publishId" theme="success" size="small">已发布</t-tag>
                <span v-if="item.version" class="fg-instances-card__version">v{{ item.version }}</span>
                <!-- Component count -->
                <span v-if="item.json?.length" class="fg-instances-card__count">
                  {{ item.json.length }} 个组件
                </span>
                <span class="fg-instances-card__date">{{ formatDate(item.updatedAt) }}</span>
              </div>
            </div>
            <div class="fg-instances-card__actions">
              <t-popup content="编辑" placement="top" :show-after="300">
                <t-button size="small" variant="text" theme="primary" @click="handleEdit(item.id)"><template #icon><EditIcon /></template></t-button>
              </t-popup>
              <t-popup :content="item.publishId ? '预览发布版本' : '预览编辑版本'" placement="top" :show-after="300">
                <t-button size="small" variant="text" theme="warning" @click="handlePreview(item)"><template #icon><BrowseIcon /></template></t-button>
              </t-popup>
              <t-popup content="版本历史" placement="top" :show-after="300">
                <t-button size="small" variant="text" @click="handleShowVersions(item)"><template #icon><TimeIcon /></template></t-button>
              </t-popup>
              <t-popup content="发布" placement="top" :show-after="300">
                <t-button size="small" variant="text" theme="success" :loading="publishingId === item.id" :disabled="publishingId !== null" @click="handlePublish(item)"><template #icon><SendIcon /></template></t-button>
              </t-popup>
              <t-popup content="导出" placement="top" :show-after="300">
                <t-button size="small" variant="text" @click="handleExport(item)"><template #icon><DownloadIcon /></template></t-button>
              </t-popup>
              <t-popup content="删除" placement="top" :show-after="300">
                <t-button size="small" variant="text" theme="danger" @click="handleDelete(item)"><template #icon><DeleteIcon /></template></t-button>
              </t-popup>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="store.pagination.total > 0" class="fg-instances__pagination">
          <t-pagination
            v-model="store.pagination.page"
            :page-size="store.pagination.pageSize"
            :total="store.pagination.total"
            :show-total="true"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>

    <!-- Create Dialog -->
    <t-dialog
      v-model:visible="createDialogVisible"
      header="新建实例"
      width="440px"
      :close-on-overlay="false"
      attach="body"
    >
      <t-form @submit.prevent="confirmCreate">
        <t-form-item label="实例名称">
          <t-input
            v-model="createName"
            placeholder="请输入实例名称"
            maxlength="100"
            show-word-limit
            @keyup.enter="confirmCreate"
          />
        </t-form-item>
        <t-form-item label="类型">
          <t-select v-model="createType" style="width:100%">
            <t-option label="表单 (Form)" value="form" />
            <t-option label="搜索列表 (Search List)" value="search-list" />
          </t-select>
        </t-form-item>
      </t-form>
      <template #footer>
        <t-button variant="outline" @click="createDialogVisible = false">取消</t-button>
        <t-button theme="primary" @click="confirmCreate">创建并编辑</t-button>
      </template>
    </t-dialog>

    <!-- Import Dialog -->
    <t-dialog
      v-model:visible="importDialogVisible"
      header="导入 Schema"
      width="440px"
      :close-on-overlay="false"
      attach="body"
    >
      <t-upload
        :auto-upload="false"
        accept=".json"
        :max="1"
        theme="file"
        draggable
        @change="handleUploadChange"
      >
        <div>
          <UploadIcon :size="40" />
          <div>拖拽文件到此处，或 <em>点击选择</em></div>
        </div>
        <template #tip>
          <div>仅支持 .json 格式的 Schema 文件</div>
        </template>
      </t-upload>
      <template #footer>
        <t-button variant="outline" @click="importDialogVisible = false">取消</t-button>
        <t-button theme="primary" :loading="importLoading" @click="confirmImport">导入</t-button>
      </template>
    </t-dialog>

    <!-- Version History Dialog -->
    <VersionHistoryDialog
      v-model:visible="versionDialogVisible"
      :edit-id="versionDialogEditId"
      :current-version="versionDialogVersion"
      :schema-name="versionDialogName"
      @load-version="handleLoadVersion"
      @published="handleVersionPublished"
    />
  </div>
</template>

<style scoped lang="scss">
.fg-instances {
  height: 100%;
  background: var(--td-bg-color-secondarycontainer);

  &__scrollbar {
    height: 100%;
    overflow: auto;
  }

  // ---- Header ----
  &__header {
    padding: 28px 24px 0;
  }

  &__title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 16px;

    h1 { font-size: 22px; font-weight: 700; margin: 0 0 4px; color: var(--td-text-color-primary); }
  }

  &__subtitle {
    margin: 0;
    font-size: 13px;
    color: var(--td-text-color-placeholder);
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
    border-bottom: 1px solid var(--td-border-level-2-color);
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
    color: var(--td-text-color-secondary);
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;

    &:hover { color: var(--td-text-color-primary); }
    &--active {
      color: var(--td-text-color-primary);
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
    :deep(.t-input__inner) { height: 32px; font-size: 13px; }
  }

  // Dialog form inputs should match button heights
  :deep(.t-dialog) {
    .t-input__inner { height: 32px; font-size: 14px; }
    .t-select .t-input__inner { height: 32px; }
  }

  // ---- Content area ----
  &__content {
    padding: 20px 24px 0;
  }

  // ---- States ----
  &__state--empty {
    padding: 100px 24px 0;
    text-align: center;
  }

  &__empty-icon {
    color: var(--td-border-level-1-color);
    margin-bottom: 20px;
  }

  &__empty-title {
    font-size: 18px;
    color: var(--td-text-color-primary);
    margin: 0 0 8px;
  }

  &__empty-desc {
    font-size: 14px;
    color: var(--td-text-color-placeholder);
    margin: 0 0 24px;
  }

  &__empty-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
  }

  &__state--no-results {
    padding: 60px 24px 0;
    text-align: center;
    color: var(--td-text-color-placeholder);
    font-size: 15px;

    p { margin: 0 0 16px; }
  }

  // ---- Cards ----
  &__cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 300px));
    gap: 12px;
    contain: layout style;
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
  border: 1px solid var(--td-border-level-2-color);
  border-radius: 10px;
  padding: 12px 16px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  position: relative;
  contain: layout style paint;

  &:hover {
    border-color: var(--td-brand-color);
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

  &__preview {
    margin: -12px -16px 10px;
    border-radius: 10px 10px 0 0;
    overflow: hidden;
    background: var(--td-bg-color-secondarycontainer);
    aspect-ratio: 16 / 9;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  &__thumbnail {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  &__thumbnail-placeholder {
    color: var(--td-border-level-1-color);
  }

  &__body { margin-bottom: 8px; }

  &__name {
    font-size: 14px;
    font-weight: 600;
    color: var(--td-text-color-primary);
    margin: 0 0 6px;
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

  &__count {
    font-size: 11px;
    color: var(--td-text-color-disabled);
    margin-left: auto;
  }

  &__date {
    font-size: 12px;
    color: var(--td-text-color-disabled);
    margin-left: auto;
  }

  &__version {
    font-size: 11px;
    color: var(--td-text-color-placeholder);
    font-family: monospace;
  }

  &__actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 2px;
    padding-top: 12px;
    border-top: 1px solid var(--td-bg-color-secondarycontainer);
    flex-wrap: wrap;
    overflow: visible;

    .t-button {
      padding: 4px 6px;
      font-size: 12px;
    }
  }
}

@keyframes cardFadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
