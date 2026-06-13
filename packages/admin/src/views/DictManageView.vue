<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { apiClient } from '@/utils/apiClient'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import { AddIcon, SearchIcon, FolderIcon, ListIcon } from 'tdesign-icons-vue-next'

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
    MessagePlugin.warning('请输入字典类型名称')
    return
  }
  if (!typeForm.value.code.trim()) {
    MessagePlugin.warning('请输入字典类型编码')
    return
  }

  if (typeDialogMode.value === 'create') {
    await apiClient.post('/dict/types', typeForm.value)
    MessagePlugin.success('字典类型创建成功')
  } else {
    await apiClient.put(`/dict/types/${editingTypeId.value}`, typeForm.value)
    MessagePlugin.success('字典类型更新成功')
  }
  typeDialogVisible.value = false
  fetchTypes()
}

async function handleTypeDelete(dictType: DictType) {
  const confirmDia = DialogPlugin.confirm({
    header: '删除确认',
    body: `确认删除字典类型「${dictType.name}」？该类型下的所有字典数据将被一并删除。`,
    confirmBtn: '删除',
    cancelBtn: '取消',
    onConfirm: async () => {
      await apiClient.delete(`/dict/types/${dictType.id}`)
      MessagePlugin.success('字典类型已删除')
      if (selectedType.value?.id === dictType.id) {
        selectedType.value = null
        dataList.value = []
      }
      fetchTypes()
      confirmDia.destroy()
    },
    onClose: () => {
      confirmDia.destroy()
    },
  })
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
    MessagePlugin.warning('请输入字典标签')
    return
  }
  if (!dataForm.value.value.trim()) {
    MessagePlugin.warning('请输入字典值')
    return
  }

  if (dataDialogMode.value === 'create') {
    await apiClient.post('/dict/data', {
      ...dataForm.value,
      dictTypeId: selectedType.value.id,
    })
    MessagePlugin.success('字典数据创建成功')
  } else {
    await apiClient.put(`/dict/data/${editingDataId.value}`, dataForm.value)
    MessagePlugin.success('字典数据更新成功')
  }
  dataDialogVisible.value = false
  fetchDataList()
}

async function handleDataDelete(dictData: DictData) {
  const confirmDia = DialogPlugin.confirm({
    header: '删除确认',
    body: `确认删除字典数据「${dictData.label}」？`,
    confirmBtn: '删除',
    cancelBtn: '取消',
    onConfirm: async () => {
      await apiClient.delete(`/dict/data/${dictData.id}`)
      MessagePlugin.success('字典数据已删除')
      fetchDataList()
      confirmDia.destroy()
    },
    onClose: () => {
      confirmDia.destroy()
    },
  })
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
          <FolderIcon />
          字典类型
        </h3>
        <t-button theme="primary" size="small" :icon="AddIcon" @click="openCreateType">
          新增
        </t-button>
      </div>

      <div :class="$style.panelSearch">
        <t-input
          v-model:value="typeSearchQuery"
          placeholder="搜索名称或编码"
          :prefix-icon="SearchIcon"
          clearable
          size="small"
        />
      </div>

      <div :class="$style.typeList">
        <t-loading :loading="typesLoading">
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
              <t-tag v-if="item.status === 'inactive'" size="small" theme="warning">停用</t-tag>
              <t-button variant="text" size="small" @click.stop="openEditType(item)">编辑</t-button>
              <t-button variant="text" size="small" theme="danger" @click.stop="handleTypeDelete(item)">删除</t-button>
            </div>
          </div>
          <div v-if="!typesLoading && types.length === 0" :class="$style.empty">
            暂无字典类型
          </div>
        </t-loading>
      </div>

      <div v-if="typeTotal > typePageSize" :class="$style.pagination">
        <t-pagination
          size="small"
          :total="typeTotal"
          :page-size="typePageSize"
          :current="typePage"
          @current-change="handleTypePageChange"
        />
      </div>
    </div>

    <!-- 右侧：字典数据列表 -->
    <div :class="$style.rightPanel">
      <template v-if="selectedType">
        <div :class="$style.panelHeader">
          <h3 :class="$style.panelTitle">
            <ListIcon />
            {{ selectedType.name }} — 字典数据
          </h3>
          <t-button theme="primary" size="small" :icon="AddIcon" @click="openCreateData">
            新增数据
          </t-button>
        </div>

        <div :class="$style.panelSearch">
          <t-input
            v-model:value="dataSearchQuery"
            placeholder="搜索标签或值"
            :prefix-icon="SearchIcon"
            clearable
            size="small"
            :class="$style.searchInput"
          />
          <t-select v-model:value="dataStatusFilter" placeholder="状态筛选" clearable size="small" :style="{ width: '100px' }">
            <t-option label="启用" value="active" />
            <t-option label="停用" value="inactive" />
          </t-select>
        </div>

        <t-table :data="dataList" :loading="dataLoading" :class="$style.table">
          <t-col prop="label" label="标签" :min-width="120" />
          <t-col prop="value" label="值" :min-width="120" />
          <t-col prop="sort" label="排序" :width="80" align="center" />
          <t-col label="状态" :width="80" align="center">
            <template #cell="{ row }">
              <t-tag :theme="row.status === 'active' ? 'success' : 'warning'" size="small">
                {{ row.status === 'active' ? '启用' : '停用' }}
              </t-tag>
            </template>
          </t-col>
          <t-col prop="remark" label="备注" :min-width="140" />
          <t-col label="操作" :width="140" fixed="right">
            <template #cell="{ row }">
              <div :class="$style.actions">
                <t-button variant="text" size="small" @click="openEditData(row)">编辑</t-button>
                <t-button variant="text" size="small" theme="danger" @click="handleDataDelete(row)">删除</t-button>
              </div>
            </template>
          </t-col>
        </t-table>

        <div v-if="dataTotal > dataPageSize" :class="$style.pagination">
          <t-pagination
            size="small"
            :total="dataTotal"
            :page-size="dataPageSize"
            :current="dataPage"
            @current-change="handleDataPageChange"
          />
        </div>
      </template>

      <div v-else :class="$style.placeholder">
        <ListIcon :size="48" style="color: var(--td-text-color-placeholder)" />
        <p>请从左侧选择字典类型查看数据</p>
      </div>
    </div>
  </div>

  <!-- 字典类型对话框 -->
  <t-dialog
    v-model:visible="typeDialogVisible"
    :header="typeDialogMode === 'create' ? '新增字典类型' : '编辑字典类型'"
    width="480px"
    destroy-on-close
  >
    <t-form label-width="80px">
      <t-form-item label="名称">
        <t-input v-model:value="typeForm.name" placeholder="请输入字典类型名称" />
      </t-form-item>
      <t-form-item label="编码">
        <t-input v-model:value="typeForm.code" placeholder="如 city、gender、status" />
      </t-form-item>
      <t-form-item label="状态">
        <t-select v-model:value="typeForm.status" :style="{ width: '100%' }">
          <t-option label="启用" value="active" />
          <t-option label="停用" value="inactive" />
        </t-select>
      </t-form-item>
      <t-form-item label="备注">
        <t-input v-model:value="typeForm.remark" type="textarea" :rows="2" placeholder="备注（可选）" />
      </t-form-item>
    </t-form>
    <template #footer>
      <t-button @click="typeDialogVisible = false">取消</t-button>
      <t-button theme="primary" @click="handleTypeSubmit">确定</t-button>
    </template>
  </t-dialog>

  <!-- 字典数据对话框 -->
  <t-dialog
    v-model:visible="dataDialogVisible"
    :header="dataDialogMode === 'create' ? '新增字典数据' : '编辑字典数据'"
    width="480px"
    destroy-on-close
  >
    <t-form label-width="80px">
      <t-form-item label="标签">
        <t-input v-model:value="dataForm.label" placeholder="显示文本，如：北京" />
      </t-form-item>
      <t-form-item label="值">
        <t-input v-model:value="dataForm.value" placeholder="存储值，如：beijing" />
      </t-form-item>
      <t-form-item label="排序">
        <t-input-number v-model:value="dataForm.sort" :min="0" :max="9999" />
      </t-form-item>
      <t-form-item label="状态">
        <t-select v-model:value="dataForm.status" :style="{ width: '100%' }">
          <t-option label="启用" value="active" />
          <t-option label="停用" value="inactive" />
        </t-select>
      </t-form-item>
      <t-form-item label="备注">
        <t-input v-model:value="dataForm.remark" type="textarea" :rows="2" placeholder="备注（可选）" />
      </t-form-item>
    </t-form>
    <template #footer>
      <t-button @click="dataDialogVisible = false">取消</t-button>
      <t-button theme="primary" @click="handleDataSubmit">确定</t-button>
    </template>
  </t-dialog>
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
  background: var(--td-bg-color-container);
  border: 1px solid var(--td-border-level-2-color);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}

.rightPanel {
  flex: 1;
  min-width: 0;
  background: var(--td-bg-color-container);
  border: 1px solid var(--td-border-level-2-color);
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
  border-bottom: 1px solid var(--td-border-level-2-color);
}

.panelTitle {
  font-size: 14px;
  font-weight: 600;
  color: var(--td-text-color-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.panelSearch {
  padding: 8px 12px;
  display: flex;
  gap: 8px;
  border-bottom: 1px solid var(--td-border-level-2-color);
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
  border-bottom: 1px solid var(--td-border-level-2-color);
}

.typeItem:hover {
  background: var(--td-bg-color-container-hover);
}

.typeItemActive {
  background: var(--td-brand-color-light);
  border-color: var(--td-brand-color-light);
}

.typeItemActive:hover {
  background: var(--td-brand-color-light-hover);
}

.typeInfo {
  min-width: 0;
  flex: 1;
}

.typeName {
  font-size: 14px;
  font-weight: 500;
  color: var(--td-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.typeCode {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
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
  color: var(--td-text-color-placeholder);
}

.placeholder p {
  font-size: 14px;
  margin: 0;
}

.empty {
  text-align: center;
  padding: 32px 16px;
  color: var(--td-text-color-placeholder);
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
