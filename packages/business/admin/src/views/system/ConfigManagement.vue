<script setup lang="ts">
/**
 * 参数设置
 */
import { ref, onMounted } from 'vue'
import { apiClient } from '@schema-form/platform-shared/utils/apiClient'
import { ElMessage, ElMessageBox } from 'element-plus'

const configs = ref<any[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const editingConfig = ref<any>(null)
const form = ref({ name: '', key: '', value: '', remark: '', isSystem: false })

async function load() {
  loading.value = true
  try { const d = await apiClient.get('/config'); configs.value = d.items } catch { } finally { loading.value = false }
}

function openCreate() { editingConfig.value = null; form.value = { name: '', key: '', value: '', remark: '', isSystem: false }; dialogVisible.value = true }
function openEdit(config: any) { editingConfig.value = config; form.value = { name: config.name, key: config.key, value: config.value, remark: config.remark || '', isSystem: config.isSystem }; dialogVisible.value = true }

async function handleSave() {
  if (!form.value.name || !form.value.key) { ElMessage.warning('请填写必填字段'); return }
  try {
    if (editingConfig.value) await apiClient.put(`/config/${editingConfig.value.id}`, form.value)
    else await apiClient.post('/config', form.value)
    ElMessage.success('保存成功'); dialogVisible.value = false; await load()
  } catch (e: any) { ElMessage.error(e?.message || '保存失败') }
}

async function handleDelete(config: any) {
  try {
    await ElMessageBox.confirm(`确定删除参数 "${config.name}" 吗？`, '确认删除', { type: 'warning' })
    await apiClient.delete(`/config/${config.id}`); ElMessage.success('删除成功'); await load()
  } catch (e: any) { if (e !== 'cancel') ElMessage.error(e?.message || '删除失败') }
}

onMounted(load)
</script>

<template>
  <div :class="$style.container">
    <div :class="$style.header"><h2>参数设置</h2><el-button type="primary" @click="openCreate">+ 新增</el-button></div>
    <el-table :data="configs" v-loading="loading" stripe>
      <el-table-column prop="name" label="参数名称" />
      <el-table-column prop="key" label="参数键名" />
      <el-table-column prop="value" label="参数值" />
      <el-table-column prop="isSystem" label="系统内置" width="100">
        <template #default="{ row }"><el-tag :type="row.isSystem ? 'warning' : 'info'" size="small">{{ row.isSystem ? '是' : '否' }}</el-tag></template>
      </el-table-column>
      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" size="small" @click="handleDelete(row)" :disabled="row.isSystem">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog v-model="dialogVisible" :title="editingConfig ? '编辑参数' : '新增参数'" width="450px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="参数名称" required><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="参数键名" required><el-input v-model="form.key" :disabled="!!editingConfig" /></el-form-item>
        <el-form-item label="参数值"><el-input v-model="form.value" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" /></el-form-item>
        <el-form-item label="系统内置"><el-switch v-model="form.isSystem" /></el-form-item>
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
