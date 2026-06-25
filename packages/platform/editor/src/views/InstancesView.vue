<script setup lang="ts">
/**
 * InstancesView — Schema 实例管理页
 *
 * 卡片网格展示所有 Schema 实例。支持搜索、筛选标签、排序、批量删除。
 * 使用 Element Plus 组件库。
 */
import { onMounted, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useApiStore } from '@/stores/api'
import { downloadSchemaJson, parseImportFile } from '@/utils/schemaExport'
import { importSchema, updateSchema } from '@/utils/apiClient'
import type { SchemaTypeValue } from '@/types/api'
import VersionHistoryDialog from '@/components/Editor/VersionHistoryDialog.vue'
import AppDialog from '@schema-form/platform-shared/components/common/AppDialog.vue'
import FilterTabs from '@schema-form/platform-shared/components/common/FilterTabs.vue'
import type { SchemaListItem, SchemaDetail } from '@/types/api'
import type { PartialWidget } from '@/widgets/base/types'
import AppIcon from '@schema-form/platform-shared/components/common/AppIcon.vue'
import styles from './InstancesView.module.scss'

const router = useRouter()
const store = useApiStore()

/** 获取 JSON 中的组件数量 */
function getJsonLength(json: SchemaListItem['json']): number {
  if (Array.isArray(json)) return json.length
  if (json && typeof json === 'object' && 'widgets' in json) return (json.widgets as PartialWidget[]).length
  return 0
}
const searchInput = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

// ---- Filter & Sort ----
const activeTab = ref<'all' | SchemaTypeValue>('all')
const sortBy = ref<'newest' | 'oldest' | 'name'>('newest')
const bulkMode = ref(false)
const selectedIds = ref<Set<string>>(new Set())
const publishingId = ref<string | null>(null)
const COOLDOWN_MS = 2000

const filterTabs = [
  { label: '全部', value: 'all' as const },
  { label: '表单', value: 'form' as const },
  { label: '搜索列表', value: 'search-list' as const },
  { label: '布局', value: 'layout' as const },
  { label: '表格', value: 'table' as const },
  { label: '图表', value: 'chart' as const },
  { label: '业务', value: 'business' as const },
  { label: '报表', value: 'report' as const },
  { label: '其他', value: 'other' as const },
]

const sortOptions = [
  { label: '最新优先', value: 'newest' as const },
  { label: '最早优先', value: 'oldest' as const },
  { label: '名称 A-Z', value: 'name' as const },
]

// ---- Schema type options ----
const schemaTypeOptions: { label: string; value: SchemaTypeValue }[] = [
  { label: '表单', value: 'form' },
  { label: '搜索列表', value: 'search-list' },
  { label: '布局', value: 'layout' },
  { label: '表格', value: 'table' },
  { label: '图表', value: 'chart' },
  { label: '业务', value: 'business' },
  { label: '报表', value: 'report' },
  { label: '其他', value: 'other' },
]

// ---- Create Dialog ----
const createDialogVisible = ref(false)
const createName = ref('')
const createType = ref<SchemaTypeValue>('form')

function openCreateDialog() {
  createName.value = ''
  createType.value = 'form'
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
    ElMessage.success('创建成功')
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

function buildFilter(): { type?: string } {
  const filter: { type?: string } = {}
  if (activeTab.value !== 'all') {
    // 前端 search-list → 后端 search_list，其他类型名称一致
    filter.type = activeTab.value === 'search-list' ? 'search_list' : activeTab.value
  }
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
  ElMessageBox.confirm(message, '删除确认', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: isPublished ? 'error' : 'warning',
  }).then(async () => {
    const ok = await store.deleteSchema(item.id)
    if (ok) ElMessage.success('已删除')
    else ElMessage.error(store.error || '删除失败')
  }).catch((err) => {
    if (err !== 'cancel') throw err
  })
}

function handleDesigner(id: string) {
  // 跳转到设计器（原编辑按钮行为）
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
  try {
    await ElMessageBox.confirm(
      `确认发布 "${item.name}" 的最新版本？`,
      '发布确认',
      {
        confirmButtonText: '发布',
        cancelButtonText: '取消',
        type: 'info',
      }
    )
  } catch {
    return // 用户取消，不做任何操作
  }

  try {
    publishingId.value = item.id
    const result = await store.publishSchema(item.id)
    if (result) {
      ElMessage.success('发布成功')
      store.fetchSchemas()
    } else {
      ElMessage.error(store.error || '发布失败')
    }
  } catch (err) {
    console.error('发布失败:', err)
    ElMessage.error('发布失败')
  } finally {
    setTimeout(() => { publishingId.value = null }, COOLDOWN_MS)
  }
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
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
  } catch {
    return // 用户取消
  }

  try {
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
  } catch (err) {
    console.error('批量删除失败:', err)
    ElMessage.error('批量删除失败')
  }
}

// ---- Export/Import ----
function handleExport(item: SchemaListItem) {
  // 需要完整的 schema 数据才能导出
  store.fetchSchemaById(item.id).then((detail) => {
    if (detail) {
      downloadSchemaJson(detail as SchemaDetail)
      ElMessage.success('导出成功')
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

function handleUploadChange(uploadFile: any) {
  if (uploadFile.raw) {
    handleFileChange(uploadFile.raw)
  }
}

async function confirmImport() {
  if (!importFile.value) {
    ElMessage.warning('请选择文件')
    return
  }

  importLoading.value = true
  try {
    const parsed = await parseImportFile(importFile.value)
    await importSchema(parsed)
    importDialogVisible.value = false
    ElMessage.success('导入成功')
    store.fetchSchemas()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '导入失败')
  } finally {
    importLoading.value = false
  }
}

// ---- Helpers ----
function formatDate(d: string) {
  return new Date(d).toLocaleString('zh-CN')
}

const TYPE_LABEL_MAP: Record<string, string> = {
  form: '表单',
  search_list: '搜索列表',
  layout: '布局',
  table: '表格',
  chart: '图表',
  business: '业务',
  report: '报表',
  other: '其他',
}

const TYPE_TAG_MAP: Record<string, 'info' | 'success' | 'warning' | 'danger'> = {
  form: 'info',
  search_list: 'success',
  layout: 'info',
  table: 'success',
  chart: 'warning',
  business: 'danger',
  report: 'info',
  other: '',
}

function typeLabel(type: string): string {
  return TYPE_LABEL_MAP[type] ?? type
}

function typeTagType(type: string): 'info' | 'success' | 'warning' | 'danger' | '' {
  return TYPE_TAG_MAP[type] ?? ''
}

const isFiltered = computed(() =>
  activeTab.value !== 'all' || (searchInput.value && searchInput.value.trim().length > 0),
)

// ---- Edit Instance ----
const editDialogVisible = ref(false)
const editId = ref<string | null>(null)
const editName = ref('')
const editType = ref<SchemaTypeValue>('form')
const editSaving = ref(false)

function handleEdit(id: string) {
  const item = store.schemas.find(s => s.id === id)
  if (!item) return
  editId.value = item.id
  editName.value = item.name
  editType.value = (item.type as SchemaTypeValue) ?? 'form'
  editDialogVisible.value = true
}

async function confirmEdit() {
  if (!editId.value || !editName.value.trim()) return
  editSaving.value = true
  try {
    await updateSchema(editId.value, { name: editName.value.trim(), type: editType.value })
    ElMessage.success('已更新')
    editDialogVisible.value = false
    store.fetchSchemas()
  } catch {
    ElMessage.error('更新失败')
  } finally {
    editSaving.value = false
  }
}

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
  <div :class="styles['fg-instances']">
    <div :class="styles['fg-instances__scrollbar']">
      <!-- Header -->
      <div :class="styles['fg-instances__header']">
        <div :class="styles['fg-instances__title-row']">
          <div>
            <h1>实例管理</h1>
            <p :class="styles['fg-instances__subtitle']">管理所有 Schema 实例</p>
          </div>
          <div :class="styles['fg-instances__header-actions']">
            <el-button @click="openImportDialog">
              <AppIcon name="upload" class="el-icon--left" />导入
            </el-button>
            <el-button type="primary" @click="openCreateDialog">
              <AppIcon name="plus" class="el-icon--left" />新建实例
            </el-button>
          </div>
        </div>

        <!-- Filter bar -->
        <div :class="styles['fg-instances__toolbar']">
          <FilterTabs v-model="activeTab" :options="filterTabs" />
          <div :class="styles['fg-instances__toolbar-right']">
            <el-input v-model="searchInput" placeholder="搜索名称..." clearable :class="styles['fg-instances__search']" :prefix-icon="Search" @input="handleSearch" @clear="handleSearch('')" />
            <el-dropdown @command="(cmd: string) => sortBy = cmd as any">
              <el-button size="small">
                <AppIcon name="sort" class="el-icon--left" />
                {{ sortOptions.find(s => s.value === sortBy)?.label }}
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-for="s in sortOptions" :key="s.value" :command="s.value">
                    {{ s.label }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button size="small" :type="bulkMode ? 'danger' : 'default'" @click="toggleBulkMode">
              <AppIcon name="document" class="el-icon--left" />
              {{ bulkMode ? '取消' : '批量操作' }}
            </el-button>
            <el-button v-if="bulkMode && selectedIds.size > 0" size="small" type="danger" @click="handleBulkDelete">
              <AppIcon name="delete" class="el-icon--left" />
              删除 ({{ selectedIds.size }})
            </el-button>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="store.loading && !store.hasSchemas" :class="styles['fg-instances__content']">
        <div :class="styles['fg-instances__skeleton']">
          <div v-for="i in 6" :key="i" :class="styles['fg-instances__skeleton-card']">
            <div :class="styles['fg-instances__skeleton-preview']" />
            <div :class="styles['fg-instances__skeleton-title']" />
            <div :class="styles['fg-instances__skeleton-text']" />
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="store.hasError && !store.hasSchemas" :class="styles['fg-instances__content']">
        <el-alert :title="store.error ?? ''" type="error" show-icon :closable="false">
          <template #default>
            <el-button size="small" @click="store.fetchSchemas()">重试</el-button>
          </template>
        </el-alert>
      </div>

      <!-- Empty (global) -->
      <div v-else-if="store.isEmpty" :class="styles['fg-instances__state--empty']">
        <div :class="styles['fg-instances__empty-icon']">
          <AppIcon name="document" :size="64" />
        </div>
        <h2 :class="styles['fg-instances__empty-title']">还没有 Schema 实例</h2>
        <p :class="styles['fg-instances__empty-desc']">创建您的第一个 Schema 实例来开始使用</p>
        <div :class="styles['fg-instances__empty-actions']">
          <el-button type="primary" size="large" @click="openCreateDialog">
            <AppIcon name="plus" class="el-icon--left" />创建实例
          </el-button>
        </div>
      </div>

      <!-- No search results -->
      <div v-else-if="isFiltered && sortedSchemas.length === 0 && !store.loading" :class="styles['fg-instances__state--no-results']">
        <p>未找到匹配的实例</p>
        <el-button @click="activeTab = 'all'; searchInput = ''; store.fetchSchemas()">清除筛选</el-button>
      </div>

      <!-- Card Grid -->
      <div v-else :class="styles['fg-instances__content']">
        <div :class="styles['fg-instances__cards']">
          <div v-for="item in sortedSchemas" :key="item.id" :class="styles['fg-instances-card']">
            <!-- Bulk select checkbox -->
            <div v-if="bulkMode" :class="styles['fg-instances-card__check']">
              <el-checkbox :model-value="selectedIds.has(item.id)" @change="toggleSelect(item.id)" />
            </div>
            <div :class="styles['fg-instances-card__preview']" @click="handleDesigner(item.id)">
              <img v-if="item.thumbnail" :src="item.thumbnail" :alt="item.name" :class="styles['fg-instances-card__thumbnail']" />
              <div v-else :class="styles['fg-instances-card__thumbnail-placeholder']">
                <AppIcon name="document" :size="32" />
              </div>
            </div>
            <div :class="styles['fg-instances-card__body']">
              <h3 :class="styles['fg-instances-card__name']">{{ item.name }}</h3>
              <div :class="styles['fg-instances-card__meta']">
                <el-tag size="small" :type="typeTagType(item.type)">{{ typeLabel(item.type) }}</el-tag>
                <el-tag v-if="item.publishId" size="small" type="success">已发布</el-tag>
                <span v-if="item.version" :class="styles['fg-instances-card__version']">v{{ item.version }}</span>
                <!-- Component count -->
                <span v-if="getJsonLength(item.json)" :class="styles['fg-instances-card__count']">
                  {{ getJsonLength(item.json) }} 个组件
                </span>
                <span :class="styles['fg-instances-card__date']">{{ formatDate(item.updatedAt) }}</span>
              </div>
            </div>
            <div :class="styles['fg-instances-card__actions']">
              <el-tooltip content="编辑表单" placement="top" :show-after="300">
                <el-button size="small" text type="primary" @click="handleEdit(item.id)"><AppIcon name="edit" /></el-button>
              </el-tooltip>
              <el-tooltip content="设计器" placement="top" :show-after="300">
                <el-button size="small" text @click="handleDesigner(item.id)"><AppIcon name="setting" /></el-button>
              </el-tooltip>
              <el-tooltip :content="item.publishId ? '预览发布版本' : '预览编辑版本'" placement="top" :show-after="300">
                <el-button size="small" text type="warning" @click="handlePreview(item)"><AppIcon name="view" /></el-button>
              </el-tooltip>
              <el-tooltip content="版本历史" placement="top" :show-after="300">
                <el-button size="small" text @click="handleShowVersions(item)"><AppIcon name="clock" /></el-button>
              </el-tooltip>
              <el-tooltip content="发布" placement="top" :show-after="300">
                <el-button size="small" text type="success" :loading="publishingId === item.id" :disabled="publishingId !== null" @click="handlePublish(item)"><AppIcon name="promotion" /></el-button>
              </el-tooltip>
              <el-tooltip content="导出" placement="top" :show-after="300">
                <el-button size="small" text @click="handleExport(item)"><AppIcon name="download" /></el-button>
              </el-tooltip>
              <el-tooltip content="删除" placement="top" :show-after="300">
                <el-button size="small" text type="danger" @click="handleDelete(item)"><AppIcon name="delete" /></el-button>
              </el-tooltip>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="store.pagination.total > 0" :class="styles['fg-instances__pagination']">
          <el-pagination
            v-model:current-page="store.pagination.page"
            :page-size="store.pagination.pageSize"
            :total="store.pagination.total"
            layout="total, prev, pager, next"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>

    <!-- Create Dialog -->
    <AppDialog v-model="createDialogVisible" title="新建实例" width="440px">
      <el-form label-width="80px" @submit.prevent="confirmCreate">
        <el-form-item label="实例名称">
          <el-input v-model="createName" placeholder="请输入实例名称" maxlength="100" show-word-limit @keyup.enter="confirmCreate" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="createType" style="width:100%">
            <el-option v-for="opt in schemaTypeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmCreate">创建并编辑</el-button>
      </template>
    </AppDialog>

    <!-- Import Dialog -->
    <AppDialog v-model="importDialogVisible" title="导入 Schema" width="440px">
      <el-upload drag :auto-upload="false" accept=".json" :limit="1" :on-change="handleUploadChange">
        <AppIcon name="upload" class="el-icon--upload" :size="40" />
        <div class="el-upload__text">拖拽文件到此处，或 <em>点击选择</em></div>
        <template #tip>
          <div class="el-upload__tip">仅支持 .json 格式的 Schema 文件</div>
        </template>
      </el-upload>
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="importLoading" @click="confirmImport">导入</el-button>
      </template>
    </AppDialog>

    <!-- Version History Dialog -->
    <VersionHistoryDialog
      v-model:visible="versionDialogVisible"
      :edit-id="versionDialogEditId"
      :current-version="versionDialogVersion"
      :schema-name="versionDialogName"
      @load-version="handleLoadVersion"
      @published="handleVersionPublished"
    />

    <!-- Edit Instance Dialog -->
    <AppDialog v-model="editDialogVisible" title="编辑实例" width="440px">
      <el-form label-width="80px" @submit.prevent="confirmEdit">
        <el-form-item label="实例名称">
          <el-input v-model="editName" placeholder="请输入实例名称" maxlength="100" show-word-limit @keyup.enter="confirmEdit" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="editType" style="width:100%">
            <el-option v-for="opt in schemaTypeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="editSaving" @click="confirmEdit">保存</el-button>
      </template>
    </AppDialog>
  </div>
</template>
