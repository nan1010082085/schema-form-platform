<script setup lang="ts">
/**
 * JsonImporter -- Dialog for importing a JSON response and inferring schema.
 *
 * Flow: paste JSON (or fetch from URL) -> parse -> preview inferences -> override types -> generate schema.
 */
import { ref } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { apiClient } from '@/utils/apiClient'
import {
  inferFieldsFromJson,
  fieldInferencesToSchema,
  type FieldInference,
} from '@/utils/jsonToSchema'
import type { PartialWidget, SchemaType } from '@/components/WidgetRenderer/types'

const emit = defineEmits<{
  'import': [schema: PartialWidget[]]
}>()

const visible = ref(false)
const jsonText = ref('')
const parseError = ref('')
const inferences = ref<FieldInference[]>([])
const step = ref<'input' | 'preview'>('input')

/** URL fetching state */
const fetchUrl = ref('')
const fetching = ref(false)
const fetchError = ref('')
const inputMode = ref<'paste' | 'url'>('paste')

/** SchemaType options for override dropdown */
const schemaTypeOptions: { label: string; value: SchemaType }[] = [
  { label: '输入框', value: 'input' },
  { label: '数字', value: 'number' },
  { label: '下拉选择', value: 'select' },
  { label: '单选', value: 'radio' },
  { label: '复选框', value: 'checkbox' },
  { label: '日期', value: 'date' },
  { label: '文本域', value: 'textarea' },
  { label: '富文本', value: 'richtext' },
  { label: '上传', value: 'upload' },
  { label: '表格', value: 'table' },
  { label: '穿梭框', value: 'transfer' },
  { label: '卡片 (嵌套)', value: 'card' },
]

function open() {
  jsonText.value = ''
  fetchUrl.value = ''
  parseError.value = ''
  fetchError.value = ''
  inferences.value = []
  step.value = 'input'
  inputMode.value = 'paste'
  visible.value = true
}

function handleParse() {
  parseError.value = ''
  inferences.value = []

  if (!jsonText.value.trim()) {
    parseError.value = '请粘贴 JSON 响应。'
    return
  }

  try {
    const parsed = JSON.parse(jsonText.value) as unknown
    const result = inferFieldsFromJson(parsed)
    if (result.length === 0) {
      parseError.value = '无法从此 JSON 推断任何字段。请确保它包含带有属性的对象。'
      return
    }
    inferences.value = result
    step.value = 'preview'
  } catch {
    parseError.value = '无效的 JSON 格式。'
  }
}

/** Extract data array from wrapped API response before inferring */
function extractDataArray(res: unknown): unknown {
  if (Array.isArray(res)) return res
  if (res && typeof res === 'object') {
    const obj = res as Record<string, unknown>
    const list = obj.data ?? obj.list ?? obj.rows ?? obj.items
    if (Array.isArray(list)) return list
  }
  return res
}

/** Fetch JSON from URL and infer fields */
async function handleFetchFromUrl() {
  if (!fetchUrl.value.trim()) return

  fetching.value = true
  fetchError.value = ''
  try {
    const res: unknown = await apiClient.requestUrl('get', fetchUrl.value)

    // Extract data array from wrapped response
    const dataSource = extractDataArray(res)

    // Store as formatted JSON for display
    jsonText.value = JSON.stringify(dataSource, null, 2)

    const result = inferFieldsFromJson(dataSource)
    if (result.length === 0) {
      fetchError.value = '无法从响应中推断任何字段。请确保它返回带有属性的对象或数组。'
      return
    }
    inferences.value = result
    step.value = 'preview'
    MessagePlugin.success(`获取并分析了 ${result.length} 个字段`)
  } catch (e: unknown) {
    fetchError.value = e instanceof Error ? e.message : '请求失败'
  } finally {
    fetching.value = false
  }
}

function handleOverrideType(index: number, type: SchemaType) {
  inferences.value = inferences.value.map((item, i) =>
    i === index ? { ...item, type } : item,
  )
}

function handleGenerate() {
  const schema = fieldInferencesToSchema(inferences.value)
  emit('import', schema)
  visible.value = false
  MessagePlugin.success(`生成了 ${schema.length} 个 schema 项`)
}

function handleBack() {
  step.value = 'input'
}

defineExpose({ open })
</script>

<template>
  <t-dialog
    v-model:visible="visible"
    header="从 JSON 导入"
    width="700px"
    :close-on-overlay="false"
    @close="visible = false"
  >
    <!-- Step 1: Paste JSON or Fetch from URL -->
    <div v-if="step === 'input'" class="json-importer__input">
      <!-- Input mode tabs -->
      <div class="json-importer__mode-tabs">
        <button
          class="json-importer__mode-tab"
          :class="{ 'json-importer__mode-tab--active': inputMode === 'paste' }"
          @click="inputMode = 'paste'"
        >
          粘贴 JSON
        </button>
        <button
          class="json-importer__mode-tab"
          :class="{ 'json-importer__mode-tab--active': inputMode === 'url' }"
          @click="inputMode = 'url'"
        >
          从 URL 获取
        </button>
      </div>

      <!-- Paste mode -->
      <template v-if="inputMode === 'paste'">
        <t-textarea
          v-model:value="jsonText"
          :rows="14"
          placeholder='在此粘贴 API 响应 JSON, 例如:
{
  "user_name": "John",
  "age": 30,
  "is_active": true,
  "created_at": "2024-01-15T10:30:00"
}'
        />
        <div v-if="parseError" class="json-importer__error">{{ parseError }}</div>
      </template>

      <!-- URL fetch mode -->
      <template v-else>
        <div class="json-importer__url-section">
          <div class="json-importer__url-row">
            <t-input
              v-model:value="fetchUrl"
              size="small"
              placeholder="/api/list 或 https://example.com/api/data"
              @keyup.enter="handleFetchFromUrl"
            />
            <t-button
              theme="primary"
              size="small"
              :loading="fetching"
              @click="handleFetchFromUrl"
            >
              获取
            </t-button>
          </div>
          <div v-if="fetchError" class="json-importer__error">{{ fetchError }}</div>
          <div v-if="jsonText" class="json-importer__fetched-preview">
            <label class="json-importer__label">获取的响应:</label>
            <t-textarea
              :model-value="jsonText"
              :rows="8"
              readonly
              size="small"
            />
          </div>
        </div>
      </template>
    </div>

    <!-- Step 2: Preview & Override -->
    <div v-else class="json-importer__preview">
      <p class="json-importer__summary">
        {{ inferences.length }} 个字段被检测到。如需要可覆盖推断的类型。
      </p>
      <t-table :data="inferences" bordered size="small" max-height="400">
        <t-table-column col-key="field" title="字段名" min-width="140" />
        <t-table-column col-key="label" title="标签" min-width="120" />
        <t-table-column title="类型" width="160">
          <template #cell="{ row, rowIndex }">
            <t-select
              :model-value="row.type"
              size="small"
              style="width: 100%"
              @update:model-value="handleOverrideType(rowIndex, $event as SchemaType)"
            >
              <t-option
                v-for="opt in schemaTypeOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </t-select>
          </template>
        </t-table-column>
        <t-table-column title="示例值" min-width="160">
          <template #cell="{ row }">
            <span class="json-importer__sample">
              {{ typeof row.sample === 'object' ? JSON.stringify(row.sample) : String(row.sample ?? '') }}
            </span>
          </template>
        </t-table-column>
      </t-table>
    </div>

    <template #footer>
      <t-button @click="visible = false">取消</t-button>
      <template v-if="step === 'input' && inputMode === 'paste'">
        <t-button theme="primary" @click="handleParse">解析</t-button>
      </template>
      <template v-else-if="step === 'preview'">
        <t-button @click="handleBack">返回</t-button>
        <t-button theme="primary" @click="handleGenerate">生成 Schema</t-button>
      </template>
    </template>
  </t-dialog>
</template>

<style scoped lang="scss">
.json-importer {
  &__mode-tabs {
    display: flex;
    gap: 0;
    margin-bottom: 12px;
    border-bottom: 2px solid #e4e7ed;
  }

  &__mode-tab {
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 500;
    color: #909399;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      color: var(--td-brand-color);
    }

    &--active {
      color: var(--td-brand-color);
      border-bottom-color: var(--td-brand-color);
    }
  }

  &__error {
    color: #f56c6c;
    font-size: 13px;
    margin-top: 8px;
  }

  &__url-section {
    padding: 4px 0;
  }

  &__url-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  &__fetched-preview {
    margin-top: 12px;
  }

  &__label {
    display: block;
    font-size: 12px;
    color: #606266;
    margin-bottom: 4px;
  }

  &__summary {
    font-size: 13px;
    color: #606266;
    margin-bottom: 12px;
  }

  &__sample {
    font-size: 12px;
    color: #909399;
    word-break: break-all;
  }
}
</style>
