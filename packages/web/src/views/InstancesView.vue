<script setup lang="ts">
/**
 * InstancesView — Schema 实例管理页
 *
 * 卡片网格展示所有 Schema 实例。支持搜索、新建、编辑/预览/发布/删除。
 * 使用 el-scrollbar 替代原生滚动条。
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
    <el-scrollbar class="fg-instances__scrollbar">
      <!-- Header -->
      <div class="fg-instances__header">
        <div class="fg-instances__title-row">
          <div>
            <h1>Schema 实例管理</h1>
            <p class="fg-instances__subtitle">管理所有表单和搜索列表实例</p>
          </div>
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
          class="fg-instances__search"
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
        <div v-if="store.pagination.total > 0" class="fg-instances__pagination">
          <el-pagination
            v-model:current-page="store.pagination.page"
            :page-size="store.pagination.pageSize"
            :total="store.pagination.total"
            layout="total, prev, pager, next"
            @current-change="handlePageChange"
          />
        </div>
      </template>
    </el-scrollbar>
  </div>
</template>

<style scoped lang="scss">
.fg-instances {
  height: 100vh;
  background: #f0f2f5;

  &__scrollbar {
    height: 100%;
  }

  &__header {
    max-width: 1200px;
    margin: 0 auto;
    padding: 28px 24px 20px;
  }

  &__title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 20px;

    h1 {
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 4px;
      color: #303133;
    }
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

  &__search {
    max-width: 420px;
  }

  &__state {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;

    &--empty {
      text-align: center;
      padding-top: 80px;
      color: #909399;
      font-size: 15px;

      p { margin: 0 0 20px; }
    }
  }

  &__empty-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
  }

  &__cards {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
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

.fg-instances-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  padding: 20px 24px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #409eff;
    box-shadow: 0 4px 16px rgba(64, 158, 255, 0.1);
    transform: translateY(-1px);
  }

  &__body {
    margin-bottom: 14px;
  }

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
    gap: 8px;
    flex-wrap: wrap;
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
</style>
