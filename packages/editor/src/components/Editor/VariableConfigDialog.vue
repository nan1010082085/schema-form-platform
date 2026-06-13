<script setup lang="ts">
/**
 * VariableConfigDialog — 变量配置对话框
 *
 * 支持配置 WidgetVariable[] 或 BoardVariable[]。
 * 每个变量包含：name, type, defaultValue, description。
 */
import { ref, watch, computed } from 'vue'
import { AddIcon, DeleteIcon } from 'tdesign-icons-vue-next'
import type { WidgetVariable } from '../../widgets/base/types'
import EnhancedDialog from '@/components/EnhancedDialog.vue'
import styles from './VariableConfigDialog.module.scss'

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
    <div :class="styles.body">
      <!-- 空状态 -->
      <div v-if="localVariables.length === 0" :class="styles.empty">
        暂无变量，点击下方按钮添加。
      </div>

      <!-- 变量列表 -->
      <div
        v-for="(v, i) in localVariables"
        :key="i"
        :class="styles.card"
      >
        <div :class="styles.cardHeader">
          <span :class="styles.cardTitle">变量 {{ i + 1 }}</span>
          <t-button
            theme="danger"
            variant="text"
            size="small"
            @click="removeVariable(i)"
          >
            <DeleteIcon />
          </t-button>
        </div>

        <div :class="styles.row">
          <label :class="styles.label">名称</label>
          <t-input
            v-model="v.name"
            placeholder="变量名（如 isAdmin）"
            style="flex: 1"
          />
        </div>

        <div :class="styles.row">
          <label :class="styles.label">类型</label>
          <t-select
            v-model="v.type"
            style="width: 120px"
            @update:model-value="v.defaultValue = $event === 'boolean' ? false : $event === 'number' ? 0 : $event === 'object' ? {} : $event === 'array' ? [] : ''"
          >
            <t-option
              v-for="opt in typeOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </t-select>

          <label :class="styles.label" style="margin-left: 8px">默认值</label>
          <t-switch
            v-if="v.type === 'boolean'"
            v-model="v.defaultValue"
          />
          <t-input-number
            v-else-if="v.type === 'number'"
            v-model="v.defaultValue as number"
            controls-position="right"
          />
          <t-input
            v-else-if="v.type === 'string'"
            v-model="v.defaultValue as string"
            placeholder="默认值"
            style="flex: 1"
          />
          <t-textarea
            v-else
            :model-value="typeof v.defaultValue === 'object' ? JSON.stringify(v.defaultValue) : (v.defaultValue as string) ?? ''"
            :rows="2"
            :placeholder="v.type === 'object' ? '{&quot;key&quot;: &quot;value&quot;}' : '[&quot;item1&quot;, &quot;item2&quot;]'"
            style="flex: 1"
            @update:model-value="handleJsonInput(v, $event)"
          />
        </div>

        <div :class="styles.row">
          <label :class="styles.label">描述</label>
          <t-input
            v-model="v.description"
            placeholder="可选，变量用途说明"
            style="flex: 1"
          />
        </div>
      </div>

      <!-- 错误提示 -->
      <div v-if="nameError" :class="styles.error">{{ nameError }}</div>

      <!-- 添加变量 -->
      <t-button
        theme="primary"
        variant="outline"
        style="width: 100%"
        @click="addVariable"
      >
        <AddIcon />
        添加变量
      </t-button>
    </div>

    <template #footer>
      <t-button @click="handleClose">取消</t-button>
      <t-button theme="primary" :disabled="!!nameError" @click="handleSave">保存</t-button>
    </template>
  </EnhancedDialog>
</template>
