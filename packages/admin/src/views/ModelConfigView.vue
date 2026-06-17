<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { apiClient } from '@/utils/apiClient'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@schema-form/shared-components/common/AppIcon.vue'

interface ModelParameters {
  temperature: number
  maxTokens: number
  topP: number
}

interface ModelConfig {
  id: string
  name: string
  provider: 'deepseek' | 'openai' | 'anthropic' | 'ollama'
  model: string
  apiKey: string
  baseUrl: string
  parameters: ModelParameters
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

interface TestResult {
  reply: string
  tokens: number
  model: string
  provider: string
}

const PROVIDER_LABELS: Record<string, string> = {
  deepseek: 'DeepSeek',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  ollama: 'Ollama',
}

const DEFAULT_MODELS: Record<string, string[]> = {
  deepseek: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
  ollama: ['llama3', 'qwen2.5', 'deepseek-r1'],
}

const configs = ref<ModelConfig[]>([])
const loading = ref(false)
const searchQuery = ref('')
const providerFilter = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const form = ref({
  name: '',
  provider: 'deepseek' as ModelConfig['provider'],
  model: '',
  apiKey: '',
  baseUrl: '',
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1,
  isDefault: false,
})
const editingId = ref('')

const testDialogVisible = ref(false)
const testLoading = ref(false)
const testResult = ref<TestResult | null>(null)
const testError = ref('')
const testConfigId = ref('')

const modelSuggestions = ref<string[]>([])

function updateModelSuggestions() {
  modelSuggestions.value = DEFAULT_MODELS[form.value.provider] ?? []
}

function fetchModelSuggestions(query: string, cb: (items: Array<{ value: string }>) => void) {
  const results = modelSuggestions.value
    .filter(m => m.toLowerCase().includes(query.toLowerCase()))
    .map(m => ({ value: m }))
  cb(results)
}

async function fetchConfigs() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (searchQuery.value) params.set('search', searchQuery.value)
    if (providerFilter.value) params.set('provider', providerFilter.value)
    params.set('page', String(page.value))
    params.set('pageSize', String(pageSize.value))

    const res = await apiClient.get<PagedResult<ModelConfig>>(`/model-configs?${params.toString()}`)
    configs.value = res.items
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function openCreate() {
  dialogMode.value = 'create'
  form.value = {
    name: '',
    provider: 'deepseek',
    model: '',
    apiKey: '',
    baseUrl: '',
    temperature: 0.7,
    maxTokens: 4096,
    topP: 1,
    isDefault: false,
  }
  updateModelSuggestions()
  dialogVisible.value = true
}

function openEdit(config: ModelConfig) {
  dialogMode.value = 'edit'
  editingId.value = config.id
  form.value = {
    name: config.name,
    provider: config.provider,
    model: config.model,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    temperature: config.parameters?.temperature ?? 0.7,
    maxTokens: config.parameters?.maxTokens ?? 4096,
    topP: config.parameters?.topP ?? 1,
    isDefault: config.isDefault,
  }
  updateModelSuggestions()
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入配置名称')
    return
  }
  if (!form.value.model.trim()) {
    ElMessage.warning('请输入模型名称')
    return
  }

  const body = {
    name: form.value.name.trim(),
    provider: form.value.provider,
    model: form.value.model.trim(),
    apiKey: form.value.apiKey,
    baseUrl: form.value.baseUrl,
    parameters: {
      temperature: form.value.temperature,
      maxTokens: form.value.maxTokens,
      topP: form.value.topP,
    },
    isDefault: form.value.isDefault,
  }

  if (dialogMode.value === 'create') {
    await apiClient.post('/model-configs', body)
    ElMessage.success('模型配置创建成功')
  } else {
    await apiClient.put(`/model-configs/${editingId.value}`, body)
    ElMessage.success('模型配置更新成功')
  }
  dialogVisible.value = false
  fetchConfigs()
}

async function handleDelete(config: ModelConfig) {
  try {
    await ElMessageBox.confirm(
      `确认删除模型配置「${config.name}」（${PROVIDER_LABELS[config.provider]} / ${config.model}）？`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    )
    await apiClient.delete(`/model-configs/${config.id}`)
    ElMessage.success('模型配置已删除')
    fetchConfigs()
  } catch {
    // 用户取消
  }
}

async function handleSetDefault(config: ModelConfig) {
  await apiClient.put(`/model-configs/${config.id}`, { isDefault: true })
  ElMessage.success(`已将「${config.name}」设为 ${PROVIDER_LABELS[config.provider]} 默认模型`)
  fetchConfigs()
}

async function openTestDialog(config: ModelConfig) {
  testConfigId.value = config.id
  testResult.value = null
  testError.value = ''
  testDialogVisible.value = true
}

async function handleTestConnection() {
  testLoading.value = true
  testResult.value = null
  testError.value = ''
  try {
    const result = await apiClient.post<TestResult>(
      `/model-configs/${testConfigId.value}/test`,
      { message: 'Hello, respond with OK' },
    )
    testResult.value = result
  } catch (err) {
    testError.value = err instanceof Error ? err.message : '连接测试失败'
  } finally {
    testLoading.value = false
  }
}

function handlePageChange(p: number) {
  page.value = p
  fetchConfigs()
}

watch(searchQuery, () => {
  page.value = 1
  fetchConfigs()
})

watch(providerFilter, () => {
  page.value = 1
  fetchConfigs()
})

watch(() => form.value.provider, () => {
  updateModelSuggestions()
})

onMounted(fetchConfigs)
</script>

<template>
  <div :class="$style.wrapper">
    <div :class="$style.toolbar">
      <div :class="$style.toolbarLeft">
        <el-input
          v-model="searchQuery"
          placeholder="搜索配置名称"
          :prefix-icon="Search"
          clearable
          style="width: 240px"
        />
        <el-select v-model="providerFilter" placeholder="供应商" clearable style="width: 140px">
          <el-option v-for="(label, key) in PROVIDER_LABELS" :key="key" :label="label" :value="key" />
        </el-select>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreate">新增配置</el-button>
    </div>

    <el-table :data="configs" v-loading="loading" :class="$style.table" border stripe>
      <el-table-column prop="name" label="配置名称" min-width="160" />
      <el-table-column prop="provider" label="Provider" width="120" align="center">
        <template #default="{ row }">
          <el-tag size="small">{{ PROVIDER_LABELS[row.provider] ?? row.provider }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="model" label="模型" min-width="180" />
      <el-table-column prop="isDefault" label="默认" width="80" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.isDefault" size="small" type="success">默认</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="参数" min-width="200">
        <template #default="{ row }">
          <span :class="$style.paramText">
            T={{ row.parameters?.temperature ?? '-' }}, Max={{ row.parameters?.maxTokens ?? '-' }}, P={{ row.parameters?.topP ?? '-' }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <div :class="$style.actions">
            <el-button type="primary" link size="small" :icon="Link" @click="openTestDialog(row)">测试</el-button>
            <el-button
              v-if="!row.isDefault"
              type="primary"
              link
              size="small"
              :icon="CircleCheckFilled"
              @click="handleSetDefault(row)"
            >
              设为默认
            </el-button>
            <el-button type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="total > pageSize" :class="$style.pagination">
      <el-pagination
        :total="total"
        :page-size="pageSize"
        :current-page="page"
        layout="prev, pager, next"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增模型配置' : '编辑模型配置'"
      width="560px"
      destroy-on-close
    >
      <el-form label-width="100px">
        <el-form-item label="配置名称">
          <el-input v-model="form.name" placeholder="如 DeepSeek Chat 生产环境" />
        </el-form-item>
        <el-form-item label="供应商">
          <el-select v-model="form.provider" style="width: 100%">
            <el-option v-for="(label, key) in PROVIDER_LABELS" :key="key" :label="label" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item label="模型">
          <el-autocomplete
            v-model="form.model"
            :fetch-suggestions="fetchModelSuggestions"
            placeholder="如 deepseek-chat"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="API Key">
          <el-input v-model="form.apiKey" type="password" show-password placeholder="留空表示不需要认证" />
        </el-form-item>
        <el-form-item label="接口地址">
          <el-input v-model="form.baseUrl" placeholder="留空使用默认地址" />
        </el-form-item>
        <el-form-item label="温度">
          <el-slider v-model="form.temperature" :min="0" :max="2" :step="0.1" show-input />
        </el-form-item>
        <el-form-item label="最大令牌数">
          <el-input-number v-model="form.maxTokens" :min="1" :max="128000" :step="256" style="width: 100%" />
        </el-form-item>
        <el-form-item label="采样概率">
          <el-slider v-model="form.topP" :min="0" :max="1" :step="0.05" show-input />
        </el-form-item>
        <el-form-item label="设为默认">
          <el-switch v-model="form.isDefault" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 测试连接对话框 -->
    <el-dialog
      v-model="testDialogVisible"
      title="测试模型连接"
      width="480px"
      destroy-on-close
    >
      <div :class="$style.testBody">
        <el-button
          type="primary"
          :loading="testLoading"
          @click="handleTestConnection"
          :class="$style.testBtn"
        >
          {{ testLoading ? '测试中...' : '发送测试请求' }}
        </el-button>

        <div v-if="testResult" :class="$style.testSuccess">
          <div :class="$style.testLabel">模型回复：</div>
          <div :class="$style.testReply">{{ testResult.reply }}</div>
          <div :class="$style.testMeta">
            <span>模型：{{ testResult.model }}</span>
            <span>Token 消耗：{{ testResult.tokens }}</span>
          </div>
        </div>

        <div v-if="testError" :class="$style.testError">
          {{ testError }}
        </div>
      </div>
      <template #footer>
        <el-button @click="testDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
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

.toolbarLeft {
  display: flex;
  gap: 8px;
  align-items: center;
}

.table {
  border-radius: 8px;
  overflow: hidden;
}

.paramText {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-family: monospace;
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

.testBody {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.testBtn {
  align-self: flex-start;
}

.testSuccess {
  padding: 12px;
  background: var(--el-color-success-light-9);
  border: 1px solid var(--el-color-success-light-5);
  border-radius: 6px;
}

.testLabel {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 8px;
}

.testReply {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

.testMeta {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.testError {
  padding: 12px;
  background: var(--el-color-danger-light-9);
  border: 1px solid var(--el-color-danger-light-5);
  border-radius: 6px;
  color: var(--el-color-danger);
  font-size: 13px;
}
</style>
