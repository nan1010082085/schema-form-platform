<script setup lang="ts">
/**
 * JsonImporter -- Dialog for importing a JSON response and inferring schema.
 *
 * Flow: paste JSON (or fetch from URL) -> parse -> preview inferences -> override types -> generate schema.
 */
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getRequestInstance } from '@/utils/request'
import {
  inferFieldsFromJson,
  fieldInferencesToSchema,
  type FieldInference,
} from '@/utils/jsonToSchema'
import type { FormSchemaItem, SchemaType } from '@/components/FormGrid/types'

const emit = defineEmits<{
  'import': [schema: FormSchemaItem[]]
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
  { label: 'Input', value: 'input' },
  { label: 'Number', value: 'number' },
  { label: 'Select', value: 'select' },
  { label: 'Radio', value: 'radio' },
  { label: 'Checkbox', value: 'checkbox' },
  { label: 'Date', value: 'date' },
  { label: 'Date Range', value: 'date-range' },
  { label: 'Textarea', value: 'textarea' },
  { label: 'Richtext', value: 'richtext' },
  { label: 'Upload', value: 'upload' },
  { label: 'Table', value: 'table' },
  { label: 'Person Select', value: 'person-select' },
  { label: 'Dept Select', value: 'dept-select' },
  { label: 'Transfer', value: 'transfer' },
  { label: 'Card (nested)', value: 'card' },
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
    parseError.value = 'Please paste a JSON response.'
    return
  }

  try {
    const parsed = JSON.parse(jsonText.value) as unknown
    const result = inferFieldsFromJson(parsed)
    if (result.length === 0) {
      parseError.value = 'No fields could be inferred from this JSON. Ensure it contains an object with properties.'
      return
    }
    inferences.value = result
    step.value = 'preview'
  } catch {
    parseError.value = 'Invalid JSON format.'
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
    const http = getRequestInstance()
    const res = await http.get(fetchUrl.value) as unknown

    // Extract data array from wrapped response
    const dataSource = extractDataArray(res)

    // Store as formatted JSON for display
    jsonText.value = JSON.stringify(dataSource, null, 2)

    const result = inferFieldsFromJson(dataSource)
    if (result.length === 0) {
      fetchError.value = 'No fields could be inferred from the response. Ensure it returns an object or array with properties.'
      return
    }
    inferences.value = result
    step.value = 'preview'
    ElMessage.success(`Fetched and analyzed ${result.length} fields`)
  } catch (e: unknown) {
    fetchError.value = e instanceof Error ? e.message : 'Request failed'
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
  ElMessage.success(`Generated ${schema.length} schema items`)
}

function handleBack() {
  step.value = 'input'
}

defineExpose({ open })
</script>

<template>
  <el-dialog
    v-model="visible"
    title="Import from JSON"
    width="700px"
    :close-on-click-modal="false"
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
          Paste JSON
        </button>
        <button
          class="json-importer__mode-tab"
          :class="{ 'json-importer__mode-tab--active': inputMode === 'url' }"
          @click="inputMode = 'url'"
        >
          Fetch from URL
        </button>
      </div>

      <!-- Paste mode -->
      <template v-if="inputMode === 'paste'">
        <el-input
          v-model="jsonText"
          type="textarea"
          :rows="14"
          placeholder='Paste API response JSON here, e.g.:
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
            <el-input
              v-model="fetchUrl"
              size="small"
              placeholder="/api/list or https://example.com/api/data"
              @keyup.enter="handleFetchFromUrl"
            />
            <el-button
              type="primary"
              size="small"
              :loading="fetching"
              @click="handleFetchFromUrl"
            >
              Fetch
            </el-button>
          </div>
          <div v-if="fetchError" class="json-importer__error">{{ fetchError }}</div>
          <div v-if="jsonText" class="json-importer__fetched-preview">
            <label class="json-importer__label">Fetched Response:</label>
            <el-input
              :model-value="jsonText"
              type="textarea"
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
        {{ inferences.length }} fields detected. Override inferred types if needed.
      </p>
      <el-table :data="inferences" border size="small" max-height="400">
        <el-table-column prop="field" label="Field Name" min-width="140" />
        <el-table-column prop="label" label="Label" min-width="120" />
        <el-table-column label="Type" width="160">
          <template #default="{ row, $index }">
            <el-select
              :model-value="row.type"
              size="small"
              style="width: 100%"
              @update:model-value="handleOverrideType($index, $event as SchemaType)"
            >
              <el-option
                v-for="opt in schemaTypeOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="Sample Value" min-width="160">
          <template #default="{ row }">
            <span class="json-importer__sample">
              {{ typeof row.sample === 'object' ? JSON.stringify(row.sample) : String(row.sample ?? '') }}
            </span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <template #footer>
      <el-button @click="visible = false">Cancel</el-button>
      <template v-if="step === 'input' && inputMode === 'paste'">
        <el-button type="primary" @click="handleParse">Parse</el-button>
      </template>
      <template v-else-if="step === 'preview'">
        <el-button @click="handleBack">Back</el-button>
        <el-button type="primary" @click="handleGenerate">Generate Schema</el-button>
      </template>
    </template>
  </el-dialog>
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
      color: #409eff;
    }

    &--active {
      color: #409eff;
      border-bottom-color: #409eff;
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
