<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { apiClient } from '@/utils/apiClient'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus } from '@element-plus/icons-vue'
import AppIcon from '@schema-form/shared-components/common/AppIcon.vue'

interface DictType {
  id: string
  name: string
  code: string
  status: string
  remark: string
  createdAt: string
}

interface DictData {
  id: string
  dictTypeId: string
  label: string
  value: string
  sort: number
  status: string
  remark: string
}

interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const types = ref<DictType[]>([])
const typesLoading = ref(false)
const typeSearchQuery = ref('')
const typeStatusFilter = ref('')
const typePage = ref(1)
const typePageSize = ref(20)
const typeTotal = ref(0)

const typeDialogVisible = ref(false)
const typeDialogMode = ref<'create' | 'edit'>('create')
const typeForm = ref({
  name: '',
  code: '',
  status: 'active',
  remark: '',
})
const editingTypeId = ref('')

const selectedType = ref<DictType | null>(null)
const dataList = ref<DictData[]>([])
const dataLoading = ref(false)
const dataSearchQuery = ref('')
const dataStatusFilter = ref('')
const dataPage = ref(1)
const dataPageSize = ref(20)
const dataTotal = ref(0)

const dataDialogVisible = ref(false)
const dataDialogMode = ref<'create' | 'edit'>('create')
const dataForm = ref({
  label: '',
  value: '',
  sort: 0,
  status: 'active',
  remark: '',
})
const editingDataId = ref('')

async function fetchTypes() {
  typesLoading.value = true
  try {
    const params = new URLSearchParams()
    if (typeSearchQuery.value) params.set('q', typeSearchQuery.value)
    if (typeStatusFilter.value) params.set('status', typeStatusFilter.value)
    params.set('page', String(typePage.value))
    params.set('pageSize', String(typePageSize.value))

    const res = await apiClient.get<PagedResult<DictType>>(`/dict/types?${params.toString()}`)
    types.value = res.items
    typeTotal.value = res.total
  } finally {
    typesLoading.value = false
  }
}

function openCreateType() {
  typeDialogMode.value = 'create'
  typeForm.value = { name: '', code: '', status: 'active', remark: '' }
  typeDialogVisible.value = true
}

function openEditType(dictType: DictType) {
  typeDialogMode.value = 'edit'
  editingTypeId.value = dictType.id
  typeForm.value = {
    name: dictType.name,
    code: dictType.code,
    status: dictType.status,
    remark: dictType.remark || '',
  }
  typeDialogVisible.value = true
}

async function handleTypeSubmit() {
  if (!typeForm.value.name.trim()) {
    ElMessage.warning('请输入字典类型名称')
    return
  }
  if (!typeForm.value.code.trim()) {
    ElMessage.warning('请输入字典类型编码')
    return
  }

  if (typeDialogMode.value === 'create') {
    await apiClient.post('/dict/types', typeForm.value)
    ElMessage.success('字典类型创建成功')
  } else {
    await apiClient.put(`/dict/types/${editingTypeId.value}`, typeForm.value)
    ElMessage.success('字典类型更新成功')
  }
  typeDialogVisible.value = false
  fetchTypes()
}

async function handleTypeDelete(dictType: DictType) {
  await ElMessageBox.confirm(
    `确认删除字典类型「${dictType.name}」？该类型下的所有字典数据将被一并删除。`,
    '删除确认',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
  await apiClient.delete(`/dict/types/${dictType.id}`)
  ElMessage.success('字典类型已删除')
  if (selectedType.value?.id === dictType.id) {
    selectedType.value = null
    dataList.value = []
  }
  fetchTypes()
}

function selectType(dictType: DictType) {
  selectedType.value = dictType
  dataPage.value = 1
  fetchDataList()
}

function handleTypePageChange(page: number) {
  typePage.value = page
  fetchTypes()
}

async function fetchDataList() {
  if (!selectedType.value) return
  dataLoading.value = true
  try {
    const params = new URLSearchParams()
    params.set('dictTypeId', selectedType.value.id)
    if (dataSearchQuery.value) params.set('q', dataSearchQuery.value)
    if (dataStatusFilter.value) params.set('status', dataStatusFilter.value)
    params.set('page', String(dataPage.value))
    params.set('pageSize', String(dataPageSize.value))

    const res = await apiClient.get<PagedResult<DictData>>(`/dict/data?${params.toString()}`)
    dataList.value = res.items
    dataTotal.value = res.total
  } finally {
    dataLoading.value = false
  }
}

function openCreateData() {
  dataDialogMode.value = 'create'
  dataForm.value = { label: '', value: '', sort: 0, status: 'active', remark: '' }
  dataDialogVisible.value = true
}

function openEditData(dictData: DictData) {
  dataDialogMode.value = 'edit'
  editingDataId.value = dictData.id
  dataForm.value = {
    label: dictData.label,
    value: dictData.value,
    sort: dictData.sort ?? 0,
    status: dictData.status,
    remark: dictData.remark || '',
  }
  dataDialogVisible.value = true
}

async function handleDataSubmit() {
  if (!selectedType.value) return
  if (!dataForm.value.label.trim()) {
    ElMessage.warning('请输入字典标签')
    return
  }
  if (!dataForm.value.value.trim()) {
    ElMessage.warning('请输入字典值')
    return
  }

  if (dataDialogMode.value === 'create') {
    await apiClient.post('/dict/data', {
      ...dataForm.value,
      dictTypeId: selectedType.value.id,
    })
    ElMessage.success('字典数据创建成功')
  } else {
    await apiClient.put(`/dict/data/${editingDataId.value}`, dataForm.value)
    ElMessage.success('字典数据更新成功')
  }
  dataDialogVisible.value = false
  fetchDataList()
}

async function handleDataDelete(dictData: DictData) {
  await ElMessageBox.confirm(
    `确认删除字典数据「${dictData.label}」？`,
    '删除确认',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
  await apiClient.delete(`/dict/data/${dictData.id}`)
  ElMessage.success('字典数据已删除')
  fetchDataList()
}

function handleDataPageChange(page: number) {
  dataPage.value = page
  fetchDataList()
}

watch(typeSearchQuery, () => {
  typePage.value = 1
  fetchTypes()
})

watch(dataSearchQuery, () => {
  dataPage.value = 1
  fetchDataList()
})

watch(dataStatusFilter, () => {
  dataPage.value = 1
  fetchDataList()
})

onMounted(fetchTypes)
</script>

<template>
  <div :class="$style.layout">
    <!-- 左侧：字典类型列表 -->
    <div :class="$style.leftPanel">
      <div :class="$style.panelHeader">
        <h3 :class="$style.panelTitle">
          <AppIcon name="folder" />
          字典类型
        </h3>
        <el-button type="primary" size="small" :icon="Plus" @click="openCreateType">
          新增
        </el-button>
      </div>

      <div :class="$style.panelSearch">
        <el-input
          v-model="typeSearchQuery"
          placeholder="搜索名称或编码"
          :prefix-icon="Search"
          clearable
          size="small"
        />
      </div>

      <div :class="$style.typeList" v-loading="typesLoading">
        <div
          v-for="item in types"
          :key="item.id"
          :class="[$style.typeItem, { [$style.typeItemActive]: selectedType?.id === item.id }]"
          @click="selectType(item)"
        >
          <div :class="$style.typeInfo">
            <div :class="$style.typeName">{{ item.name }}</div>
            <div :class="$style.typeCode">{{ item.code }}</div>
          </div>
          <div :class="$style.typeActions">
            <el-tag v-if="item.status === 'inactive'" size="small" type="warning">停用</el-tag>
            <el-button link size="small" @click.stop="openEditType(item)">编辑</el-button>
            <el-button link size="small" type="danger" @click.stop="handleTypeDelete(item)">删除</el-button>
          </div>
        </div>
        <div v-if="!typesLoading && types.length === 0" :class="$style.empty">
          暂无字典类型
        </div>
      </div>

      <div v-if="typeTotal > typePageSize" :class="$style.pagination">
        <el-pagination
          small
          layout="prev, pager, next"
          :total="typeTotal"
          :page-size="typePageSize"
          :current-page="typePage"
          @current-change="handleTypePageChange"
        />
      </div>
    </div>

    <!-- 右侧：字典数据列表 -->
    <div :class="$style.rightPanel">
      <template v-if="selectedType">
        <div :class="$style.panelHeader">
          <h3 :class="$style.panelTitle">
            <AppIcon name="list" />
            {{ selectedType.name }} — 字典数据
          </h3>
          <el-button type="primary" size="small" :icon="Plus" @click="openCreateData">
            新增数据
          </el-button>
        </div>

        <div :class="$style.panelSearch">
          <el-input
            v-model="dataSearchQuery"
            placeholder="搜索标签或值"
            :prefix-icon="Search"
            clearable
            size="small"
            :class="$style.searchInput"
          />
          <el-select v-model="dataStatusFilter" placeholder="状态筛选" clearable size="small" style="width: 100px">
            <el-option label="启用" value="active" />
            <el-option label="停用" value="inactive" />
          </el-select>
        </div>

        <el-table :data="dataList" v-loading="dataLoading" :class="$style.table" style="width: 100%">
          <el-table-column prop="label" label="标签" min-width="120" />
          <el-table-column prop="value" label="值" min-width="120" />
          <el-table-column prop="sort" label="排序" width="80" align="center" />
          <el-table-column prop="status" label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 'active' ? 'success' : 'warning'" size="small">
                {{ row.status === 'active' ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="140" />
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <div :class="$style.actions">
                <el-button link size="small" @click="openEditData(row)">编辑</el-button>
                <el-button link size="small" type="danger" @click="handleDataDelete(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="dataTotal > dataPageSize" :class="$style.pagination">
          <el-pagination
            small
            layout="prev, pager, next"
            :total="dataTotal"
            :page-size="dataPageSize"
            :current-page="dataPage"
            @current-change="handleDataPageChange"
          />
        </div>
      </template>

      <div v-else :class="$style.placeholder">
        <AppIcon name="list" :size="48" style="color: var(--el-text-color-placeholder)" />
        <p>请从左侧选择字典类型查看数据</p>
      </div>
    </div>
  </div>

  <!-- 字典类型对话框 -->
  <el-dialog
    v-model="typeDialogVisible"
    :title="typeDialogMode === 'create' ? '新增字典类型' : '编辑字典类型'"
    width="480px"
    destroy-on-close
  >
    <el-form label-width="80px">
      <el-form-item label="名称">
        <el-input v-model="typeForm.name" placeholder="请输入字典类型名称" />
      </el-form-item>
      <el-form-item label="编码">
        <el-input v-model="typeForm.code" placeholder="如 city、gender、status" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="typeForm.status" style="width: 100%">
          <el-option label="启用" value="active" />
          <el-option label="停用" value="inactive" />
        </el-select>
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="typeForm.remark" type="textarea" :rows="2" placeholder="备注（可选）" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="typeDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleTypeSubmit">确定</el-button>
    </template>
  </el-dialog>

  <!-- 字典数据对话框 -->
  <el-dialog
    v-model="dataDialogVisible"
    :title="dataDialogMode === 'create' ? '新增字典数据' : '编辑字典数据'"
    width="480px"
    destroy-on-close
  >
    <el-form label-width="80px">
      <el-form-item label="标签">
        <el-input v-model="dataForm.label" placeholder="显示文本，如：北京" />
      </el-form-item>
      <el-form-item label="值">
        <el-input v-model="dataForm.value" placeholder="存储值，如：beijing" />
      </el-form-item>
      <el-form-item label="排序">
        <el-input-number v-model="dataForm.sort" :min="0" :max="9999" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="dataForm.status" style="width: 100%">
          <el-option label="启用" value="active" />
          <el-option label="停用" value="inactive" />
        </el-select>
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="dataForm.remark" type="textarea" :rows="2" placeholder="备注（可选）" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dataDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleDataSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<style module>
.layout {
  display: flex;
  gap: 16px;
  min-height: 600px;
  padding: 20px;
}

.leftPanel {
  width: 320px;
  flex-shrink: 0;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}

.rightPanel {
  flex: 1;
  min-width: 0;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.panelHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.panelTitle {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.panelSearch {
  padding: 8px 12px;
  display: flex;
  gap: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.panelSearch > *:first-child {
  flex: 1;
}

.typeList {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.typeItem {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  cursor: pointer;
  transition: background-color 0.15s;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.typeItem:hover {
  background: var(--el-fill-color-light);
}

.typeItemActive {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-9);
}

.typeItemActive:hover {
  background: var(--el-color-primary-light-8);
}

.typeInfo {
  min-width: 0;
  flex: 1;
}

.typeName {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.typeCode {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  font-family: monospace;
  margin-top: 2px;
}

.typeActions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
}

.typeItem:hover .typeActions {
  opacity: 1;
}

.table {
  flex: 1;
  border-radius: 8px;
  overflow: hidden;
}

.actions {
  display: flex;
  gap: 4px;
  align-items: center;
}

.pagination {
  padding: 12px 0 4px;
  display: flex;
  justify-content: flex-end;
}

.placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--el-text-color-placeholder);
}

.placeholder p {
  font-size: 14px;
  margin: 0;
}

.empty {
  text-align: center;
  padding: 32px 16px;
  color: var(--el-text-color-placeholder);
  font-size: 13px;
}

.searchInput {
  flex: 1;
}

@media (max-width: 900px) {
  .layout {
    flex-direction: column;
  }

  .leftPanel {
    width: 100%;
  }

  .typeActions {
    opacity: 1;
  }
}
</style>
