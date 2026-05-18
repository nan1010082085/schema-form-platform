<script setup lang="ts">
/**
 * InstancesView — Schema 实例管理页
 *
 * 以卡片网格展示所有 Schema 实例。
 * 支持搜索、新建表单/搜索列表、编辑/预览/发布/删除操作。
 */
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Delete, Edit, View, Promotion } from '@element-plus/icons-vue'
import { useSchemaStore } from '@/stores/schema'
import type { SchemaListItem } from '@/types/api'

const router = useRouter()
const store = useSchemaStore()
const searchInput = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  store.fetchSchemas()
})

function handleSearch(val: string) {
  searchInput.value = val
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    store.fetchSchemas({ search: val, page: 1 })
  }, 300)
}

function handlePageChange(page: number) {
  store.fetchSchemas({ search: searchInput.value || undefined, page })
}

async function handleDelete(item: SchemaListItem) {
  try {
    await ElMessageBox.confirm(`确认删除 "${item.name}"？`, '删除确认', { type: 'warning' })
    const ok = await store.deleteSchema(item.id)
    if (ok) {
      ElMessage.success('已删除')
    } else {
      ElMessage.error(store.error || '删除失败')
    }
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

function handleCreateForm() {
  router.push('/editor')
}

function handleCreateSearchList() {
  router.push({ path: '/editor', query: { type: 'search-list' } })
}

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
</script>

<template>
  <div class="fg-instances">
    <!-- 顶部操作栏 -->
    <div class="fg-instances__header">
      <div class="fg-instances__title-row">
        <h1>Schema 实例管理</h1>
        <div class="fg-instances__header-actions">
          <el-button type="primary" :icon="Plus" @click="handleCreateForm">新建表单</el-button>
          <el-button type="success" :icon="Plus" @click="handleCreateSearchList">新建搜索列表</el-button>
        </div>
      </div>

      <el-input
        v-model="searchInput"
        :prefix-icon="Search"
        placeholder="搜索 Schema 名称..."
        clearable
        style="max-width: 400px"
        @input="handleSearch"
        @clear="handleSearch('')"
      />
    </div>

    <!-- Loading -->
    <div v-if="store.loading && !store.hasSchemas" class="fg-instances__state">
      <el-skeleton :rows="6" animated />
    </div>

    <!-- Error -->
    <el-alert
      v-else-if="store.hasError && !store.hasSchemas"
      :title="store.error ?? ''"
      type="error"
      show-icon
      :closable="false"
      style="margin-bottom: 16px"
    >
      <template #default>
        <el-button size="small" @click="store.fetchSchemas()">重试</el-button>
      </template>
    </el-alert>

    <!-- Empty -->
    <div v-else-if="store.isEmpty" class="fg-instances__state fg-instances__state--empty">
      <p>还没有 Schema 实例</p>
      <div class="fg-instances__empty-actions">
        <el-button type="primary" :icon="Plus" @click="handleCreateForm">创建表单</el-button>
        <el-button type="success" :icon="Plus" @click="handleCreateSearchList">创建搜索列表</el-button>
      </div>
    </div>

    <!-- Card Grid -->
    <template v-else>
      <div class="fg-instances__cards">
        <div
          v-for="item in store.schemas"
          :key="item.id"
          class="fg-instances-card"
        >
          <div class="fg-instances-card__body">
            <h3 class="fg-instances-card__name">{{ item.name }}</h3>
            <div class="fg-instances-card__meta">
              <el-tag :type="typeTagType(item.type)" size="small">{{ typeLabel(item.type) }}</el-tag>
              <el-tag :type="statusTagType(item.status)" size="small">{{ statusLabel(item.status) }}</el-tag>
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
            >
              发布
            </el-button>
            <el-button size="small" text type="danger" :icon="Delete" @click="handleDelete(item)" />
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="store.pagination.total > 0" style="display: flex; justify-content: center; margin-top: 24px;">
        <el-pagination
          v-model:current-page="store.pagination.page"
          :page-size="store.pagination.pageSize"
          :total="store.pagination.total"
          layout="total, prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.fg-instances {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.fg-instances__header {
  margin-bottom: 24px;
}

.fg-instances__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.fg-instances__title-row h1 {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
}

.fg-instances__header-actions {
  display: flex;
  gap: 8px;
}

.fg-instances__cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 16px;
}

.fg-instances-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  padding: 20px 24px;
  transition: all 0.2s ease;
}

.fg-instances-card:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 2px 12px rgba(0, 96, 162, 0.08);
}

.fg-instances-card__body {
  margin-bottom: 14px;
}

.fg-instances-card__name {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fg-instances-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.fg-instances-card__date {
  font-size: 12px;
  color: #bbb;
  margin-left: auto;
}

.fg-instances-card__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-top: 12px;
  border-top: 1px solid #f5f5f5;
}

.fg-instances__state {
  text-align: center;
  padding: 64px 0;
}

.fg-instances__state--empty {
  color: #909399;
}

.fg-instances__state--empty p {
  font-size: 16px;
  margin-bottom: 16px;
}

.fg-instances__empty-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}
</style>
