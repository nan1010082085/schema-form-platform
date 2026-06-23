<script setup lang="ts">
/**
 * 租户管理
 */
import { ref, onMounted } from 'vue'
import { apiClient } from '@schema-form/platform-shared/utils/apiClient'
import { ElMessage, ElMessageBox } from 'element-plus'

const tenants = ref<any[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const editingTenant = ref<any>(null)
const form = ref({ name: '', code: '', status: 'active', config: { maxUsers: 100, features: [] as string[] } })

async function load() {
  loading.value = true
  try { const d = await apiClient.get('/tenants'); tenants.value = d.items } catch { } finally { loading.value = false }
}

function openCreate() { editingTenant.value = null; form.value = { name: '', code: '', status: 'active', config: { maxUsers: 100, features: [] } }; dialogVisible.value = true }
function openEdit(tenant: any) { editingTenant.value = tenant; form.value = { name: tenant.name, code: tenant.code, status: tenant.status, config: { maxUsers: tenant.config?.maxUsers || 100, features: tenant.config?.features || [] } }; dialogVisible.value = true }

async function handleSave() {
  if (!form.value.name || !form.value.code) { ElMessage.warning('请填写必填字段'); return }
  try {
    if (editingTenant.value) await apiClient.put(`/tenants/${editingTenant.value.id}`, form.value)
    else await apiClient.post('/tenants', form.value)
    ElMessage.success('保存成功'); dialogVisible.value = false; await load()
  } catch (e: any) { ElMessage.error(e?.message || '保存失败') }
}

async function handleDelete(tenant: any) {
  try {
    await ElMessageBox.confirm(`确定删除租户 "${tenant.name}" 吗？此操作不可恢复。`, '确认删除', { type: 'warning' })
    await apiClient.delete(`/tenants/${tenant.id}`); ElMessage.success('删除成功'); await load()
  } catch (e: any) { if (e !== 'cancel') ElMessage.error(e?.message || '删除失败') }
}

onMounted(load)
</script>

<template>
  <div :class="$style.container">
    <div :class="$style.header"><h2>租户管理</h2><el-button type="primary" @click="openCreate">+ 新增租户</el-button></div>
    <el-table :data="tenants" v-loading="loading" stripe>
      <el-table-column prop="name" label="租户名称" />
      <el-table-column prop="code" label="租户编码" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : row.status === 'suspended' ? 'danger' : 'info'" size="small">
            {{ row.status === 'active' ? '正常' : row.status === 'suspended' ? '已停用' : '未激活' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="最大用户" width="100">
        <template #default="{ row }">{{ row.config?.maxUsers || '-' }}</template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="170">
        <template #default="{ row }">{{ row.createdAt?.slice(0, 19).replace('T', ' ') }}</template>
      </el-table-column>
      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog v-model="dialogVisible" :title="editingTenant ? '编辑租户' : '新增租户'" width="450px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="租户名称" required><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="租户编码" required><el-input v-model="form.code" :disabled="!!editingTenant" /></el-form-item>
        <el-form-item label="最大用户"><el-input-number v-model="form.config.maxUsers" :min="1" :max="100000" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status">
            <el-option label="正常" value="active" /><el-option label="未激活" value="inactive" /><el-option label="已停用" value="suspended" />
          </el-select>
        </el-form-item>
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
