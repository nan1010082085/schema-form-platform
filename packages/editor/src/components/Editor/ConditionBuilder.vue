<script setup lang="ts">
/**
 * ConditionBuilder — 结构化条件表达式构建器
 *
 * 支持三类引用：表单字段、变量、组件暴露值
 * 支持 AND / OR 逻辑组合
 * 双向同步表达式字符串
 */
import { ref, watch } from 'vue'
import { AddIcon, DeleteIcon } from 'tdesign-icons-vue-next'
import { useConditionReferences } from '@/composables/useConditionReferences'
import styles from './ConditionBuilder.module.scss'

interface ConditionClause {
  field: string
  operator: string
  value: string
  logic: '&&' | '||'
}

const props = defineProps<{
  modelValue?: string
  required?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// ---- 引用选项（字段 + 变量 + 暴露值） ----
const { fieldRefs, variableRefs, exposedRefs } = useConditionReferences()

// ---- 运算符选项 ----
const operatorOptions = [
  { label: '等于', value: '==', needsValue: true },
  { label: '不等于', value: '!=', needsValue: true },
  { label: '大于', value: '>', needsValue: true },
  { label: '小于', value: '<', needsValue: true },
  { label: '大于等于', value: '>=', needsValue: true },
  { label: '小于等于', value: '<=', needsValue: true },
  { label: '包含', value: 'includes', needsValue: true },
  { label: '为真', value: 'truthy', needsValue: false },
  { label: '为假', value: 'falsy', needsValue: false },
]

// ---- 条件子句列表 ----
const clauses = ref<ConditionClause[]>([])

/** 从表达式字符串解析子句 */
function parseExpression(expr: string): ConditionClause[] {
  if (!expr?.trim()) return []

  // 按 || 分割为 OR 组，每组内部按 && 分割
  const orGroups = expr.split('||').map(s => s.trim()).filter(Boolean)
  const result: ConditionClause[] = []

  for (let gi = 0; gi < orGroups.length; gi++) {
    const andParts = orGroups[gi].split('&&').map(s => s.trim()).filter(Boolean)
    for (let ai = 0; ai < andParts.length; ai++) {
      const part = andParts[ai]
      const isFirst = gi === 0 && ai === 0
      const logic: '&&' | '||' = isFirst ? '&&' : (ai === 0 ? '||' : '&&')

      // 匹配 field op value 模式（支持 exposed.xxx.value 和 variables.xxx 作为 field）
      const match = part.match(/^([\w.]+)\s*(===?|!==?|>=|<=|>|<)\s*(.+)$/)
      if (match) {
        let val = match[3].trim()
        if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
          val = val.slice(1, -1)
        }
        result.push({ field: match[1], operator: match[2], value: val, logic })
        continue
      }

      // 匹配 field.includes(value)
      const includesMatch = part.match(/^([\w.]+)\.includes\((.+)\)$/)
      if (includesMatch) {
        let val = includesMatch[2].trim()
        if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
          val = val.slice(1, -1)
        }
        result.push({ field: includesMatch[1], operator: 'includes', value: val, logic })
        continue
      }

      // 匹配 !!field 或 !field
      if (part.startsWith('!!')) {
        result.push({ field: part.slice(2), operator: 'truthy', value: '', logic })
        continue
      }
      if (part.startsWith('!')) {
        result.push({ field: part.slice(1), operator: 'falsy', value: '', logic })
        continue
      }

      result.push({ field: '', operator: '==', value: part, logic })
    }
  }

  return result
}

/** 从子句列表生成表达式字符串 */
function buildExpression(cls: ConditionClause[]): string {
  const parts: string[] = []
  for (const c of cls) {
    if (!c.field) continue
    const op = operatorOptions.find(o => o.value === c.operator)
    if (!op) continue

    let expr: string
    if (c.operator === 'truthy') {
      expr = `!!${c.field}`
    } else if (c.operator === 'falsy') {
      expr = `!${c.field}`
    } else if (c.operator === 'includes') {
      const val = isNaN(Number(c.value)) ? `'${c.value}'` : c.value
      expr = `${c.field}.includes(${val})`
    } else {
      const val = isNaN(Number(c.value)) ? `'${c.value}'` : c.value
      expr = `${c.field} ${c.operator} ${val}`
    }

    if (parts.length > 0) {
      parts.push(c.logic === '||' ? ' || ' : ' && ')
    }
    parts.push(expr)
  }
  return parts.join('')
}

// ---- 同步：外部表达式 → 内部子句 ----
watch(
  () => props.modelValue,
  (expr) => {
    const parsed = parseExpression(expr ?? '')
    const current = buildExpression(clauses.value)
    if ((expr ?? '') !== current) {
      clauses.value = parsed.length > 0 ? parsed : []
    }
  },
  { immediate: true },
)

// ---- 同步：内部子句 → 外部表达式 ----
function syncToExpression() {
  const expr = buildExpression(clauses.value)
  emit('update:modelValue', expr)
}

// ---- CRUD ----
function addClause() {
  const logic = clauses.value.length > 0 ? '&&' : '&&'
  clauses.value.push({ field: '', operator: '==', value: '', logic })
}

function removeClause(index: number) {
  clauses.value.splice(index, 1)
  syncToExpression()
}

function updateClause(index: number, key: keyof ConditionClause, val: string) {
  ;(clauses.value[index] as Record<string, unknown>)[key] = val
  syncToExpression()
}

function needsValue(operator: string): boolean {
  return operatorOptions.find(o => o.value === operator)?.needsValue ?? true
}
</script>

<template>
  <div :class="styles.builder">
    <div
      v-for="(clause, ci) in clauses"
      :key="ci"
      :class="styles.clause"
    >
      <!-- 逻辑切换（非第一个子句） -->
      <t-select
        v-if="ci > 0"
        :model-value="clause.logic"
        :class="styles.logicSelect"
        @update:model-value="updateClause(ci, 'logic', $event)"
      >
        <t-option label="且" value="&&" />
        <t-option label="或" value="||" />
      </t-select>

      <!-- 字段选择（分组） -->
      <t-select
        :model-value="clause.field"
        filterable
        placeholder="选择字段"
        :class="styles.fieldSelect"
        @update:model-value="updateClause(ci, 'field', $event)"
      >
        <t-option-group v-if="fieldRefs.length > 0" label="表单字段">
          <t-option
            v-for="opt in fieldRefs"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </t-option-group>
        <t-option-group v-if="variableRefs.length > 0" label="变量">
          <t-option
            v-for="opt in variableRefs"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </t-option-group>
        <t-option-group v-if="exposedRefs.length > 0" label="组件暴露值">
          <t-option
            v-for="opt in exposedRefs"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </t-option-group>
      </t-select>

      <!-- 运算符 -->
      <t-select
        :model-value="clause.operator"
        :class="styles.opSelect"
        @update:model-value="updateClause(ci, 'operator', $event)"
      >
        <t-option
          v-for="op in operatorOptions"
          :key="op.value"
          :label="op.label"
          :value="op.value"
        />
      </t-select>

      <!-- 值输入 -->
      <t-input
        v-if="needsValue(clause.operator)"
        :model-value="clause.value"
        placeholder="比较值"
        :class="styles.valueInput"
        @update:model-value="updateClause(ci, 'value', $event)"
      />

      <!-- 删除 -->
      <t-button
        theme="danger"
        size="small"
        variant="text"
        @click="removeClause(ci)"
      >
        <DeleteIcon />
      </t-button>
    </div>

    <!-- 空状态 -->
    <div v-if="clauses.length === 0" :class="styles.empty">
      {{ required ? '请添加条件' : '无条件，始终执行' }}
    </div>

    <!-- 添加条件 -->
    <t-button
      theme="primary"
      size="small"
      variant="text"
      @click="addClause"
    >
      <AddIcon />
      添加条件
    </t-button>

    <!-- 表达式预览 -->
    <div v-if="clauses.length > 0" :class="styles.preview">
      <span :class="styles.previewLabel">表达式:</span>
      <code :class="styles.previewCode">{{ modelValue || '...' }}</code>
    </div>
  </div>
</template>
