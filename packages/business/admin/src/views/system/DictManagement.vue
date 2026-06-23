<script setup lang="ts">
/**
 * 字典管理 — 字典类型 + 字典数据
 */
import { ref, onMounted, watch } from 'vue'
import { apiClient } from '@schema-form/platform-shared/utils/apiClient'
import { ElMessage, ElMessageBox } from 'element-plus'

interface DictType {
  id: string
  name: string
  code: string
  status: string
  remark: string
}

interface DictData {
  id: string
  dictTypeCode: string
  label: string
  value: string
  sort: number
  status: string
}

const dictTypes = ref<DictType[]>([])
const dictData = ref<DictData[]>([])
const loading = ref(false)
const selectedType = ref<DictType | null>(null)
const typeDialogVisible = ref(false)
const dataDialogVisible = ref(false)
const editingType = ref<DictType | null>(null)
const editingData = ref<DictData | null>(null)

const typeForm = ref({ name: '', code: '', remark: '' })
const dataForm = ref({ label: '', value: '', sort: 0, status: 'active' })

async function loadTypes() {
  loading.value = true
  try {
    const data = await apiClient.get<{ items: DictType[] }>('/dict/types')
    dictTypes.value = data.items
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '加载字典类型失败')
  } finally {
    loading.value = false
  }
}

async function loadData(typeCode: string) {
  try {
    const data = await apiClient.get<{ items: DictData[] }>(`/dict/data?dictTypeCode=${typeCode}`)
    dictData.value = data.items
  } catch { dictData.value = [] }
}

watch(selectedType, (type) => { if (type) loadData(type.code) })

function openCreateType() {
  editingType.value = null
  typeForm.value = { name: '', code: '', remark: '' }
  typeDialogVisible.value = true
}

function openEditType(type: DictType) {
  editingType.value = type
  typeForm.value = { name: type.name, code: type.code, remark: type.remark || '' }
  typeDialogVisible.value = true
}

async function handleSaveType() {
  if (!typeForm.value.name || !typeForm.value.code) { ElMessage.warning('请填写必填字段'); return }
  try {
    if (editingType.value) {
      await apiClient.put(`/dict/types/${editingType.value.id}`, typeForm.value)
    } else {
      await apiClient.post('/dict/types', typeForm.value)
    }
    ElMessage.success('保存成功')
    typeDialogVisible.value = false
    await loadTypes()
  } catch (e: unknown) { ElMessage.error(e instanceof Error ? e.message : '保存失败') }
}

async function handleDeleteType(type: DictType) {
  try {
    await ElMessageBox.confirm(`确定删除字典类型 "${type.name}" 吗？`, '确认删除', { type: 'warning' })
    await apiClient.delete(`/dict/types/${type.id}`)
    ElMessage.success('删除成功')
    if (selectedType.value?.id === type.id) { selectedType.value = null; dictData.value = [] }
    await loadTypes()
  } catch (e: unknown) { if (e !== 'cancel') ElMessage.error(e instanceof Error ? e.message : '删除失败') }
}

function openCreateData() {
  editingData.value = null
  dataForm.value = { label: '', value: '', sort: 0, status: 'active' }
  dataDialogVisible.value = true
}

function openEditData(data: DictData) {
  editingData.value = data
  dataForm.value = { label: data.label, value: data.value, sort: data.sort, status: data.status }
  dataDialogVisible.value = true
}

async function handleSaveData() {
  if (!selectedType.value || !dataForm.value.label || !dataForm.value.value) { ElMessage.warning('请填写必填字段'); return }
  try {
    if (editingData.value) {
      await apiClient.put(`/dict/data/${editingData.value.id}`, { ...dataForm.value, dictTypeCode: selectedType.value.code })
    } else {
      await apiClient.post('/dict/data', { ...dataForm.value, dictTypeCode: selectedType.value.code })
    }
    ElMessage.success('保存成功')
    dataDialogVisible.value = false
    await loadData(selectedType.value.code)
  } catch (e: unknown) { ElMessage.error(e instanceof Error ? e.message : '保存失败') }
}

async function handleDeleteData(data: DictData) {
  try {
    await ElMessageBox.confirm(`确定删除字典数据 "${data.label}" 吗？`, '确认删除', { type: 'warning' })
    await apiClient.delete(`/dict/data/${data.id}`)
    ElMessage.success('删除成功')
    if (selectedType.value) await loadData(selectedType.value.code)
  } catch (e: unknown) { if (e !== 'cancel') ElMessage.error(e instanceof Error ? e.message : '删除失败') }
}

onMounted(loadTypes)
</script>

<template>
  <div :class="$style.container">
    <div :class="$style.header"><h2>字典管理</h2></div>
    <div :class="$style.content">
      <!-- 左侧：字典类型 -->
      <div :class="$style.left">
        <div :class="$style.panelHeader">
          <span>字典类型</span>
          <el-button size="small" type="primary" @click="openCreateType">+</el-button>
        </div>
        <el-scrollbar>
          <div
            v-for="type in dictTypes"
            :key="type.id"
            :class="[$style.typeItem, { [$style.typeActive]: selectedType?.id === type.id }]"
            @click="selectedType = type"
          >
            <div :class="$style.typeName">{{ type.name }}</div>
            <div :class="$style.typeCode">{{ type.code }}</div>
            <div :class="$style.typeActions">
              <el-button link size="small" @click.stop="openEditType(type)">编辑</el-button>
              <el-button link type="danger" size="small" @click.stop="handleDeleteType(type)">删除</el-button>
            </div>
          </div>
        </el-scrollbar>
      </div>

      <!-- 右侧：字典数据 -->
      <div :class="$style.right">
        <div :class="$style.panelHeader">
          <span>{{ selectedType ? `${selectedType.name} — 数据列表` : '请选择字典类型' }}</span>
          <el-button v-if="selectedType" size="small" type="primary" @click="openCreateData">+ 新增数据</el-button>
        </div>
        <el-table v-if="selectedType" :data="dictData" stripe>
          <el-table-column prop="label" label="标签" />
          <el-table-column prop="value" label="值" />
          <el-table-column prop="sort" label="排序" width="80" />
          <el-table-column prop="status" label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
                {{ row.status === 'active' ? '正常' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openEditData(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="handleDeleteData(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 字典类型弹窗 -->
    <el-dialog v-model="typeDialogVisible" :title="editingType ? '编辑字典类型' : '新增字典类型'" width="450px">
      <el-form :model="typeForm" label-width="80px">
        <el-form-item label="类型名称" required><el-input v-model="typeForm.name" /></el-form-item>
        <el-form-item label="类型编码" required><el-input v-model="typeForm.code" :disabled="!!editingType" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="typeForm.remark" type="textarea" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="typeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveType">确定</el-button>
      </template>
    </el-dialog>

    <!-- 字典数据弹窗 -->
    <el-dialog v-model="dataDialogVisible" :title="editingData ? '编辑字典数据' : '新增字典数据'" width="450px">
      <el-form :model="dataForm" label-width="80px">
        <el-form-item label="标签" required><el-input v-model="dataForm.label" /></el-form-item>
        <el-form-item label="值" required><el-input v-model="dataForm.value" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="dataForm.sort" :min="0" /></el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="dataForm.status">
            <el-radio value="active">正常</el-radio>
            <el-radio value="inactive">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dataDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveData">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style module>
.container { padding: 16px; background: var(--bg-color-page); height: 100%; display: flex; flex-direction: column; }
.header { margin-bottom: 16px; }
.header h2 { margin: 0; font-size: 18px; font-weight: 600; }
.content { flex: 1; display: flex; gap: 16px; overflow: hidden; }
.left { width: 320px; background: var(--bg-color); border-radius: 8px; border: 1px solid var(--border-color-lighter); display: flex; flex-direction: column; }
.right { flex: 1; background: var(--bg-color); border-radius: 8px; border: 1px solid var(--border-color-lighter); padding: 16px; overflow: auto; }
.panelHeader { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--border-color-lighter); font-weight: 600; }
.typeItem { padding: 12px 16px; cursor: pointer; border-bottom: 1px solid var(--border-color-extra-light); }
.typeItem:hover { background: var(--bg-color-page); }
.typeActive { background: var(--color-primary-light-9); }
.typeName { font-size: 14px; font-weight: 500; }
.typeCode { font-size: 12px; color: var(--text-color-secondary); margin-top: 2px; }
.typeActions { margin-top: 4px; }
</style>
