<script setup lang="ts">
/**
 * ApiConfig -- API configuration UI for dynamic options.
 *
 * Supports two data-source modes:
 * 1. dictCode: lookup from global dictMap
 * 2. URL: HTTP request with params, label/value key mapping
 *
 * Includes a "Test Connection" button that sends a real HTTP request
 * and displays the result count or error.
 *
 * After successful test connection, an "Analyze & Generate Schema" button
 * appears that infers PartialWidget[] from the response data.
 */
import { ref, computed } from 'vue'
import { Connection, Check, WarningFilled } from '@element-plus/icons-vue'
import { apiClient } from '@/utils/apiClient'
import { inferFieldsFromJson, fieldInferencesToSchema } from '@/utils/jsonToSchema'
import { normalizeListResponse } from '@/utils/responseNormalizer'
import type { SchemaApiConfig, PartialWidget } from '@/components/WidgetRenderer/types'

const props = defineProps<{
  api: SchemaApiConfig | undefined
}>()

const emit = defineEmits<{
  'update:api': [api: SchemaApiConfig | undefined]
  'generate-schema': [schema: PartialWidget[]]
}>()

// ---- Data source mode ----
type DataSourceMode = 'dict' | 'url'
const sourceMode = ref<DataSourceMode>(props.api?.dictCode ? 'dict' : 'url')

// ---- Local state for JSON params editing ----
const paramsText = ref(props.api?.params ? JSON.stringify(props.api.params, null, 2) : '')
const paramsError = ref('')

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
/** Raw response data from the last successful test connection, stored for analysis */
const rawResponse = ref<unknown>(null)

// ---- Computed ----
const hasApi = computed(() => !!props.api)

// ---- Emit helpers ----
function emitApi(patch: Partial<SchemaApiConfig>) {
  const base: SchemaApiConfig = props.api ?? { url: '' }
  emit('update:api', { ...base, ...patch })
}

function emitApiField<K extends keyof SchemaApiConfig>(field: K, value: SchemaApiConfig[K]) {
  emitApi({ [field]: value })
}

function clearApi() {
  emit('update:api', undefined)
}

// ---- Mode switching ----
function switchMode(mode: DataSourceMode) {
  sourceMode.value = mode
  if (mode === 'dict') {
    emit('update:api', { url: '', dictCode: props.api?.dictCode ?? '' })
  } else {
    emit('update:api', { url: props.api?.url ?? '', method: 'get' })
  }
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

// ---- Test connection ----
/** Recursively find all dot-paths leading to arrays in an object */
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

/** Format raw response as truncated JSON preview (first 200 chars) */
function formatResponsePreview(res: unknown): string {
  try {
    const str = JSON.stringify(res, null, 2)
    return str.length > 200 ? str.slice(0, 200) + '...' : str
  } catch {
    return String(res).slice(0, 200)
  }
}

/** Detect common wrapper keys and suggest dataPath if needed */
function detectSuggestedDataPath(
  res: unknown,
  currentDataPath: string | undefined,
  extractedData: unknown[],
): string | undefined {
  if (extractedData.length > 0 && currentDataPath) return undefined

  if (!res || typeof res !== 'object' || Array.isArray(res)) return undefined

  const paths = findArrayPaths(res)
  // Filter out paths that match current dataPath
  const filtered = currentDataPath
    ? paths.filter(p => p !== currentDataPath)
    : paths

  return filtered.length > 0 ? filtered[0] : undefined
}

async function testConnection() {
  if (!props.api?.url) return

  testing.value = true
  testResult.value = null
  rawResponse.value = null
  try {
    const method = props.api.method ?? 'get'
    const res: unknown = await apiClient.requestUrl(method, props.api.url, props.api.params)

    rawResponse.value = res

    const { data: extractedData } = normalizeListResponse(res, { dataPath: props.api.dataPath })

    // Parse first 5 items for preview
    const parsedOptions = extractedData.slice(0, 5).map(item => ({
      label: String(item[props.api?.labelKey ?? 'label'] ?? ''),
      value: String(item[props.api?.valueKey ?? 'value'] ?? ''),
    }))

    const responsePreview = formatResponsePreview(res)

    // Detect common wrapper keys for auto-suggest
    const suggestedDataPath = detectSuggestedDataPath(res, props.api.dataPath, extractedData)

    if (extractedData.length === 0) {
      // Data extraction failed — provide structured error
      const errorParts = ['未找到数据数组']
      if (suggestedDataPath) {
        errorParts.push(`建议设置数据路径为 "${suggestedDataPath}"`)
      } else if (res && typeof res === 'object' && !Array.isArray(res)) {
        const keys = Object.keys(res as Record<string, unknown>)
        errorParts.push(`响应包含字段: ${keys.join(', ')}`)
      }
      testResult.value = {
        success: false,
        message: errorParts.join('。'),
        responsePreview,
      }
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

/** Apply suggested dataPath to the config */
function applySuggestedDataPath() {
  if (testResult.value?.suggestedDataPath) {
    emitApiField('dataPath', testResult.value.suggestedDataPath)
  }
}

// ---- Analyze response and generate schema ----
function analyzeAndGenerateSchema() {
  if (!rawResponse.value) return
  const { data: dataSource } = normalizeListResponse(rawResponse.value, { dataPath: props.api?.dataPath })
  const inferences = inferFieldsFromJson(dataSource)
  const schema = fieldInferencesToSchema(inferences)
  emit('generate-schema', schema)
}

defineExpose({ testConnection })
</script>

<template>
  <div class="api-config">
    <!-- Toggle: enable API -->
    <div v-if="!hasApi" class="api-config__toggle">
      <el-button size="small" type="primary" plain @click="switchMode('url')">
        配置 API
      </el-button>
    </div>

    <template v-else>
      <!-- Data source mode switch -->
      <div class="api-config__field">
        <label class="api-config__label">数据源</label>
        <el-radio-group :model-value="sourceMode" size="small" @update:model-value="switchMode($event as DataSourceMode)">
          <el-radio-button value="dict">字典编码</el-radio-button>
          <el-radio-button value="url">URL</el-radio-button>
        </el-radio-group>
      </div>

      <!-- Dict Code mode -->
      <div v-if="sourceMode === 'dict'" class="api-config__field">
        <label class="api-config__label">字典编码</label>
        <el-input
          :model-value="api?.dictCode ?? ''"
          size="small"
          placeholder="例如: gender_list"
          @update:model-value="emitApiField('dictCode', $event)"
        />
      </div>

      <!-- URL mode -->
      <template v-if="sourceMode === 'url'">
        <div class="api-config__field">
          <label class="api-config__label">URL</label>
          <el-input
            :model-value="api?.url ?? ''"
            size="small"
            placeholder="/api/options"
            @update:model-value="emitApiField('url', $event)"
          />
        </div>

        <div class="api-config__field">
          <label class="api-config__label">请求方法</label>
          <el-select
            :model-value="api?.method ?? 'get'"
            size="small"
            style="width: 100%"
            @update:model-value="emitApiField('method', $event as 'get' | 'post')"
          >
            <el-option label="GET" value="get" />
            <el-option label="POST" value="post" />
          </el-select>
        </div>

        <div class="api-config__field">
          <label class="api-config__label">参数 (JSON)</label>
          <el-input
            :model-value="paramsText"
            type="textarea"
            :rows="2"
            size="small"
            placeholder='{"key": "value"}'
            :class="{ 'is-error': !!paramsError }"
            @update:model-value="handleParamsChange($event)"
          />
          <div v-if="paramsError" class="api-config__error">{{ paramsError }}</div>
        </div>

        <div class="api-config__field">
          <label class="api-config__label">数据路径</label>
          <el-input
            :model-value="api?.dataPath ?? ''"
            size="small"
            placeholder="data (点号分隔 例如: result.records)"
            @update:model-value="emitApiField('dataPath', $event || undefined)"
          />
        </div>

        <div class="api-config__field api-config__field--row">
          <div style="flex: 1">
            <label class="api-config__label">标签字段</label>
            <el-input
              :model-value="api?.labelKey ?? 'label'"
              size="small"
              placeholder="label"
              @update:model-value="emitApiField('labelKey', $event)"
            />
          </div>
          <div style="flex: 1">
            <label class="api-config__label">值字段</label>
            <el-input
              :model-value="api?.valueKey ?? 'value'"
              size="small"
              placeholder="value"
              @update:model-value="emitApiField('valueKey', $event)"
            />
          </div>
        </div>

        <div class="api-config__field">
          <label class="api-config__label">子节点字段 (树形数据)</label>
          <el-input
            :model-value="api?.childrenKey ?? ''"
            size="small"
            placeholder="children"
            @update:model-value="emitApiField('childrenKey', $event)"
          />
        </div>

        <div class="api-config__field">
          <label class="api-config__label">立即加载</label>
          <el-switch
            :model-value="api?.immediate !== false"
            @update:model-value="emitApiField('immediate', $event)"
          />
        </div>

        <div class="api-config__field">
          <label class="api-config__label">缓存时间 (毫秒, 0 = 不过期)</label>
          <el-input
            :model-value="String(api?.ttl ?? 0)"
            size="small"
            placeholder="0"
            @update:model-value="emitApiField('ttl', Number($event) || 0)"
          />
        </div>

        <!-- Test Connection -->
        <el-button
          size="small"
          :icon="Connection"
          :loading="testing"
          style="width: 100%"
          @click="testConnection"
        >
          测试连接
        </el-button>

        <!-- Test Result: Success -->
        <div v-if="testResult?.success" class="api-config__test-result api-config__test-result--success">
          <div class="api-config__test-header">
            <el-icon><Check /></el-icon>
            <span>{{ testResult.message }}</span>
            <el-button
              size="small"
              type="success"
              plain
              @click="analyzeAndGenerateSchema"
            >
              分析并生成 Schema
            </el-button>
          </div>

          <!-- Response preview -->
          <div v-if="testResult.responsePreview" class="api-config__preview">
            <div class="api-config__preview-label">响应结构 (前 200 字符)</div>
            <pre class="api-config__preview-code">{{ testResult.responsePreview }}</pre>
          </div>

          <!-- Suggested dataPath -->
          <div v-if="testResult.suggestedDataPath" class="api-config__suggestion">
            <span>检测到数据路径: <code>{{ testResult.suggestedDataPath }}</code></span>
            <el-button size="small" type="primary" link @click="applySuggestedDataPath">
              应用
            </el-button>
          </div>

          <!-- Parsed options preview -->
          <div v-if="testResult.parsedOptions && testResult.parsedOptions.length > 0" class="api-config__preview">
            <div class="api-config__preview-label">解析预览 (前 5 项)</div>
            <div class="api-config__options-list">
              <div v-for="(opt, idx) in testResult.parsedOptions" :key="idx" class="api-config__option-item">
                <span class="api-config__option-label">{{ opt.label }}</span>
                <span class="api-config__option-value">{{ opt.value }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Test Result: Error -->
        <div v-else-if="testResult" class="api-config__test-result api-config__test-result--error">
          <div class="api-config__test-header">
            <el-icon><WarningFilled /></el-icon>
            <span>{{ testResult.message }}</span>
          </div>

          <!-- Response preview on error too -->
          <div v-if="testResult.responsePreview" class="api-config__preview">
            <div class="api-config__preview-label">响应内容 (前 200 字符)</div>
            <pre class="api-config__preview-code api-config__preview-code--error">{{ testResult.responsePreview }}</pre>
          </div>

          <!-- Suggested dataPath on error -->
          <div v-if="testResult.suggestedDataPath" class="api-config__suggestion api-config__suggestion--error">
            <span>检测到数据路径: <code>{{ testResult.suggestedDataPath }}</code></span>
            <el-button size="small" type="primary" link @click="applySuggestedDataPath">
              应用
            </el-button>
          </div>
        </div>
      </template>

      <!-- Remove API config -->
      <el-button
        size="small"
        type="danger"
        plain
        style="width: 100%; margin-top: 8px"
        @click="clearApi"
      >
        移除 API 配置
      </el-button>
    </template>
  </div>
</template>

<style scoped lang="scss">
.api-config {
  &__toggle {
    text-align: center;
    padding: 8px 0;
  }

  &__field {
    margin-bottom: 10px;

    &:last-of-type {
      margin-bottom: 0;
    }

    &--row {
      display: flex;
      gap: 8px;
    }
  }

  &__label {
    display: block;
    font-size: 11px;
    font-weight: 500;
    color: #606266;
    margin-bottom: 3px;
  }

  &__error {
    font-size: 11px;
    color: #f56c6c;
    margin-top: 3px;
  }

  &__test-result {
    font-size: 12px;
    margin-top: 6px;
    padding: 8px 10px;
    border-radius: 4px;
    line-height: 1.5;

    &--success {
      color: #67c23a;
      background: #f0f9eb;
      border: 1px solid #e1f3d8;
    }

    &--error {
      color: #f56c6c;
      background: #fef0f0;
      border: 1px solid #fde2e2;
    }
  }

  &__test-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 500;

    .el-button {
      margin-left: auto;
    }
  }

  &__preview {
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
  }

  &__preview-label {
    font-size: 11px;
    color: #909399;
    margin-bottom: 4px;
  }

  &__preview-code {
    font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
    font-size: 11px;
    line-height: 1.4;
    background: rgba(0, 0, 0, 0.03);
    border: 1px solid rgba(0, 0, 0, 0.06);
    border-radius: 3px;
    padding: 6px 8px;
    margin: 0;
    overflow-x: auto;
    white-space: pre;
    max-height: 120px;
    overflow-y: auto;
    color: #303133;

    &--error {
      color: #909399;
    }
  }

  &__suggestion {
    margin-top: 6px;
    padding: 4px 8px;
    background: rgba(64, 158, 255, 0.06);
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
    color: #409eff;

    code {
      font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
      background: rgba(64, 158, 255, 0.1);
      padding: 1px 4px;
      border-radius: 2px;
    }

    &--error {
      background: rgba(245, 108, 108, 0.06);
      color: #f56c6c;

      code {
        background: rgba(245, 108, 108, 0.1);
      }
    }
  }

  &__options-list {
    margin-top: 4px;
  }

  &__option-item {
    display: flex;
    justify-content: space-between;
    padding: 2px 0;
    font-size: 11px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.04);

    &:last-child {
      border-bottom: none;
    }
  }

  &__option-label {
    color: #303133;
    font-weight: 500;
  }

  &__option-value {
    color: #909399;
    font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
    font-size: 10px;
  }

  .is-error :deep(.el-textarea__inner) {
    border-color: #f56c6c;
  }
}
</style>
