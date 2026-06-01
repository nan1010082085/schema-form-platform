<script setup lang="ts">
/**
 * ApiConfig -- API 数据源配置组件（左右分栏）
 *
 * 左侧：分组卡片表单（请求配置 / 数据映射 / 加载策略）
 * 右侧：测试连接面板（独立区域，不跟随表单滚动）
 */
import { ref, computed } from 'vue'
import { Check, WarningFilled, Delete } from '@element-plus/icons-vue'
import { apiClient } from '@/utils/apiClient'
import { inferFieldsFromJson, fieldInferencesToSchema } from '@/utils/jsonToSchema'
import { normalizeListResponse } from '@/utils/responseNormalizer'
import type { SchemaApiConfig, PartialWidget } from '@/components/WidgetRenderer/types'
import styles from './ApiConfig.module.scss'

const props = defineProps<{
  api: SchemaApiConfig | undefined
}>()

const emit = defineEmits<{
  'update:api': [api: SchemaApiConfig | undefined]
  'generate-schema': [schema: PartialWidget[]]
  'remove-config': []
}>()

// ---- Local state for JSON params editing ----
const paramsText = ref(props.api?.params ? JSON.stringify(props.api.params, null, 2) : '')
const paramsError = ref('')

// ---- Local state for body JSON editing ----
const bodyText = ref(props.api?.body ? JSON.stringify(props.api.body, null, 2) : '')
const bodyError = ref('')

// ---- Local state for headers editing ----
interface HeaderRow { key: string; value: string }
const headerRows = ref<HeaderRow[]>(
  props.api?.headers
    ? Object.entries(props.api.headers).map(([key, value]) => ({ key, value }))
    : [{ key: '', value: '' }],
)

// ---- Test connection state ----
const testing = ref(false)
interface TestResult {
  success: boolean
  message: string
  responsePreview?: string
  suggestedDataPath?: string
  parsedOptions?: Array<{ label: string; value: string }>
}
const testResult = ref<TestResult | null>(null)
const rawResponse = ref<unknown>(null)

// ---- Computed ----
const hasApi = computed(() => !!props.api)
const isPost = computed(() => (props.api?.method ?? 'get') === 'post')

// ---- Emit helpers ----
function emitApi(patch: Partial<SchemaApiConfig>) {
  const base: SchemaApiConfig = props.api ?? { url: '' }
  emit('update:api', { ...base, ...patch })
}

function emitApiField<K extends keyof SchemaApiConfig>(field: K, value: SchemaApiConfig[K]) {
  emitApi({ [field]: value })
}

// ---- Enable API ----
function enableApi() {
  emit('update:api', { url: '', method: 'get' })
}

// ---- Params JSON handling ----
function handleParamsChange(text: string) {
  paramsText.value = text
  if (!text.trim()) {
    paramsError.value = ''
    emitApiField('params', undefined)
    return
  }
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    paramsError.value = ''
    emitApiField('params', parsed)
  } catch {
    paramsError.value = '无效的 JSON'
  }
}

// ---- Body JSON handling ----
function handleBodyChange(text: string) {
  bodyText.value = text
  if (!text.trim()) {
    bodyError.value = ''
    emitApiField('body', undefined)
    return
  }
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    bodyError.value = ''
    emitApiField('body', parsed)
  } catch {
    bodyError.value = '无效的 JSON'
  }
}

// ---- Headers handling ----
function addHeaderRow() {
  headerRows.value.push({ key: '', value: '' })
}

function removeHeaderRow(index: number) {
  headerRows.value.splice(index, 1)
  syncHeaders()
}

function handleHeaderKeyChange(index: number, val: string) {
  headerRows.value[index].key = val
  syncHeaders()
}

function handleHeaderValueChange(index: number, val: string) {
  headerRows.value[index].value = val
  syncHeaders()
}

function syncHeaders() {
  const result: Record<string, string> = {}
  for (const row of headerRows.value) {
    const k = row.key.trim()
    if (k) result[k] = row.value
  }
  emitApiField('headers', Object.keys(result).length > 0 ? result : undefined)
}

// ---- Test connection ----
function findArrayPaths(obj: unknown, prefix = ''): string[] {
  if (!obj || typeof obj !== 'object') return []
  const paths: string[] = []
  const keys = ['data', 'list', 'rows', 'items', 'records', 'result'] as const
  for (const key of keys) {
    if (key in (obj as Record<string, unknown>)) {
      const path = prefix ? `${prefix}.${key}` : key
      const val = (obj as Record<string, unknown>)[key]
      if (Array.isArray(val)) {
        paths.push(path)
      } else if (val && typeof val === 'object') {
        paths.push(...findArrayPaths(val, path))
      }
    }
  }
  return paths
}

function formatResponsePreview(res: unknown): string {
  try {
    return JSON.stringify(res, null, 2)
  } catch {
    return String(res)
  }
}

function detectSuggestedDataPath(
  res: unknown,
  currentDataPath: string | undefined,
  extractedData: unknown[],
): string | undefined {
  if (extractedData.length > 0 && currentDataPath) return undefined
  if (!res || typeof res !== 'object' || Array.isArray(res)) return undefined
  const paths = findArrayPaths(res)
  const filtered = currentDataPath ? paths.filter(p => p !== currentDataPath) : paths
  return filtered.length > 0 ? filtered[0] : undefined
}

async function testConnection() {
  if (!props.api?.url) return
  testing.value = true
  testResult.value = null
  rawResponse.value = null
  try {
    const method = props.api.method ?? 'get'
    const res: unknown = await apiClient.requestUrl(
      method,
      props.api.url,
      method === 'post' ? props.api.body : props.api.params,
      props.api.headers,
      props.api.timeout,
    )

    rawResponse.value = res
    const { data: extractedData } = normalizeListResponse(res, { dataPath: props.api.dataPath })

    const parsedOptions = extractedData.slice(0, 5).map(item => ({
      label: String(item[props.api?.labelKey ?? 'label'] ?? ''),
      value: String(item[props.api?.valueKey ?? 'value'] ?? ''),
    }))

    const responsePreview = formatResponsePreview(res)
    const suggestedDataPath = detectSuggestedDataPath(res, props.api.dataPath, extractedData)

    if (extractedData.length === 0) {
      const errorParts = ['未找到数据数组']
      if (suggestedDataPath) {
        errorParts.push(`建议设置数据路径为 "${suggestedDataPath}"`)
      } else if (res && typeof res === 'object' && !Array.isArray(res)) {
        const keys = Object.keys(res as Record<string, unknown>)
        errorParts.push(`响应包含字段: ${keys.join(', ')}`)
      }
      testResult.value = { success: false, message: errorParts.join('。'), responsePreview }
    } else {
      testResult.value = {
        success: true,
        message: `成功: ${extractedData.length} 条数据返回`,
        responsePreview,
        suggestedDataPath,
        parsedOptions,
      }
    }
  } catch (e: unknown) {
    rawResponse.value = null
    testResult.value = { success: false, message: e instanceof Error ? e.message : '请求失败' }
  } finally {
    testing.value = false
  }
}

function applySuggestedDataPath() {
  if (testResult.value?.suggestedDataPath) {
    emitApiField('dataPath', testResult.value.suggestedDataPath)
  }
}

function analyzeAndGenerateSchema() {
  if (!rawResponse.value) return
  const { data: dataSource } = normalizeListResponse(rawResponse.value, { dataPath: props.api?.dataPath })
  const inferences = inferFieldsFromJson(dataSource)
  const schema = fieldInferencesToSchema(inferences)
  emit('generate-schema', schema)
}

defineExpose({ testConnection, testing })
</script>

<template>
  <div :class="styles.root">
    <!-- 未配置时的入口 -->
    <div v-if="!hasApi" :class="styles.toggle">
      <el-button type="primary" plain @click="enableApi">配置 API</el-button>
    </div>

    <!-- 左右分栏 -->
    <div v-else :class="styles.layout">
      <!-- 左侧表单 -->
      <div :class="styles.form">
        <!-- 移除配置 -->
        <div :class="styles.removeRow">
          <el-button type="danger" link size="small" @click="emit('remove-config')">
            移除配置
          </el-button>
        </div>

        <!-- 分组 1：请求配置 -->
        <div :class="styles.card">
          <div :class="styles.cardTitle">请求配置</div>
          <!-- URL -->
          <div :class="styles.row">
            <label :class="styles.label">URL <span :class="styles.required">*</span></label>
            <el-input
              :model-value="api?.url ?? ''"
              placeholder="/api/options"
              style="flex: 1"
              @update:model-value="emitApiField('url', $event)"
            />
          </div>

          <!-- 请求方法 + 超时并排 -->
          <div :class="styles.row">
            <label :class="styles.label">方法</label>
            <el-select
              :model-value="api?.method ?? 'get'"
              style="flex: 1"
              @update:model-value="emitApiField('method', $event as 'get' | 'post')"
            >
              <el-option label="GET" value="get" />
              <el-option label="POST" value="post" />
            </el-select>
            <label :class="styles.label">超时</label>
            <el-input-number
              :model-value="api?.timeout ?? 5000"
              :min="1000"
              :step="1000"
              controls-position="right"
              style="flex: 1"
              @update:model-value="emitApiField('timeout', $event ?? 5000)"
            />
          </div>

          <!-- 查询参数 -->
          <div :class="styles.row">
            <label :class="styles.label">参数</label>
            <div style="flex: 1; display: flex; flex-direction: column; gap: 4px">
              <el-input
                :model-value="paramsText"
                type="textarea"
                :rows="2"
                placeholder='{"key": "value"}'
                :class="{ 'is-error': !!paramsError }"
                @update:model-value="handleParamsChange($event)"
              />
              <div v-if="paramsError" :class="styles.error">{{ paramsError }}</div>
            </div>
          </div>

          <!-- 请求头 Headers -->
          <div :class="styles.row">
            <label :class="styles.label">请求头</label>
            <div :class="styles.kvList" style="flex: 1">
              <div v-for="(row, idx) in headerRows" :key="idx" :class="styles.kvRow">
                <el-input
                  :model-value="row.key"
                  placeholder="Header-Name"
                  @update:model-value="handleHeaderKeyChange(idx, $event)"
                />
                <el-input
                  :model-value="row.value"
                  placeholder="value"
                  @update:model-value="handleHeaderValueChange(idx, $event)"
                />
                <el-button
                  type="danger"
                  :icon="Delete"
                  link
                  @click="removeHeaderRow(idx)"
                />
              </div>
              <el-button size="small" link type="primary" @click="addHeaderRow">
                + 添加
              </el-button>
            </div>
          </div>

          <!-- 请求体 Body（仅 POST） -->
          <div v-if="isPost" :class="styles.row">
            <label :class="styles.label">Body</label>
            <div style="flex: 1; display: flex; flex-direction: column; gap: 4px">
              <el-input
                :model-value="bodyText"
                type="textarea"
                :rows="3"
                placeholder='{"key": "value"}'
                :class="{ 'is-error': !!bodyError }"
                @update:model-value="handleBodyChange($event)"
              />
              <div v-if="bodyError" :class="styles.error">{{ bodyError }}</div>
            </div>
          </div>
        </div>

        <!-- 分组 2：数据映射 -->
        <div :class="styles.card">
          <div :class="styles.cardTitle">数据映射</div>
          <div :class="styles.row">
            <label :class="styles.label">路径</label>
            <el-input
              :model-value="api?.dataPath ?? ''"
              placeholder="result.records"
              style="flex: 1"
              @update:model-value="emitApiField('dataPath', $event || undefined)"
            />
          </div>
          <div :class="styles.row">
            <label :class="styles.label">标签</label>
            <el-input
              :model-value="api?.labelKey ?? 'label'"
              placeholder="label"
              style="flex: 1"
              @update:model-value="emitApiField('labelKey', $event)"
            />
            <label :class="styles.label">值</label>
            <el-input
              :model-value="api?.valueKey ?? 'value'"
              placeholder="value"
              style="flex: 1"
              @update:model-value="emitApiField('valueKey', $event)"
            />
            <label :class="styles.label">子节点</label>
            <el-input
              :model-value="api?.childrenKey ?? ''"
              placeholder="children"
              style="flex: 1"
              @update:model-value="emitApiField('childrenKey', $event || undefined)"
            />
          </div>
        </div>

        <!-- 分组 3：加载策略 -->
        <div :class="styles.card">
          <div :class="styles.cardTitle">加载策略</div>
          <div :class="styles.row">
            <label :class="styles.label">加载</label>
            <el-switch
              :model-value="api?.immediate !== false"
              @update:model-value="emitApiField('immediate', $event)"
            />
            <label :class="styles.label">缓存</label>
            <el-input-number
              :model-value="api?.ttl ?? 0"
              :min="0"
              :step="1000"
              controls-position="right"
              style="flex: 1"
              @update:model-value="emitApiField('ttl', $event ?? 0)"
            />
          </div>
          <div :class="styles.row">
            <label :class="styles.label">重试</label>
            <div style="display: flex; align-items: center; gap: 8px; flex: 1">
              <el-switch
                :model-value="api?.enableRetry ?? false"
                @update:model-value="emitApiField('enableRetry', $event)"
              />
              <el-input-number
                v-if="api?.enableRetry"
                :model-value="api?.retryCount ?? 3"
                :min="1"
                :max="5"
                controls-position="right"
                style="width: 100px"
                @update:model-value="emitApiField('retryCount', $event ?? 3)"
              />
            </div>
            <label :class="styles.label">策略</label>
            <el-select
              :model-value="api?.cacheLevel ?? 'memory'"
              style="flex: 1"
              @update:model-value="emitApiField('cacheLevel', $event as 'memory' | 'indexeddb' | 'both')"
            >
              <el-option label="内存" value="memory" />
              <el-option label="IndexedDB" value="indexeddb" />
              <el-option label="两者" value="both" />
            </el-select>
          </div>
        </div>

      </div>

      <!-- 右侧测试面板 -->
      <div :class="styles.test">
        <div :class="styles.testTitle">测试连接</div>
        <div :class="styles.testBody">
          <el-button
            type="primary"
            :loading="testing"
            style="width: 100%"
            @click="testConnection"
          >
            {{ testing ? '测试中...' : '测试连接' }}
          </el-button>

          <!-- 成功结果 -->
          <template v-if="testResult?.success">
            <div :class="styles.testSuccess">
              <el-icon><Check /></el-icon>
              <span>{{ testResult.message }}</span>
            </div>

            <!-- 响应结构预览 -->
            <div v-if="testResult.responsePreview" :class="styles.previewSection">
              <div :class="styles.previewLabel">响应结构</div>
              <pre :class="styles.previewCode">{{ testResult.responsePreview }}</pre>
            </div>

            <!-- 解析预览 -->
            <div v-if="testResult.parsedOptions && testResult.parsedOptions.length > 0" :class="styles.previewSection">
              <div :class="styles.previewLabel">解析预览 (前 5 项)</div>
              <div :class="styles.optionsList">
                <div v-for="(opt, idx) in testResult.parsedOptions" :key="idx" :class="styles.optionItem">
                  <span :class="styles.optionLabel">{{ opt.label }}</span>
                  <span :class="styles.optionValue">{{ opt.value }}</span>
                </div>
              </div>
            </div>

            <!-- 建议数据路径 -->
            <div v-if="testResult.suggestedDataPath" :class="styles.suggestion">
              <span>建议路径: <code>{{ testResult.suggestedDataPath }}</code></span>
              <el-button size="small" type="primary" link @click="applySuggestedDataPath">
                应用
              </el-button>
            </div>

            <!-- 分析按钮 -->
            <el-button type="success" plain style="width: 100%; margin-top: 8px" @click="analyzeAndGenerateSchema">
              分析并生成 Schema
            </el-button>
          </template>

          <!-- 失败结果 -->
          <template v-else-if="testResult">
            <div :class="styles.testError">
              <el-icon><WarningFilled /></el-icon>
              <span>{{ testResult.message }}</span>
            </div>

            <div v-if="testResult.responsePreview" :class="styles.previewSection">
              <div :class="styles.previewLabel">响应内容</div>
              <pre :class="[styles.previewCode, styles.previewCodeError]">{{ testResult.responsePreview }}</pre>
            </div>

            <div v-if="testResult.suggestedDataPath" :class="styles.suggestionError">
              <span>建议路径: <code>{{ testResult.suggestedDataPath }}</code></span>
              <el-button size="small" type="primary" link @click="applySuggestedDataPath">
                应用
              </el-button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
