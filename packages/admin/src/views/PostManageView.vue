<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiClient } from '@/utils/apiClient'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import { AddIcon, SearchIcon } from 'tdesign-icons-vue-next'

interface Post {
  id: string
  postCode: string
  postName: string
  sort: number
  status: string
  remark: string
}

const posts = ref<Post[]>([])
const total = ref(0)
const loading = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const form = ref({
  postCode: '',
  postName: '',
  sort: 0,
  status: 'active',
  remark: '',
})
const editingId = ref('')

async function fetchPosts() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (searchQuery.value) params.set('search', searchQuery.value)
    params.set('page', String(currentPage.value))
    params.set('pageSize', String(pageSize.value))

    const res = await apiClient.get<{ items: Post[]; total: number }>(`/posts?${params}`)
    posts.value = res.items
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function openCreate() {
  dialogMode.value = 'create'
  form.value = { postCode: '', postName: '', sort: 0, status: 'active', remark: '' }
  dialogVisible.value = true
}

function openEdit(post: Post) {
  dialogMode.value = 'edit'
  editingId.value = post.id
  form.value = {
    postCode: post.postCode,
    postName: post.postName,
    sort: post.sort ?? 0,
    status: post.status || 'active',
    remark: post.remark || '',
  }
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!form.value.postCode.trim()) {
    MessagePlugin.warning('请输入岗位编码')
    return
  }
  if (!form.value.postName.trim()) {
    MessagePlugin.warning('请输入岗位名称')
    return
  }

  if (dialogMode.value === 'create') {
    await apiClient.post('/posts', form.value)
    MessagePlugin.success('岗位创建成功')
  } else {
    await apiClient.put(`/posts/${editingId.value}`, form.value)
    MessagePlugin.success('岗位更新成功')
  }
  dialogVisible.value = false
  fetchPosts()
}

async function handleDelete(post: Post) {
  const confirmDia = DialogPlugin.confirm({
    header: '删除确认',
    body: `确认删除岗位「${post.postName}」？如有用户关联需先处理。`,
    confirmBtn: '删除',
    cancelBtn: '取消',
    onConfirm: async () => {
      await apiClient.delete(`/posts/${post.id}`)
      MessagePlugin.success('岗位已删除')
      fetchPosts()
      confirmDia.destroy()
    },
    onClose: () => {
      confirmDia.destroy()
    },
  })
}

function handlePageChange(page: number) {
  currentPage.value = page
  fetchPosts()
}

function handleSizeChange(size: number) {
  pageSize.value = size
  currentPage.value = 1
  fetchPosts()
}

function handleSearch() {
  currentPage.value = 1
  fetchPosts()
}

onMounted(fetchPosts)
</script>

<template>
  <div :class="$style.wrapper">
    <div :class="$style.toolbar">
      <t-input
        v-model="searchQuery"
        placeholder="搜索岗位名称或编码"
        :prefix-icon="SearchIcon"
        clearable
        :class="$style.search"
        @clear="handleSearch"
        @keyup.enter="handleSearch"
      />
      <t-button theme="primary" :icon="AddIcon" @click="openCreate">
        新增岗位
      </t-button>
    </div>

    <t-table :data="posts" :loading="loading" :class="$style.table">
      <t-col prop="postCode" label="岗位编码" :min-width="120" />
      <t-col prop="postName" label="岗位名称" :min-width="120" />
      <t-col prop="sort" label="排序" :width="80" />
      <t-col label="状态" :width="80">
        <template #cell="{ row }">
          <t-tag :theme="row.status === 'active' ? 'success' : 'warning'" size="small">
            {{ row.status === 'active' ? '正常' : '停用' }}
          </t-tag>
        </template>
      </t-col>
      <t-col prop="remark" label="备注" :min-width="160" />
      <t-col label="操作" :width="160" fixed="right">
        <template #cell="{ row }">
          <div :class="$style.actions">
            <t-button variant="text" size="small" @click="openEdit(row)">编辑</t-button>
            <t-button variant="text" size="small" theme="danger" @click="handleDelete(row)">删除</t-button>
          </div>
        </template>
      </t-col>
    </t-table>

    <div :class="$style.pagination">
      <t-pagination
        v-model:current="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-size-options="[10, 20, 50]"
        show-total
        show-page-size
        @current-change="handlePageChange"
        @page-size-change="handleSizeChange"
      />
    </div>
  </div>

  <!-- Create/Edit Dialog -->
  <t-dialog
    v-model:visible="dialogVisible"
    :header="dialogMode === 'create' ? '新增岗位' : '编辑岗位'"
    width="500px"
    destroy-on-close
  >
    <t-form label-width="80px">
      <t-form-item label="岗位编码">
        <t-input v-model="form.postCode" placeholder="请输入岗位编码（如：ceo、hr）" />
      </t-form-item>
      <t-form-item label="岗位名称">
        <t-input v-model="form.postName" placeholder="请输入岗位名称（如：首席执行官）" />
      </t-form-item>
      <t-form-item label="排序">
        <t-input-number v-model="form.sort" :min="0" :max="9999" />
      </t-form-item>
      <t-form-item label="状态">
        <t-select v-model="form.status" :style="{ width: '100%' }">
          <t-option label="正常" value="active" />
          <t-option label="停用" value="inactive" />
        </t-select>
      </t-form-item>
      <t-form-item label="备注">
        <t-input v-model="form.remark" type="textarea" :rows="2" placeholder="备注信息（可选）" />
      </t-form-item>
    </t-form>
    <template #footer>
      <t-button @click="dialogVisible = false">取消</t-button>
      <t-button theme="primary" @click="handleSubmit">确定</t-button>
    </template>
  </t-dialog>
</template>

<style module>
.wrapper {
  width: 100%;
  padding: 20px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.search {
  width: 280px;
}

.table {
  border-radius: 8px;
  overflow: hidden;
}

.actions {
  display: flex;
  gap: 4px;
  align-items: center;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
