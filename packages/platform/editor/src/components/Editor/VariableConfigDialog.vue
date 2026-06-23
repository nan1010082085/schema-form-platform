<script setup lang="ts">
/**
 * VariableConfigDialog — 变量配置对话框
 *
 * 支持配置 WidgetVariable[] 或 BoardVariable[]。
 * 每个变量包含：name, type, defaultValue, description。
 */
import { ref, watch, computed } from 'vue'
import type { WidgetVariable } from '../../widgets/base/types'
import AppDialog from '@schema-form/platform-shared/components/common/AppDialog.vue'
import styles from './VariableConfigDialog.module.scss'
import AppIcon from '@schema-form/platform-shared/components/common/AppIcon.vue'

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
  <AppDialog
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
          <el-button
            type="danger"
            link
            size="small"
            @click="removeVariable(i)"
          >
            <AppIcon name="delete"  />
          </el-button>
        </div>

        <div :class="styles.row">
          <label :class="styles.label">名称</label>
          <el-input
            v-model="v.name"
            placeholder="变量名（如 isAdmin）"
            style="flex: 1"
          />
        </div>

        <div :class="styles.row">
          <label :class="styles.label">类型</label>
          <el-select
            v-model="v.type"
            style="width: 120px"
            @change="v.defaultValue = $event === 'boolean' ? false : $event === 'number' ? 0 : $event === 'object' ? {} : $event === 'array' ? [] : ''"
          >
            <el-option
              v-for="opt in typeOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>

          <label :class="styles.label" style="margin-left: 8px">默认值</label>
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
            type="textarea"
            :model-value="typeof v.defaultValue === 'object' ? JSON.stringify(v.defaultValue) : (v.defaultValue as string) ?? ''"
            :rows="2"
            :placeholder="v.type === 'object' ? '{&quot;key&quot;: &quot;value&quot;}' : '[&quot;item1&quot;, &quot;item2&quot;]'"
            style="flex: 1"
            @input="handleJsonInput(v, $event)"
          />
        </div>

        <div :class="styles.row">
          <label :class="styles.label">描述</label>
          <el-input
            v-model="v.description"
            placeholder="可选，变量用途说明"
            style="flex: 1"
          />
        </div>
      </div>

      <!-- 错误提示 -->
      <div v-if="nameError" :class="styles.error">{{ nameError }}</div>

      <!-- 添加变量 -->
      <el-button
        type="primary"
        plain
        style="width: 100%"
        @click="addVariable"
      >
        <AppIcon name="plus"  />
        添加变量
      </el-button>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :disabled="!!nameError" @click="handleSave">保存</el-button>
    </template>
  </AppDialog>
</template>
