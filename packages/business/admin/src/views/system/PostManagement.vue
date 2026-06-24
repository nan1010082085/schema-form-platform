<script setup lang="ts">
/**
 * 岗位管理
 */
import { ref, onMounted } from 'vue'
import { loadPosts, createPost, updatePost, deletePost } from '@/api/adminApi'
import { ElMessage, ElMessageBox } from 'element-plus'

const posts = ref<any[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const editingPost = ref<any>(null)
const form = ref({ name: '', code: '', sort: 0, status: 'active' })

async function load() {
  loading.value = true
  try { const d = await loadPosts(); posts.value = d.items } catch { } finally { loading.value = false }
}

function openCreate() { editingPost.value = null; form.value = { name: '', code: '', sort: 0, status: 'active' }; dialogVisible.value = true }
function openEdit(post: any) { editingPost.value = post; form.value = { name: post.name, code: post.code, sort: post.sort, status: post.status }; dialogVisible.value = true }

async function handleSave() {
  if (!form.value.name || !form.value.code) { ElMessage.warning('请填写必填字段'); return }
  try {
    if (editingPost.value) await updatePost(editingPost.value.id, form.value)
    else await createPost(form.value)
    ElMessage.success('保存成功'); dialogVisible.value = false; await load()
  } catch (e: any) { ElMessage.error(e?.message || '保存失败') }
}

async function handleDelete(post: any) {
  try {
    await ElMessageBox.confirm(`确定删除岗位 "${post.name}" 吗？`, '确认删除', { type: 'warning' })
    await deletePost(post.id); ElMessage.success('删除成功'); await load()
  } catch (e: any) { if (e !== 'cancel') ElMessage.error(e?.message || '删除失败') }
}

onMounted(load)
</script>

<template>
  <div :class="$style.container">
    <div :class="$style.header"><h2>岗位管理</h2><el-button type="primary" @click="openCreate">+ 新增</el-button></div>
    <el-table :data="posts" v-loading="loading" stripe>
      <el-table-column prop="name" label="岗位名称" />
      <el-table-column prop="code" label="岗位编码" />
      <el-table-column prop="sort" label="排序" width="80" />
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">{{ row.status === 'active' ? '正常' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog v-model="dialogVisible" :title="editingPost ? '编辑岗位' : '新增岗位'" width="450px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="岗位名称" required><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="岗位编码" required><el-input v-model="form.code" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" :min="0" /></el-form-item>
        <el-form-item label="状态"><el-radio-group v-model="form.status"><el-radio value="active">正常</el-radio><el-radio value="inactive">停用</el-radio></el-radio-group></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" @click="handleSave">确定</el-button></template>
    </el-dialog>
  </div>
</template>

<style module>
.container { padding: 16px; background: var(--bg-color-page); height: 100%; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header h2 { margin: 0; font-size: 18px; font-weight: 600; }
</style>
