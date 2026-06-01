<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, VideoPlay } from '@element-plus/icons-vue'
import { useFlowDefinitionStore } from '../stores/flowDefinition.js'
import { useFlowInstanceStore } from '../stores/flowInstance.js'
import styles from './FlowListView.module.scss'

const router = useRouter()
const store = useFlowDefinitionStore()
const instanceStore = useFlowInstanceStore()

const publishingId = ref<string | null>(null)
const COOLDOWN_MS = 2000
const createDialogVisible = ref(false)
const createForm = reactive({
  name: '',
  description: '',
  category: '',
})

onMounted(() => {
  store.fetchDefinitions()
})

function handleCreate() {
  createForm.name = ''
  createForm.description = ''
  createForm.category = ''
  createDialogVisible.value = true
}

async function handleCreateConfirm() {
  if (!createForm.name.trim()) {
    ElMessage.warning('请输入流程名称')
    return
  }
  try {
    const def = await store.createDefinition({
      name: createForm.name.trim(),
      description: createForm.description.trim(),
      category: createForm.category.trim(),
    })
    createDialogVisible.value = false
    router.push({ name: 'flow-designer', query: { id: def.id } })
  } catch {
    ElMessage.error('创建失败')
  }
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
  try {
    await store.deleteDefinition(id)
    ElMessage.success('删除成功')
  } catch {
    ElMessage.error('删除失败')
  }
}

async function handlePublish(id: string) {
  if (publishingId.value) return
  publishingId.value = id
  try {
    await store.publishDefinition(id)
    ElMessage.success('发布成功')
  } catch {
    ElMessage.error('发布失败')
  } finally {
    setTimeout(() => { publishingId.value = null }, COOLDOWN_MS)
  }
}

async function handleStart(id: string) {
  try {
    await ElMessageBox.confirm('确定启动该流程？', '启动流程', {
      confirmButtonText: '启动',
      cancelButtonText: '取消',
      type: 'info',
    })
    const instance = await instanceStore.startInstance(id)
    ElMessage.success('流程已启动')
    router.push({ name: 'flow-instance-detail', params: { id: instance.id } })
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('启动失败')
    }
  }
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
  <div :class="styles.flowList">
    <div :class="styles.header">
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
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <div :class="styles.actions">
            <el-button size="small" @click="handleEdit(row.id)">编辑</el-button>
            <el-button
              v-if="row.status === 'draft'"
              size="small"
              type="success"
              :loading="publishingId === row.id"
              :disabled="publishingId !== null"
              @click="handlePublish(row.id)"
            >
              {{ publishingId === row.id ? '发布中...' : '发布' }}
            </el-button>
            <el-button
              v-if="row.status === 'published'"
              size="small"
              type="primary"
              :icon="VideoPlay"
              @click="handleStart(row.id)"
            >
              启动
            </el-button>
            <el-button size="small" type="danger" @click="handleDelete(row.id, row.name)">
              删除
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新建流程对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新建流程"
      width="480px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form :model="createForm" label-width="80px">
        <el-form-item label="流程名称" required>
          <el-input v-model="createForm.name" placeholder="输入流程名称" maxlength="50" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="createForm.description" type="textarea" :rows="3" placeholder="流程描述（可选）" />
        </el-form-item>
        <el-form-item label="分类">
          <el-input v-model="createForm.category" placeholder="流程分类（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreateConfirm">创建并编辑</el-button>
      </template>
    </el-dialog>
  </div>
</template>
