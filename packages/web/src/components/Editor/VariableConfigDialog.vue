<script setup lang="ts">
/**
 * VariableConfigDialog — 变量配置对话框
 *
 * 支持配置 WidgetVariable[] 或 BoardVariable[]。
 * 每个变量包含：name, type, defaultValue, description。
 */
import { ref, watch, computed } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import type { WidgetVariable } from '../../widgets/base/types'
import EnhancedDialog from '@/components/EnhancedDialog.vue'

const props = defineProps<{
  visible: boolean
  variables: WidgetVariable[]
  title?: string
}>()

const emit = defineEmits<{
  'update:visible': [val: boolean]
  save: [variables: WidgetVariable[]]
}>()

// ---- 本地编辑副本 ----

const localVariables = ref<WidgetVariable[]>([])

watch(
  () => props.visible,
  (open) => {
    if (open) {
      localVariables.value = JSON.parse(JSON.stringify(props.variables ?? []))
    }
  },
)

// ---- 类型选项 ----

const typeOptions = [
  { label: '字符串', value: 'string' },
  { label: '数字', value: 'number' },
  { label: '布尔', value: 'boolean' },
  { label: '对象', value: 'object' },
  { label: '数组', value: 'array' },
]

// ---- CRUD ----

function addVariable() {
  localVariables.value.push({
    name: '',
    type: 'string',
    defaultValue: '',
    description: '',
  })
}

function removeVariable(index: number) {
  localVariables.value.splice(index, 1)
}

// ---- JSON 输入处理 ----

function handleJsonInput(v: WidgetVariable, val: string) {
  try {
    v.defaultValue = JSON.parse(val)
  } catch {
    v.defaultValue = val
  }
}

// ---- 名称校验 ----

const nameError = computed(() => {
  const names = localVariables.value.map(v => v.name).filter(Boolean)
  const duplicates = names.filter((n, i) => names.indexOf(n) !== i)
  if (duplicates.length) return `变量名重复: ${duplicates[0]}`
  const invalid = localVariables.value.find(v => v.name && !/^[a-zA-Z_]\w*$/.test(v.name))
  if (invalid) return `变量名 "${invalid.name}" 格式不合法（仅支持字母、数字、下划线）`
  return ''
})

// ---- 保存 / 关闭 ----

function handleSave() {
  if (nameError.value) return
  // 过滤掉空名称的变量
  const valid = localVariables.value.filter(v => v.name.trim())
  emit('save', valid)
  emit('update:visible', false)
}

function handleClose() {
  emit('update:visible', false)
}
</script>

<template>
  <EnhancedDialog
    :model-value="visible"
    :title="title || '变量配置'"
    width="600px"
    @update:model-value="emit('update:visible', $event)"
  >
    <div :class="$style.body">
      <!-- 空状态 -->
      <div v-if="localVariables.length === 0" :class="$style.empty">
        暂无变量，点击下方按钮添加。
      </div>

      <!-- 变量列表 -->
      <div
        v-for="(v, i) in localVariables"
        :key="i"
        :class="$style.card"
      >
        <div :class="$style.cardHeader">
          <span :class="$style.cardTitle">变量 {{ i + 1 }}</span>
          <el-button
            type="danger"
            :icon="Delete"
            size="small"
            text
            @click="removeVariable(i)"
          />
        </div>

        <div :class="$style.row">
          <label :class="$style.label">名称</label>
          <el-input
            v-model="v.name"
            placeholder="变量名（如 isAdmin）"
            style="flex: 1"
          />
        </div>

        <div :class="$style.row">
          <label :class="$style.label">类型</label>
          <el-select
            v-model="v.type"
            style="width: 120px"
            @update:model-value="v.defaultValue = $event === 'boolean' ? false : $event === 'number' ? 0 : $event === 'object' ? {} : $event === 'array' ? [] : ''"
          >
            <el-option
              v-for="opt in typeOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>

          <label :class="$style.label" style="margin-left: 8px">默认值</label>
          <el-switch
            v-if="v.type === 'boolean'"
            v-model="v.defaultValue"
          />
          <el-input-number
            v-else-if="v.type === 'number'"
            v-model="v.defaultValue as number"
            controls-position="right"
          />
          <el-input
            v-else-if="v.type === 'string'"
            v-model="v.defaultValue as string"
            placeholder="默认值"
            style="flex: 1"
          />
          <el-input
            v-else
            :model-value="typeof v.defaultValue === 'object' ? JSON.stringify(v.defaultValue) : (v.defaultValue as string) ?? ''"
            type="textarea"
            :rows="2"
            :placeholder="v.type === 'object' ? '{&quot;key&quot;: &quot;value&quot;}' : '[&quot;item1&quot;, &quot;item2&quot;]'"
            style="flex: 1"
            @update:model-value="handleJsonInput(v, $event)"
          />
        </div>

        <div :class="$style.row">
          <label :class="$style.label">描述</label>
          <el-input
            v-model="v.description"
            placeholder="可选，变量用途说明"
            style="flex: 1"
          />
        </div>
      </div>

      <!-- 错误提示 -->
      <div v-if="nameError" :class="$style.error">{{ nameError }}</div>

      <!-- 添加变量 -->
      <el-button
        type="primary"
        :icon="Plus"
        plain
        style="width: 100%"
        @click="addVariable"
      >
        添加变量
      </el-button>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :disabled="!!nameError" @click="handleSave">保存</el-button>
    </template>
  </EnhancedDialog>
</template>

<style module>
.body {
  max-height: 60vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 统一表单控件高度 32px */
.body :global(.el-input__wrapper),
.body :global(.el-select .el-input__wrapper),
.body :global(.el-button:not(.is-text):not(.is-link)) {
  height: 32px !important;
  min-height: 32px !important;
}

/* el-input-number 内部的 el-input 与其他表单控件保持 32px 一致 */
.body :global(.el-input-number .el-input__wrapper) {
  height: 32px !important;
  min-height: 32px !important;
}

/* el-input-number 使用 Element Plus 原生样式 */
.body :global(.el-input-number) {
  --el-input-number-width: 200px;
}

.empty {
  text-align: center;
  color: #909399;
  font-size: 13px;
  padding: 24px 0;
}

.card {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 12px;
  background: #fafbfc;
}

.cardHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.cardTitle {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.label {
  width: 50px;
  flex-shrink: 0;
  font-size: 12px;
  color: #606266;
}

.error {
  color: #f56c6c;
  font-size: 12px;
  padding: 0 4px;
}
</style>
