<script setup lang="ts">
/**
 * RulesEditor -- Visual editor for Element Plus FormItemRule[].
 *
 * Sprint 18: Replaces "configured in JSON view" with structured form.
 * Each rule row: required switch -> type -> min/max -> pattern -> message -> trigger.
 */
import styles from './RulesEditor.module.scss'

interface FormRule {
  required?: boolean
  type?: string
  min?: number
  max?: number
  pattern?: string | RegExp
  message?: string
  trigger?: string
}

const props = defineProps<{
  rules: FormRule[] | undefined
}>()

const emit = defineEmits<{
  'update:rules': [rules: FormRule[] | undefined]
}>()

const ruleTypeOptions = [
  { label: '字符串', value: 'string' },
  { label: '数字', value: 'number' },
  { label: '布尔', value: 'boolean' },
  { label: '日期', value: 'date' },
  { label: '数组', value: 'array' },
  { label: '对象', value: 'object' },
  { label: '邮箱', value: 'email' },
  { label: 'URL', value: 'url' },
  { label: '整数', value: 'integer' },
  { label: '浮点数', value: 'float' },
]

const triggerOptions = [
  { label: '失焦', value: 'blur' },
  { label: '变更', value: 'change' },
  { label: '失焦+变更', value: 'blur,change' },
]

function addRule() {
  const newRule: FormRule = { required: true, message: '', trigger: 'blur' }
  emit('update:rules', [...(props.rules ?? []), newRule])
}

function removeRule(index: number) {
  const updated = (props.rules ?? []).filter((_, i) => i !== index)
  emit('update:rules', updated.length ? updated : undefined)
}

function updateRule(index: number, patch: Partial<FormRule>) {
  const updated = (props.rules ?? []).map((r, i) => i === index ? { ...r, ...patch } : r)
  emit('update:rules', updated)
}

function setRequired(index: number, val: boolean) {
  if (val) {
    updateRule(index, { required: true })
  } else {
    const { required: _, ...rest } = props.rules![index]
    emit('update:rules', (props.rules ?? []).map((r, i) => i === index ? rest : r))
  }
}
</script>

<template>
  <div :class="styles['rules-editor']">
    <div v-if="!rules?.length" :class="styles['rules-editor__empty']">未配置校验规则。</div>

    <div v-for="(rule, idx) in (rules ?? [])" :key="idx" :class="styles['rules-editor__item']">
      <div :class="styles['rules-editor__item-header']">
        <span :class="styles['rules-editor__item-title']">规则 {{ idx + 1 }}</span>
        <el-button type="danger" size="small" text @click="removeRule(idx)">
          <AppIcon name="delete" />
        </el-button>
      </div>

      <!-- Required -->
      <div :class="styles['rules-editor__field']">
        <label :class="styles['rules-editor__label']">必填</label>
        <el-switch :model-value="rule.required === true" @update:model-value="setRequired(idx, $event)" />
      </div>

      <!-- Type -->
      <div :class="styles['rules-editor__field']">
        <label :class="styles['rules-editor__label']">类型</label>
        <el-select
          :model-value="rule.type ?? ''"
          size="small"
          style="width:100%"
          clearable
          @update:model-value="updateRule(idx, { type: $event || undefined })"
        >
          <el-option v-for="opt in ruleTypeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
      </div>

      <!-- Min -->
      <div :class="styles['rules-editor__field']">
        <label :class="styles['rules-editor__label']">最小值</label>
        <el-input-number
          :model-value="rule.min as number ?? undefined"
          size="small"
          style="width:100%"
          :min="0"
          controls-position="right"
          @update:model-value="updateRule(idx, { min: $event ?? undefined })"
        />
      </div>

      <!-- Max -->
      <div :class="styles['rules-editor__field']">
        <label :class="styles['rules-editor__label']">最大值</label>
        <el-input-number
          :model-value="rule.max as number ?? undefined"
          size="small"
          style="width:100%"
          :min="0"
          controls-position="right"
          @update:model-value="updateRule(idx, { max: $event ?? undefined })"
        />
      </div>

      <!-- Pattern -->
      <div :class="styles['rules-editor__field']">
        <label :class="styles['rules-editor__label']">正则表达式</label>
        <el-input
          :model-value="rule.pattern ? String(rule.pattern) : ''"
          size="small"
          placeholder="^[a-zA-Z]+$"
          @update:model-value="updateRule(idx, { pattern: $event || undefined })"
        />
      </div>

      <!-- Message -->
      <div :class="styles['rules-editor__field']">
        <label :class="styles['rules-editor__label']">错误提示</label>
        <el-input
          :model-value="rule.message ?? ''"
          size="small"
          placeholder="校验错误提示"
          @update:model-value="updateRule(idx, { message: $event || undefined })"
        />
      </div>

      <!-- Trigger -->
      <div :class="styles['rules-editor__field']">
        <label :class="styles['rules-editor__label']">触发方式</label>
        <el-select
          :model-value="rule.trigger ?? 'blur'"
          size="small"
          style="width:100%"
          @update:model-value="updateRule(idx, { trigger: $event as string })"
        >
          <el-option v-for="opt in triggerOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
      </div>
    </div>

    <el-button type="primary" size="small" plain style="width:100%;margin-top:8px" @click="addRule">
      <AppIcon name="plus" />
      添加规则
    </el-button>
  </div>
</template>

