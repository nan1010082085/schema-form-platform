<template>
  <div :class="$style.container">
    <!-- 搜索 -->
    <div :class="$style.search">
      <el-input
        v-model="searchQuery"
        placeholder="搜索表单"
        clearable
        @input="handleSearch"
      >
        <template #prefix>
          <AppIcon name="search" :size="14" />
        </template>
      </el-input>
    </div>

    <!-- 列表 -->
    <div v-loading="loading" :class="$style.list">
      <div
        v-for="schema in schemas"
        :key="schema.id"
        :class="[$style.item, { [$style.selected]: schema.id === selectedId }]"
        @click="$emit('select', schema)"
      >
        <div :class="$style.itemName">{{ schema.name }}</div>
        <div :class="$style.itemMeta">
          <span :class="$style.itemType">{{ schema.type || 'form' }}</span>
          <span :class="$style.itemStatus">{{ schema.status }}</span>
        </div>
      </div>

      <el-empty v-if="!loading && schemas.length === 0" description="暂无表单" />
    </div>

    <!-- 分页 -->
    <div :class="$style.pagination">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="fetchSchemas"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppIcon from '@schema-form/platform-shared/components/common/AppIcon.vue'

interface SchemaItem {
  id: string
  name: string
  type?: string
  status?: string
  publishId?: string
}

defineProps<{
  selectedId?: string
}>()

defineEmits<{
  select: [schema: SchemaItem]
}>()

const loading = ref(false)
const schemas = ref<SchemaItem[]>([])
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = 20
const total = ref(0)

async function fetchSchemas() {
  loading.value = true
  try {
    const token = localStorage.getItem('sfp_access_token')
    const params = new URLSearchParams({
      page: String(currentPage.value),
      pageSize: String(pageSize),
    })
    if (searchQuery.value) {
      params.set('search', searchQuery.value)
    }

    const API_BASE = import.meta.env.VITE_API_BASE_URL
    const response = await fetch(`${API_BASE}/schemas?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await response.json()
    if (data.success) {
      schemas.value = data.data.items || []
      total.value = data.data.total || 0
    }
  } catch (err) {
    console.error('Failed to fetch schemas:', err)
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
  fetchSchemas()
}

onMounted(fetchSchemas)
</script>

<style module>
.container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 500px;
}

.search {
  flex-shrink: 0;
}

.list {
  flex: 1;
  overflow-y: auto;
  min-height: 200px;
}

.item {
  padding: 12px 16px;
  border: 1px solid var(--border-color-lighter);
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.item:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.item.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-light-3);
}

.itemName {
  font-weight: 500;
  color: var(--text-color-primary);
  margin-bottom: 4px;
}

.itemMeta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: var(--text-color-secondary);
}

.itemType {
  background: var(--bg-color-secondary);
  padding: 2px 6px;
  border-radius: 4px;
}

.itemStatus {
  color: var(--color-success);
}

.pagination {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
}
</style>
