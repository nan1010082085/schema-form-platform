<script setup lang="ts">
/**
 * ConditionBuilder — 结构化条件表达式构建器
 *
 * 替代原始表达式 textarea，提供可视化条件配置：
 * - 字段选择（从 widget store 收集所有带 field 的组件）
 * - 运算符选择（===, !==, >, <, >=, <=, 包含, 为真, 为假）
 * - 值输入（运算符为 为真/为假 时自动隐藏）
 *
 * 内部维护条件子句列表，自动生成表达式字符串。
 * 支持与原始表达式字符串双向同步（向后兼容）。
 */
import { ref, watch } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import { useWidgetOptions } from '@/composables/useWidgetOptions'

interface ConditionClause {
  field: string
  operator: string
  value: string
}

const props = defineProps<{
  /** 当前表达式字符串 */
  modelValue?: string
  /** 是否必填 */
  required?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// ---- 字段选项 ----
const { widgetOptions } = useWidgetOptions()

// ---- 运算符选项 ----
const operatorOptions = [
  { label: '等于', value: '===', needsValue: true },
  { label: '不等于', value: '!==', needsValue: true },
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

/** 从表达式字符串解析子句（尽力而为，失败则保留空子句） */
function parseExpression(expr: string): ConditionClause[] {
  if (!expr?.trim()) return []

  // 尝试解析 "field op value" 格式的 AND 链
  const parts = expr.split('&&').map(s => s.trim()).filter(Boolean)
  const result: ConditionClause[] = []

  for (const part of parts) {
    // 匹配 field op value 模式
    const match = part.match(/^(\w+)\s*(===|!==|>=|<=|>|<)\s*(.+)$/)
    if (match) {
      let val = match[3].trim()
      // 去掉引号
      if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
        val = val.slice(1, -1)
      }
      result.push({ field: match[1], operator: match[2], value: val })
      continue
    }

    // 匹配 field.includes(value)
    const includesMatch = part.match(/^(\w+)\.includes\((.+)\)$/)
    if (includesMatch) {
      let val = includesMatch[2].trim()
      if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
        val = val.slice(1, -1)
      }
      result.push({ field: includesMatch[1], operator: 'includes', value: val })
      continue
    }

    // 匹配 !field 或 !!field
    if (part.startsWith('!!')) {
      result.push({ field: part.slice(2), operator: 'truthy', value: '' })
      continue
    }
    if (part.startsWith('!')) {
      result.push({ field: part.slice(1), operator: 'falsy', value: '' })
      continue
    }

    // 无法解析，作为原始文本保留
    result.push({ field: '', operator: '===', value: part })
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

    if (c.operator === 'truthy') {
      parts.push(`!!${c.field}`)
    } else if (c.operator === 'falsy') {
      parts.push(`!${c.field}`)
    } else if (c.operator === 'includes') {
      const val = isNaN(Number(c.value)) ? `'${c.value}'` : c.value
      parts.push(`${c.field}.includes(${val})`)
    } else {
      const val = isNaN(Number(c.value)) ? `'${c.value}'` : c.value
      parts.push(`${c.field} ${c.operator} ${val}`)
    }
  }
  return parts.join(' && ')
}

// ---- 同步：外部表达式 → 内部子句 ----
watch(
  () => props.modelValue,
  (expr) => {
    const parsed = parseExpression(expr ?? '')
    // 只在表达式真正变化时更新子句，避免循环
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
  clauses.value.push({ field: '', operator: '===', value: '' })
}

function removeClause(index: number) {
  clauses.value.splice(index, 1)
  syncToExpression()
}

function updateClause(index: number, key: keyof ConditionClause, val: string) {
  clauses.value[index][key] = val
  syncToExpression()
}

// ---- 运算符是否需要值输入 ----
function needsValue(operator: string): boolean {
  return operatorOptions.find(o => o.value === operator)?.needsValue ?? true
}
</script>

<template>
  <div :class="$style.builder">
    <!-- 子句列表 -->
    <div
      v-for="(clause, ci) in clauses"
      :key="ci"
      :class="$style.clause"
    >
      <!-- 字段选择 -->
      <el-select
        :model-value="clause.field"
        size="small"
        filterable
        placeholder="选择字段"
        :class="$style.fieldSelect"
        @update:model-value="updateClause(ci, 'field', $event)"
      >
        <el-option
          v-for="opt in widgetOptions"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>

      <!-- 运算符 -->
      <el-select
        :model-value="clause.operator"
        size="small"
        :class="$style.opSelect"
        @update:model-value="updateClause(ci, 'operator', $event)"
      >
        <el-option
          v-for="op in operatorOptions"
          :key="op.value"
          :label="op.label"
          :value="op.value"
        />
      </el-select>

      <!-- 值输入（为真/为假时隐藏） -->
      <el-input
        v-if="needsValue(clause.operator)"
        :model-value="clause.value"
        size="small"
        placeholder="比较值"
        :class="$style.valueInput"
        @update:model-value="updateClause(ci, 'value', $event)"
      />

      <!-- AND 标记 -->
      <span v-if="ci < clauses.length - 1" :class="$style.andMark">且</span>

      <!-- 删除 -->
      <el-button
        type="danger"
        :icon="Delete"
        size="small"
        text
        @click="removeClause(ci)"
      />
    </div>

    <!-- 空状态 -->
    <div v-if="clauses.length === 0" :class="$style.empty">
      {{ required ? '请添加条件' : '无条件，始终执行' }}
    </div>

    <!-- 添加条件 -->
    <el-button
      type="primary"
      :icon="Plus"
      size="small"
      text
      @click="addClause"
    >
      添加条件
    </el-button>

    <!-- 表达式预览 -->
    <div v-if="clauses.length > 0" :class="$style.preview">
      <span :class="$style.previewLabel">表达式:</span>
      <code :class="$style.previewCode">{{ modelValue || '...' }}</code>
    </div>
  </div>
</template>

<style module>
.builder {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.clause {
  display: flex;
  align-items: center;
  gap: 6px;
}

.fieldSelect {
  width: 180px;
}

.opSelect {
  width: 100px;
}

.valueInput {
  flex: 1;
  min-width: 100px;
}

.andMark {
  font-size: 11px;
  color: #909399;
  flex-shrink: 0;
}

.empty {
  font-size: 12px;
  color: #c0c4cc;
  text-align: center;
  padding: 6px 0;
}

.preview {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: #f4f4f5;
  border-radius: 4px;
  margin-top: 4px;
}

.previewLabel {
  font-size: 11px;
  color: #909399;
  flex-shrink: 0;
}

.previewCode {
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  font-size: 11px;
  color: #409eff;
  word-break: break-all;
}
</style>
