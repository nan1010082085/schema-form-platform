<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Delete, Edit, Promotion, Document } from '@element-plus/icons-vue'
import { useFlowDefinitionStore } from '@schema-form/flow-web'
import type { FlowDefinition } from '@schema-form/flow-web'

const router = useRouter()
const store = useFlowDefinitionStore()
const searchInput = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

// Filter
const activeTab = ref<'all' | 'draft' | 'published' | 'archived'>('all')

const filterTabs = [
  { label: '全部', value: 'all' as const },
  { label: '草稿', value: 'draft' as const },
  { label: '已发布', value: 'published' as const },
  { label: '已归档', value: 'archived' as const },
]

// Create dialog
const createDialogVisible = ref(false)
const createName = ref('')
const createDescription = ref('')
const createCategory = ref('')

function openCreateDialog() {
  createName.value = ''
  createDescription.value = ''
  createCategory.value = ''
  createDialogVisible.value = true
}

async function confirmCreate() {
  const name = createName.value.trim()
  if (!name) {
    ElMessage.warning('请输入流程名称')
    return
  }
  try {
    const def = await store.createDefinition({
      name,
      description: createDescription.value.trim() || undefined,
      category: createCategory.value.trim() || undefined,
    })
    createDialogVisible.value = false
    ElMessage.success('流程创建成功')
    router.push({ path: '/flow-designer', query: { id: def.id } })
  } catch {
    ElMessage.error('创建失败')
  }
}

// Data fetching
onMounted(() => {
  store.fetchDefinitions()
})

function handleSearch(val: string) {
  searchInput.value = val
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    fetchWithFilter()
  }, 300)
}

function fetchWithFilter() {
  const params: { search?: string; status?: string } = {}
  if (searchInput.value.trim()) params.search = searchInput.value.trim()
  if (activeTab.value !== 'all') params.status = activeTab.value
  store.fetchDefinitions(params)
}

watch(activeTab, () => {
  fetchWithFilter()
})

// CRUD
function handleEdit(def: FlowDefinition) {
  router.push({ path: '/flow-designer', query: { id: def.id } })
}

async function handlePublish(def: FlowDefinition) {
  const action = def.status === 'published' ? '取消发布' : '发布'
  try {
    await ElMessageBox.confirm(`确认${action} "${def.name}"？`, `${action}确认`)
    await store.publishDefinition(def.id)
    ElMessage.success(`已${action}`)
  } catch {
    // cancelled or failed
  }
}

async function handleDelete(def: FlowDefinition) {
  try {
    await ElMessageBox.confirm(`确认删除 "${def.name}"？此操作不可撤销。`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      confirmButtonClass: 'el-button--danger',
    })
    await store.deleteDefinition(def.id)
    ElMessage.success('已删除')
  } catch {
    // cancelled
  }
}

// Helpers
function formatDate(d: string) {
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
  <div :class="$style.view">
    <el-scrollbar :class="$style.scrollbar">
      <!-- Header -->
      <div :class="$style.header">
        <div :class="$style.titleRow">
          <div>
            <h1>流程管理</h1>
            <p :class="$style.subtitle">创建和管理业务流程定义</p>
          </div>
          <div :class="$style.headerActions">
            <el-button type="primary" :icon="Plus" @click="openCreateDialog">新建流程</el-button>
          </div>
        </div>

        <!-- Filter bar -->
        <div :class="$style.toolbar">
          <div :class="$style.tabs">
            <button
              v-for="tab in filterTabs"
              :key="tab.value"
              :class="[$style.tab, activeTab === tab.value && $style.tabActive]"
              @click="activeTab = tab.value"
            >{{ tab.label }}</button>
          </div>
          <el-input
            v-model="searchInput"
            :prefix-icon="Search"
            placeholder="搜索流程名称..."
            clearable
            :class="$style.search"
            @input="handleSearch"
            @clear="handleSearch('')"
          />
        </div>
      </div>

      <!-- Loading -->
      <div v-if="store.loading && store.definitions.length === 0" :class="$style.content">
        <el-skeleton :rows="6" animated />
      </div>

      <!-- Empty -->
      <div v-else-if="!store.loading && store.definitions.length === 0" :class="$style.emptyState">
        <div :class="$style.emptyIcon">
          <el-icon :size="64"><Document /></el-icon>
        </div>
        <h2>还没有流程定义</h2>
        <p>创建您的第一个流程来开始使用</p>
        <el-button type="primary" size="large" :icon="Plus" @click="openCreateDialog">新建流程</el-button>
      </div>

      <!-- Card Grid -->
      <div v-else :class="$style.content">
        <div :class="$style.cards">
          <div
            v-for="def in store.definitions"
            :key="def.id"
            :class="$style.card"
          >
            <div :class="$style.cardBody">
              <h3 :class="$style.cardName">{{ def.name }}</h3>
              <p v-if="def.description" :class="$style.cardDesc">{{ def.description }}</p>
              <div :class="$style.cardMeta">
                <el-tag :type="statusTagType(def.status)" size="small">{{ statusLabel(def.status) }}</el-tag>
                <el-tag v-if="def.category" size="small" type="info">{{ def.category }}</el-tag>
                <span :class="$style.cardDate">{{ formatDate(def.createdAt) }}</span>
              </div>
            </div>
            <div :class="$style.cardActions">
              <el-button size="small" text type="primary" :icon="Edit" @click="handleEdit(def)">编辑</el-button>
              <el-button
                size="small"
                text
                :type="def.status === 'published' ? 'warning' : 'success'"
                :icon="Promotion"
                @click="handlePublish(def)"
              >{{ def.status === 'published' ? '取消发布' : '发布' }}</el-button>
              <el-button size="small" text type="danger" :icon="Delete" @click="handleDelete(def)">删除</el-button>
            </div>
          </div>
        </div>

        <!-- Pagination placeholder — API returns flat list for now -->
      </div>
    </el-scrollbar>

    <!-- Create Dialog -->
    <el-dialog
      v-model="createDialogVisible"
      title="新建流程"
      width="480px"
      :close-on-click-modal="false"
      append-to-body
    >
      <el-form label-position="top" @submit.prevent="confirmCreate">
        <el-form-item label="流程名称" required>
          <el-input
            v-model="createName"
            placeholder="请输入流程名称"
            maxlength="100"
            show-word-limit
            @keyup.enter="confirmCreate"
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="createDescription"
            type="textarea"
            :rows="3"
            placeholder="请输入流程描述（可选）"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="分类">
          <el-input
            v-model="createCategory"
            placeholder="请输入分类标签（可选）"
            maxlength="50"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmCreate">创建并编辑</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style module>
.view {
  height: 100%;
  background: #f0f2f5;
}

.scrollbar {
  height: 100%;
}

.header {
  max-width: 1200px;
  margin: 0 auto;
  padding: 28px 24px 0;
}

.titleRow {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.titleRow h1 {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 4px;
  color: #303133;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.headerActions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;
  flex-wrap: wrap;
}

.tabs {
  display: flex;
  gap: 2px;
  background: #e8eaed;
  border-radius: 8px;
  padding: 3px;
}

.tab {
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
}

.tab:hover {
  color: #303133;
}

.tabActive {
  color: #303133;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.search {
  width: 240px;
}

.content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 24px 0;
}

.emptyState {
  max-width: 1200px;
  margin: 0 auto;
  padding: 100px 24px 0;
  text-align: center;
}

.emptyIcon {
  color: #dcdfe6;
  margin-bottom: 20px;
}

.emptyState h2 {
  font-size: 18px;
  color: #303133;
  margin: 0 0 8px;
}

.emptyState p {
  font-size: 14px;
  color: #909399;
  margin: 0 0 24px;
}

/* Cards */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  padding: 20px 24px;
  transition: all 0.2s ease;
}

.card:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.1);
  transform: translateY(-1px);
}

.cardBody {
  margin-bottom: 14px;
}

.cardName {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cardDesc {
  font-size: 13px;
  color: #606266;
  margin: 0 0 10px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cardMeta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.cardDate {
  font-size: 12px;
  color: #c0c4cc;
  margin-left: auto;
}

.cardActions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  padding-top: 12px;
  border-top: 1px solid #f0f2f5;
}

.cardActions :global(.el-button) {
  padding: 4px 6px;
  font-size: 12px;
}
</style>
