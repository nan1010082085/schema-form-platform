<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { apiClient } from '@/utils/apiClient'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import { AddIcon, SearchIcon, LinkIcon, CheckCircleFilledIcon } from 'tdesign-icons-vue-next'

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
    MessagePlugin.warning('请输入配置名称')
    return
  }
  if (!form.value.model.trim()) {
    MessagePlugin.warning('请输入模型名称')
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
    MessagePlugin.success('模型配置创建成功')
  } else {
    await apiClient.put(`/model-configs/${editingId.value}`, body)
    MessagePlugin.success('模型配置更新成功')
  }
  dialogVisible.value = false
  fetchConfigs()
}

async function handleDelete(config: ModelConfig) {
  const confirmDia = DialogPlugin.confirm({
    header: '删除确认',
    body: `确认删除模型配置「${config.name}」（${PROVIDER_LABELS[config.provider]} / ${config.model}）？`,
    confirmBtn: '删除',
    cancelBtn: '取消',
    onConfirm: async () => {
      await apiClient.delete(`/model-configs/${config.id}`)
      MessagePlugin.success('模型配置已删除')
      fetchConfigs()
      confirmDia.destroy()
    },
    onClose: () => {
      confirmDia.destroy()
    },
  })
}

async function handleSetDefault(config: ModelConfig) {
  await apiClient.put(`/model-configs/${config.id}`, { isDefault: true })
  MessagePlugin.success(`已将「${config.name}」设为 ${PROVIDER_LABELS[config.provider]} 默认模型`)
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
        <t-input
          v-model="searchQuery"
          placeholder="搜索配置名称"
          :prefix-icon="SearchIcon"
          clearable
          :style="{ width: '240px' }"
        />
        <t-select v-model="providerFilter" placeholder="Provider" clearable :style="{ width: '140px' }">
          <t-option v-for="(label, key) in PROVIDER_LABELS" :key="key" :label="label" :value="key" />
        </t-select>
      </div>
      <t-button theme="primary" :icon="AddIcon" @click="openCreate">新增配置</t-button>
    </div>

    <t-table :data="configs" :loading="loading" :class="$style.table">
      <t-col prop="name" label="配置名称" :min-width="160" />
      <t-col label="Provider" :width="120" align="center">
        <template #cell="{ row }">
          <t-tag size="small" theme="default">
            {{ PROVIDER_LABELS[row.provider] ?? row.provider }}
          </t-tag>
        </template>
      </t-col>
      <t-col prop="model" label="模型" :min-width="180" />
      <t-col label="默认" :width="80" align="center">
        <template #cell="{ row }">
          <t-tag v-if="row.isDefault" size="small" theme="success">默认</t-tag>
        </template>
      </t-col>
      <t-col label="参数" :min-width="200">
        <template #cell="{ row }">
          <span :class="$style.paramText">
            T={{ row.parameters?.temperature ?? '-' }}, Max={{ row.parameters?.maxTokens ?? '-' }}, P={{ row.parameters?.topP ?? '-' }}
          </span>
        </template>
      </t-col>
      <t-col label="操作" :width="260" fixed="right">
        <template #cell="{ row }">
          <div :class="$style.actions">
            <t-button variant="text" size="small" :icon="LinkIcon" @click="openTestDialog(row)">测试</t-button>
            <t-button
              v-if="!row.isDefault"
              variant="text"
              size="small"
              :icon="CheckCircleFilledIcon"
              @click="handleSetDefault(row)"
            >
              设为默认
            </t-button>
            <t-button variant="text" size="small" @click="openEdit(row)">编辑</t-button>
            <t-button variant="text" size="small" theme="danger" @click="handleDelete(row)">删除</t-button>
          </div>
        </template>
      </t-col>
    </t-table>

    <div v-if="total > pageSize" :class="$style.pagination">
      <t-pagination
        :total="total"
        :page-size="pageSize"
        :current="page"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 创建/编辑对话框 -->
    <t-dialog
      v-model:visible="dialogVisible"
      :header="dialogMode === 'create' ? '新增模型配置' : '编辑模型配置'"
      width="560px"
      destroy-on-close
    >
      <t-form label-width="100px">
        <t-form-item label="配置名称">
          <t-input v-model="form.name" placeholder="如 DeepSeek Chat 生产环境" />
        </t-form-item>
        <t-form-item label="Provider">
          <t-select v-model="form.provider" :style="{ width: '100%' }">
            <t-option v-for="(label, key) in PROVIDER_LABELS" :key="key" :label="label" :value="key" />
          </t-select>
        </t-form-item>
        <t-form-item label="模型">
          <t-auto-complete
            v-model="form.model"
            :options="modelSuggestions.map(m => ({ value: m }))"
            placeholder="如 deepseek-chat"
            :style="{ width: '100%' }"
          />
        </t-form-item>
        <t-form-item label="API Key">
          <t-input v-model="form.apiKey" type="password" placeholder="留空表示不需要认证" />
        </t-form-item>
        <t-form-item label="Base URL">
          <t-input v-model="form.baseUrl" placeholder="留空使用默认地址" />
        </t-form-item>
        <t-form-item label="Temperature">
          <t-slider v-model="form.temperature" :min="0" :max="2" :step="0.1" :show-input="true" />
        </t-form-item>
        <t-form-item label="Max Tokens">
          <t-input-number v-model="form.maxTokens" :min="1" :max="128000" :step="256" :style="{ width: '100%' }" />
        </t-form-item>
        <t-form-item label="Top P">
          <t-slider v-model="form.topP" :min="0" :max="1" :step="0.05" :show-input="true" />
        </t-form-item>
        <t-form-item label="设为默认">
          <t-switch v-model="form.isDefault" />
        </t-form-item>
      </t-form>
      <template #footer>
        <t-button @click="dialogVisible = false">取消</t-button>
        <t-button theme="primary" @click="handleSubmit">确定</t-button>
      </template>
    </t-dialog>

    <!-- 测试连接对话框 -->
    <t-dialog
      v-model:visible="testDialogVisible"
      header="测试模型连接"
      width="480px"
      destroy-on-close
    >
      <div :class="$style.testBody">
        <t-button
          theme="primary"
          :loading="testLoading"
          @click="handleTestConnection"
          :class="$style.testBtn"
        >
          {{ testLoading ? '测试中...' : '发送测试请求' }}
        </t-button>

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
        <t-button @click="testDialogVisible = false">关闭</t-button>
      </template>
    </t-dialog>
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
  color: var(--td-text-color-secondary);
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
  background: var(--td-success-color-1);
  border: 1px solid var(--td-success-color-3);
  border-radius: 6px;
}

.testLabel {
  font-size: 13px;
  font-weight: 500;
  color: var(--td-text-color-primary);
  margin-bottom: 8px;
}

.testReply {
  font-size: 14px;
  color: var(--td-text-color-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

.testMeta {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}

.testError {
  padding: 12px;
  background: var(--td-error-color-1);
  border: 1px solid var(--td-error-color-3);
  border-radius: 6px;
  color: var(--td-error-color);
  font-size: 13px;
}
</style>
