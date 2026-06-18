<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiClient } from '@/utils/apiClient'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus } from '@element-plus/icons-vue'

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
    ElMessage.warning('请输入岗位编码')
    return
  }
  if (!form.value.postName.trim()) {
    ElMessage.warning('请输入岗位名称')
    return
  }

  if (dialogMode.value === 'create') {
    await apiClient.post('/posts', form.value)
    ElMessage.success('岗位创建成功')
  } else {
    await apiClient.put(`/posts/${editingId.value}`, form.value)
    ElMessage.success('岗位更新成功')
  }
  dialogVisible.value = false
  fetchPosts()
}

async function handleDelete(post: Post) {
  try {
    await ElMessageBox.confirm(
      `确认删除岗位「${post.postName}」？如有用户关联需先处理。`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    )
    await apiClient.delete(`/posts/${post.id}`)
    ElMessage.success('岗位已删除')
    fetchPosts()
  } catch {
    // 用户取消删除
  }
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
      <el-input
        v-model="searchQuery"
        placeholder="搜索岗位名称或编码"
        :prefix-icon="Search"
        clearable
        :class="$style.search"
        @clear="handleSearch"
        @keyup.enter="handleSearch"
      />
      <el-button type="primary" :icon="Plus" @click="openCreate">
        新增岗位
      </el-button>
    </div>

    <el-table :data="posts" v-loading="loading" :class="$style.table" border stripe>
      <el-table-column prop="postCode" label="岗位编码" min-width="120" />
      <el-table-column prop="postName" label="岗位名称" min-width="120" />
      <el-table-column prop="sort" label="排序" width="80" align="center" />
      <el-table-column label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'warning'" size="small">
            {{ row.status === 'active' ? '正常' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
      <el-table-column label="操作" width="160" fixed="right" align="center">
        <template #default="{ row }">
          <div :class="$style.actions">
            <el-button type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <div :class="$style.pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        background
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>
  </div>

  <!-- Create/Edit Dialog -->
  <el-dialog
    v-model="dialogVisible"
    :title="dialogMode === 'create' ? '新增岗位' : '编辑岗位'"
    width="500px"
    destroy-on-close
  >
    <el-form label-width="80px">
      <el-form-item label="岗位编码">
        <el-input v-model="form.postCode" placeholder="请输入岗位编码（如：ceo、hr）" />
      </el-form-item>
      <el-form-item label="岗位名称">
        <el-input v-model="form.postName" placeholder="请输入岗位名称（如：首席执行官）" />
      </el-form-item>
      <el-form-item label="排序">
        <el-input-number v-model="form.sort" :min="0" :max="9999" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="form.status" style="width: 100%">
          <el-option label="正常" value="active" />
          <el-option label="停用" value="inactive" />
        </el-select>
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="备注信息（可选）" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
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
