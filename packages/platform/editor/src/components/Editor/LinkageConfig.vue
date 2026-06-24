<script setup lang="ts">
/**
 * LinkageConfig -- CRUD UI for SchemaLinkage[] on a single schema item.
 *
 * Each linkage row supports:
 * - type: LinkageType (select)
 * - watchFields: string[] (multi-select from availableFields)
 * - condition: string expression with real-time validation
 * - thenOptions / thenApi (for 'options' type)
 * - elseValue
 */
import { computed } from 'vue'
import { validateExpression } from '@/utils/expression'
import type { SchemaLinkage, LinkageType, DictItem, SchemaApiConfig } from '@/components/WidgetRenderer/types'
import AppIcon from '@schema-form/platform-shared/components/common/AppIcon.vue'
import styles from './LinkageConfig.module.scss'

const props = defineProps<{
  linkages: SchemaLinkage[]
  availableFields: string[]
}>()

const emit = defineEmits<{
  'update:linkages': [linkages: SchemaLinkage[]]
}>()

/** Linkage type options */
const linkageTypeOptions: { label: string; value: LinkageType }[] = [
  { label: '可见', value: 'visible' },
  { label: '禁用', value: 'disabled' },
  { label: '必填', value: 'required' },
  { label: '选项', value: 'options' },
  { label: '设置值', value: 'set-value' },
  { label: '重置字段', value: 'reset-fields' },
]

/** Available fields as select options */
const fieldOptions = computed(() =>
  props.availableFields.map((f) => ({ label: f, value: f })),
)

/**
 * Cached condition validation states (Sprint 11 performance fix).
 * One computed per linkage rule, avoids re-evaluating on every render.
 */
const conditionStates = computed(() =>
  props.linkages.map((linkage) => {
    if (!linkage.condition) return { valid: true as const, error: undefined as string | undefined }
    return validateExpression(linkage.condition as string)
  }),
)

function addLinkage() {
  const newLinkage: SchemaLinkage = {
    type: 'visible',
    watchFields: [],
    condition: '',
  }
  emit('update:linkages', [...props.linkages, newLinkage])
}

function removeLinkage(index: number) {
  const updated = props.linkages.filter((_, i) => i !== index)
  emit('update:linkages', updated)
}

function updateLinkage<K extends keyof SchemaLinkage>(index: number, field: K, value: SchemaLinkage[K]) {
  const updated = props.linkages.map((item, i) =>
    i === index ? { ...item, [field]: value } : item,
  )
  emit('update:linkages', updated)
}

/** Parse thenOptions from textarea (one per line: label=value) */
function parseOptionsText(text: string): DictItem[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const eqIdx = line.indexOf('=')
      if (eqIdx === -1) return { label: line, value: line }
      return { label: line.slice(0, eqIdx).trim(), value: line.slice(eqIdx + 1).trim() }
    })
}

function optionsToText(options?: DictItem[]): string {
  if (!options?.length) return ''
  return options.map((o) => `${o.label}=${o.value}`).join('\n')
}

/** Parse thenApi from JSON text */
function parseApiText(text: string): SchemaApiConfig | undefined {
  if (!text.trim()) return undefined
  try {
    return JSON.parse(text) as SchemaApiConfig
  } catch {
    return undefined
  }
}

function apiToText(api?: SchemaApiConfig): string {
  if (!api) return ''
  return JSON.stringify(api, null, 2)
}
</script>

<template>
  <div :class="styles['linkage-config']">
    <div v-if="linkages.length === 0" :class="styles['linkage-config__empty']">
      未配置联动规则。
    </div>

    <div
      v-for="(linkage, idx) in linkages"
      :key="idx"
      :class="styles['linkage-config__item']"
    >
      <div :class="styles['linkage-config__item-header']">
        <span :class="styles['linkage-config__item-title']">规则 {{ idx + 1 }}</span>
        <el-button
          type="danger"
          link
          size="small"
          @click="removeLinkage(idx)"
        >
          <AppIcon name="delete" />
        </el-button>
      </div>

      <!-- Type -->
      <div :class="styles['linkage-config__field']">
        <label :class="styles['linkage-config__label']">类型</label>
        <el-select
          :model-value="linkage.type"
          size="small"
          style="width: 100%"
          @update:model-value="updateLinkage(idx, 'type', $event as LinkageType)"
        >
          <el-option
            v-for="opt in linkageTypeOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>

      <!-- Watch Fields -->
      <div :class="styles['linkage-config__field']">
        <label :class="styles['linkage-config__label']">监听字段</label>
        <el-select
          :model-value="linkage.watchFields"
          size="small"
          multiple
          filterable
          style="width: 100%"
          placeholder="选择要监听的字段"
          @update:model-value="updateLinkage(idx, 'watchFields', $event as string[])"
        >
          <el-option
            v-for="opt in fieldOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>

      <!-- Condition Expression -->
      <div :class="styles['linkage-config__field']">
        <label :class="styles['linkage-config__label']">条件表达式</label>
        <el-input
          type="textarea"
          :model-value="linkage.condition"
          :rows="2"
          placeholder='${field} === "value"'
          :class="{ [styles['is-error']]: !conditionStates[idx].valid }"
          @update:model-value="updateLinkage(idx, 'condition', $event)"
        />
        <div
          v-if="linkage.condition && !conditionStates[idx].valid"
          :class="styles['linkage-config__error']"
        >
          {{ conditionStates[idx].error }}
        </div>
      </div>

      <!-- thenOptions (for 'options' type) -->
      <div v-if="linkage.type === 'options'" :class="styles['linkage-config__field']">
        <label :class="styles['linkage-config__label']">联动选项 (label=value, 每行一个)</label>
        <el-input
          type="textarea"
          :model-value="optionsToText(linkage.thenOptions)"
          :rows="3"
          placeholder="选项A=opt_a&#10;选项B=opt_b"
          @update:model-value="updateLinkage(idx, 'thenOptions', parseOptionsText($event))"
        />
      </div>

      <!-- thenApi (for 'options' type) -->
      <div v-if="linkage.type === 'options'" :class="styles['linkage-config__field']">
        <label :class="styles['linkage-config__label']">联动 API (JSON)</label>
        <el-input
          type="textarea"
          :model-value="apiToText(linkage.thenApi)"
          :rows="3"
          placeholder='{"url":"/api/options","method":"get"}'
          @update:model-value="updateLinkage(idx, 'thenApi', parseApiText($event))"
        />
      </div>

      <!-- set-value specific: literal value -->
      <div v-if="linkage.type === 'set-value'" :class="styles['linkage-config__field']">
        <label :class="styles['linkage-config__label']">联动赋值 (字面量)</label>
        <el-input
          :model-value="String(linkage.thenValue ?? '')"
          size="small"
          placeholder="要设置的字面量值"
          @update:model-value="updateLinkage(idx, 'thenValue', $event)"
        />
      </div>

      <!-- set-value specific: value source field -->
      <div v-if="linkage.type === 'set-value'" :class="styles['linkage-config__field']">
        <label :class="styles['linkage-config__label']">值来源 (从字段复制)</label>
        <el-select
          :model-value="linkage.valueSource ?? ''"
          size="small"
          style="width: 100%"
          clearable
          placeholder="选择要复制值的字段"
          @update:model-value="updateLinkage(idx, 'valueSource', $event || undefined)"
        >
          <el-option
            v-for="opt in fieldOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>

      <!-- reset-fields specific: target fields -->
      <div v-if="linkage.type === 'reset-fields'" :class="styles['linkage-config__field']">
        <label :class="styles['linkage-config__label']">目标字段 (要重置的字段)</label>
        <el-select
          :model-value="linkage.targetFields ?? []"
          size="small"
          multiple
          filterable
          style="width: 100%"
          placeholder="选择要重置的字段"
          @update:model-value="updateLinkage(idx, 'targetFields', $event as string[])"
        >
          <el-option
            v-for="opt in fieldOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>

      <!-- elseValue -->
      <div :class="styles['linkage-config__field']">
        <label :class="styles['linkage-config__label']">否则赋值</label>
        <el-input
          :model-value="String(linkage.elseValue ?? '')"
          size="small"
          placeholder="条件为 false 时的回退值"
          @update:model-value="updateLinkage(idx, 'elseValue', $event)"
        />
      </div>
    </div>

    <el-button
      type="primary"
      plain
      size="small"
      style="width: 100%; margin-top: 8px"
      @click="addLinkage"
    >
      <AppIcon name="plus" />
      添加联动规则
    </el-button>
  </div>
</template>
