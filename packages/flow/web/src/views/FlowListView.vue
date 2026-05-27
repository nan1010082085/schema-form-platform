<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useFlowDefinitionStore } from '../stores/flowDefinition.js'

const router = useRouter()
const store = useFlowDefinitionStore()

onMounted(() => {
  store.fetchDefinitions()
})

function handleCreate() {
  router.push('/designer')
}

function handleEdit(id: string) {
  router.push({ name: 'flow-designer', query: { id } })
}

async function handleDelete(id: string, name: string) {
  await ElMessageBox.confirm(`确定删除流程「${name}」？`, '确认删除', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  })
  await store.deleteDefinition(id)
  ElMessage.success('删除成功')
}

async function handlePublish(id: string) {
  await store.publishDefinition(id)
  ElMessage.success('发布成功')
}

function statusType(status: string) {
  const map: Record<string, string> = {
    draft: 'info',
    published: 'success',
    archived: 'warning',
  }
  return map[status] ?? 'info'
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    draft: '草稿',
    published: '已发布',
    archived: '已归档',
  }
  return map[status] ?? status
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN')
}
</script>

<template>
  <div class="flow-list">
    <div class="header">
      <h2>流程列表</h2>
      <el-button type="primary" :icon="Plus" @click="handleCreate">
        新建流程
      </el-button>
    </div>

    <el-table :data="store.definitions" v-loading="store.loading" stripe>
      <el-table-column prop="name" label="名称" min-width="180" />
      <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
      <el-table-column prop="category" label="分类" width="120" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="handleEdit(row.id)">编辑</el-button>
          <el-button
            v-if="row.status === 'draft'"
            size="small"
            type="success"
            @click="handlePublish(row.id)"
          >
            发布
          </el-button>
          <el-button size="small" type="danger" @click="handleDelete(row.id, row.name)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.flow-list {
  padding: 24px;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}
</style>
