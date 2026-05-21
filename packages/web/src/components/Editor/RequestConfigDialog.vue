<script setup lang="ts">
/**
 * RequestConfigDialog -- API 请求配置对话框
 *
 * 用于配置 Table 等组件的 API 数据源。
 * 支持 URL、Method、Headers、Response Data Path 配置。
 */
import { ref, watch } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import EnhancedDialog from '@/components/EnhancedDialog.vue'

interface RequestConfig {
  apiUrl: string
  apiMethod: string
  apiHeaders: Record<string, string>
  responseDataPath: string
}

const props = defineProps<{
  visible: boolean
  config: RequestConfig
}>()

const emit = defineEmits<{
  'update:visible': [val: boolean]
  'update:config': [config: RequestConfig]
  save: [config: RequestConfig]
  cancel: []
}>()

// ---- 本地编辑副本 ----

const localConfig = ref<RequestConfig>({
  apiUrl: '',
  apiMethod: 'get',
  apiHeaders: {},
  responseDataPath: '',
})

// Header 键值对编辑状态
interface HeaderEntry {
  key: string
  value: string
}

const headerEntries = ref<HeaderEntry[]>([])

watch(
  () => props.visible,
  (open) => {
    if (open) {
      localConfig.value = JSON.parse(JSON.stringify(props.config))
      // 将 headers 对象转为键值对数组
      headerEntries.value = Object.entries(localConfig.value.apiHeaders).map(
        ([key, value]) => ({ key, value }),
      )
      // 确保至少有一行
      if (headerEntries.value.length === 0) {
        headerEntries.value.push({ key: '', value: '' })
      }
    }
  },
)

// ---- Header CRUD ----

function addHeader() {
  headerEntries.value.push({ key: '', value: '' })
}

function removeHeader(index: number) {
  headerEntries.value.splice(index, 1)
}

function syncHeaders() {
  const headers: Record<string, string> = {}
  for (const entry of headerEntries.value) {
    if (entry.key.trim()) {
      headers[entry.key.trim()] = entry.value
    }
  }
  localConfig.value.apiHeaders = headers
}

// ---- 方法选项 ----

const methodOptions = [
  { label: 'GET', value: 'get' },
  { label: 'POST', value: 'post' },
  { label: 'PUT', value: 'put' },
  { label: 'DELETE', value: 'delete' },
]

// ---- 保存 / 关闭 ----

function handleSave() {
  syncHeaders()
  emit('save', { ...localConfig.value })
  emit('update:config', { ...localConfig.value })
  emit('update:visible', false)
}

function handleClose() {
  emit('cancel')
  emit('update:visible', false)
}
</script>

<template>
  <EnhancedDialog
    :model-value="visible"
    title="API 请求配置"
    width="560px"
    @update:model-value="emit('update:visible', $event)"
  >
    <div :class="$style.body">
      <!-- URL -->
      <div :class="$style.row">
        <label :class="$style.label">请求地址</label>
        <el-input
          v-model="localConfig.apiUrl"
          size="small"
          placeholder="/api/data"
        />
      </div>

      <!-- Method -->
      <div :class="$style.row">
        <label :class="$style.label">请求方法</label>
        <el-select
          v-model="localConfig.apiMethod"
          size="small"
          style="flex: 1"
        >
          <el-option
            v-for="opt in methodOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>

      <!-- Headers -->
      <div :class="$style.section">
        <div :class="$style.sectionHeader">
          <span :class="$style.sectionTitle">请求头 (Headers)</span>
          <el-button
            type="primary"
            :icon="Plus"
            size="small"
            text
            @click="addHeader"
          >
            添加
          </el-button>
        </div>

        <div
          v-for="(entry, idx) in headerEntries"
          :key="idx"
          :class="$style.headerRow"
        >
          <el-input
            v-model="entry.key"
            size="small"
            placeholder="Header Name"
            @change="syncHeaders"
          />
          <el-input
            v-model="entry.value"
            size="small"
            placeholder="Header Value"
            @change="syncHeaders"
          />
          <el-button
            type="danger"
            :icon="Delete"
            size="small"
            text
            @click="removeHeader(idx)"
          />
        </div>
      </div>

      <!-- Response Data Path -->
      <div :class="$style.row">
        <label :class="$style.label">数据路径</label>
        <el-input
          v-model="localConfig.responseDataPath"
          size="small"
          placeholder="data.list (点号分隔)"
        />
      </div>
    </div>

    <template #footer>
      <el-button size="small" @click="handleClose">取消</el-button>
      <el-button type="primary" size="small" @click="handleSave">保存</el-button>
    </template>
  </EnhancedDialog>
</template>

<style module>
.body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label {
  width: 80px;
  flex-shrink: 0;
  font-size: 12px;
  color: #606266;
  line-height: 32px;
}

.section {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 10px;
  background: #fafbfc;
}

.sectionHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.sectionTitle {
  font-size: 12px;
  font-weight: 500;
  color: #606266;
}

.headerRow {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
</style>
