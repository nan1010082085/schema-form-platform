<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import { AddIcon, PlayIcon } from 'tdesign-icons-vue-next'
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
    MessagePlugin.warning('请输入流程名称')
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
    MessagePlugin.error('创建失败')
  }
}

function handleEdit(id: string) {
  router.push({ name: 'flow-designer', query: { id } })
}

async function handleDelete(id: string, name: string) {
  const confirmed = await new Promise<boolean>((resolve) => {
    const dialog = DialogPlugin.confirm({
      header: '确认删除',
      body: `确定删除流程「${name}」？`,
      confirmBtn: '删除',
      cancelBtn: '取消',
      theme: 'warning',
      onConfirm: () => { dialog.destroy(); resolve(true) },
      onCancel: () => { dialog.destroy(); resolve(false) },
    })
  })
  if (!confirmed) return
  try {
    await store.deleteDefinition(id)
    MessagePlugin.success('删除成功')
  } catch {
    MessagePlugin.error('删除失败')
  }
}

async function handlePublish(id: string) {
  if (publishingId.value) return
  publishingId.value = id
  try {
    await store.publishDefinition(id)
    MessagePlugin.success('发布成功')
  } catch {
    MessagePlugin.error('发布失败')
  } finally {
    setTimeout(() => { publishingId.value = null }, COOLDOWN_MS)
  }
}

async function handleStart(id: string) {
  const confirmed = await new Promise<boolean>((resolve) => {
    const dialog = DialogPlugin.confirm({
      header: '启动流程',
      body: '确定启动该流程？',
      confirmBtn: '启动',
      cancelBtn: '取消',
      theme: 'info',
      onConfirm: () => { dialog.destroy(); resolve(true) },
      onCancel: () => { dialog.destroy(); resolve(false) },
    })
  })
  if (!confirmed) return
  try {
    const instance = await instanceStore.startInstance(id)
    MessagePlugin.success('流程已启动')
    router.push({ name: 'flow-instance-detail', params: { id: instance.id } })
  } catch {
    MessagePlugin.error('启动失败')
  }
}

function statusTheme(status: string) {
  const map: Record<string, string> = {
    draft: 'default',
    published: 'success',
    archived: 'warning',
  }
  return map[status] ?? 'default'
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

const tableColumns = [
  { colKey: 'name', title: '名称', minWidth: 180 },
  { colKey: 'description', title: '描述', minWidth: 200, ellipsis: true },
  { colKey: 'category', title: '分类', width: 120 },
  { colKey: 'status', title: '状态', width: 100 },
  { colKey: 'createdAt', title: '创建时间', width: 180 },
  { colKey: 'actions', title: '操作', width: 280, fixed: 'right' },
]
</script>

<template>
  <div :class="styles.flowList">
    <div :class="styles.header">
      <h2>流程列表</h2>
      <t-button theme="primary" @click="handleCreate">
        <AddIcon />
        新建流程
      </t-button>
    </div>

    <t-table
      :data="store.definitions"
      :loading="store.loading"
      stripe
      :columns="tableColumns"
      row-key="id"
    >
      <template #status="{ row }">
        <t-tag :theme="statusTheme(row.status)" size="small">
          {{ statusLabel(row.status) }}
        </t-tag>
      </template>
      <template #createdAt="{ row }">
        {{ formatDate(row.createdAt) }}
      </template>
      <template #actions="{ row }">
        <div :class="styles.actions">
          <t-button size="small" @click="handleEdit(row.id)">编辑</t-button>
          <t-button
            v-if="row.status === 'draft'"
            size="small"
            theme="success"
            :loading="publishingId === row.id"
            :disabled="publishingId !== null"
            @click="handlePublish(row.id)"
          >
            {{ publishingId === row.id ? '发布中...' : '发布' }}
          </t-button>
          <t-button
            v-if="row.status === 'published'"
            size="small"
            theme="primary"
            @click="handleStart(row.id)"
          >
            <PlayIcon />
            启动
          </t-button>
          <t-button size="small" theme="danger" @click="handleDelete(row.id, row.name)">
            删除
          </t-button>
        </div>
      </template>
    </t-table>

    <!-- 新建流程对话框 -->
    <t-dialog
      v-model:visible="createDialogVisible"
      header="新建流程"
      width="480px"
      :close-on-overlay-click="false"
      destroy-on-close
    >
      <t-form :data="createForm" label-width="80px">
        <t-form-item label="流程名称" required>
          <t-input v-model:value="createForm.name" placeholder="输入流程名称" maxlength="50" />
        </t-form-item>
        <t-form-item label="描述">
          <t-textarea v-model:value="createForm.description" :rows="3" placeholder="流程描述（可选）" />
        </t-form-item>
        <t-form-item label="分类">
          <t-input v-model:value="createForm.category" placeholder="流程分类（可选）" />
        </t-form-item>
      </t-form>
      <template #footer>
        <t-button @click="createDialogVisible = false">取消</t-button>
        <t-button theme="primary" @click="handleCreateConfirm">创建并编辑</t-button>
      </template>
    </t-dialog>
  </div>
</template>
