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
 * appears that infers FormSchemaItem[] from the response data.
 */
import { ref, computed } from 'vue'
import { Connection } from '@element-plus/icons-vue'
import { getRequestInstance } from '@/utils/request'
import { inferFieldsFromJson, fieldInferencesToSchema } from '@/utils/jsonToSchema'
import { normalizeListResponse } from '@/utils/responseNormalizer'
import type { SchemaApiConfig, FormSchemaItem } from '@/components/FormGrid/types'

const props = defineProps<{
  api: SchemaApiConfig | undefined
}>()

const emit = defineEmits<{
  'update:api': [api: SchemaApiConfig | undefined]
  'generate-schema': [schema: FormSchemaItem[]]
}>()

// ---- Data source mode ----
type DataSourceMode = 'dict' | 'url'
const sourceMode = ref<DataSourceMode>(props.api?.dictCode ? 'dict' : 'url')

// ---- Local state for JSON params editing ----
const paramsText = ref(props.api?.params ? JSON.stringify(props.api.params, null, 2) : '')
const paramsError = ref('')

// ---- Test connection state ----
const testing = ref(false)
const testResult = ref<{ success: boolean; message: string } | null>(null)
/** Raw response data from the last successful test connection, stored for analysis */
const rawResponse = ref<unknown>(null)

// ---- Computed ----
const hasApi = computed(() => !!props.api)

/** Whether the analyze/generate button should be shown */
const showAnalyze = computed(() => testResult.value?.success === true && rawResponse.value !== null)

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
async function testConnection() {
  if (!props.api?.url) return

  testing.value = true
  testResult.value = null
  rawResponse.value = null
  try {
    const http = getRequestInstance()
    const method = props.api.method ?? 'get'
    const res: unknown = method === 'get'
      ? await http.get(props.api.url, { params: props.api.params })
      : await http.post(props.api.url, props.api.params)

    // Store raw response for analysis
    rawResponse.value = res

    const { data } = normalizeListResponse(res, { dataPath: props.api.dataPath })
    testResult.value = { success: true, message: `成功: ${data.length} 条数据返回` }
  } catch (e: unknown) {
    rawResponse.value = null
    testResult.value = { success: false, message: e instanceof Error ? e.message : '请求失败' }
  } finally {
    testing.value = false
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
        <div
          v-if="testResult"
          class="api-config__test-result"
          :class="testResult.success ? 'api-config__test-result--success' : 'api-config__test-result--error'"
        >
          <span>{{ testResult.message }}</span>
          <el-button
            v-if="showAnalyze"
            size="small"
            type="success"
            plain
            style="margin-left: 8px"
            @click="analyzeAndGenerateSchema"
          >
            分析并生成 Schema
          </el-button>
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
    padding: 6px 8px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: space-between;

    &--success {
      color: #67c23a;
      background: #f0f9eb;
    }

    &--error {
      color: #f56c6c;
      background: #fef0f0;
    }
  }

  .is-error :deep(.el-textarea__inner) {
    border-color: #f56c6c;
  }
}
</style>
