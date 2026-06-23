<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { Node } from '@vue-flow/core'
import SectionToggle from './SectionToggle.vue'
import FieldRow from './FieldRow.vue'
import HintText from './HintText.vue'
import SubProcessSelector from '../SubProcessSelector.vue'
import { flowApi } from '../../api/flowApi'
import styles from './SubProcessPanel.module.scss'
import type { FlowDefinitionData } from '@schema-form/flow-shared'
import AppIcon from '@schema-form/platform-shared/components/common/AppIcon.vue'

const props = defineProps<{ node: Node }>()
const emit = defineEmits<{ updateNodeData: [key: string, value: unknown] }>()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

/* --- Published flow list --- */

const flowList = ref<FlowDefinitionData[]>([])
const flowLoading = ref(false)
const flowSearch = ref('')

onMounted(async () => {
  flowLoading.value = true
  try {
    const res = await flowApi.listFlows({ status: 'published', pageSize: 200 })
    flowList.value = res.items
  } catch {
    // dropdown stays empty
  } finally {
    flowLoading.value = false
  }
})

const filteredFlows = computed(() => {
  if (!flowSearch.value) return flowList.value
  const q = flowSearch.value.toLowerCase()
  return flowList.value.filter(
    (f) => f.name.toLowerCase().includes(q) || (f.description ?? '').toLowerCase().includes(q),
  )
})

const selectedFlowId = computed(() => (props.node.data?.subProcessDefinitionId as string) ?? '')

const selectedFlow = computed(() => flowList.value.find((f) => f.id === selectedFlowId.value) ?? null)

function onFlowSelect(definitionId: string) {
  update('subProcessDefinitionId', definitionId)
}

/* --- SubProcess Selector dialog --- */

const selectorRef = ref<InstanceType<typeof SubProcessSelector>>()

function openSelector() {
  selectorRef.value?.open()
}

function onSelectorConfirm(flow: FlowDefinitionData) {
  update('subProcessDefinitionId', flow.id)
}

/* --- Mapping mode toggle --- */

type MappingMode = 'kv' | 'json'

const mappingMode = ref<MappingMode>('kv')

/* --- Input mapping --- */

interface MappingEntry {
  key: string
  value: string
}

function parseMappingToEntries(raw: unknown): MappingEntry[] {
  if (!raw) return []
  const obj = typeof raw === 'string' ? (() => { try { return JSON.parse(raw) } catch { return null } })() : raw
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return []
  return Object.entries(obj).map(([key, value]) => ({ key, value: String(value) }))
}

function entriesToMapping(entries: MappingEntry[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const e of entries) {
    if (e.key.trim()) result[e.key.trim()] = e.value
  }
  return result
}

const inputEntries = ref<MappingEntry[]>(parseMappingToEntries(props.node.data?.inputMapping))

watch(
  () => props.node.data?.inputMapping,
  (val) => {
    const parsed = parseMappingToEntries(val)
    if (JSON.stringify(parsed) !== JSON.stringify(inputEntries.value)) {
      inputEntries.value = parsed
    }
  },
)

function addInputEntry() {
  inputEntries.value = [...inputEntries.value, { key: '', value: '' }]
  syncInputMapping()
}

function removeInputEntry(index: number) {
  inputEntries.value = inputEntries.value.filter((_, i) => i !== index)
  syncInputMapping()
}

function updateInputKey(index: number, key: string) {
  inputEntries.value[index] = { ...inputEntries.value[index], key }
  syncInputMapping()
}

function updateInputValue(index: number, value: string) {
  inputEntries.value[index] = { ...inputEntries.value[index], value }
  syncInputMapping()
}

function syncInputMapping() {
  update('inputMapping', entriesToMapping(inputEntries.value))
}

/* --- Output mapping --- */

const outputEntries = ref<MappingEntry[]>(parseMappingToEntries(props.node.data?.outputMapping))

watch(
  () => props.node.data?.outputMapping,
  (val) => {
    const parsed = parseMappingToEntries(val)
    if (JSON.stringify(parsed) !== JSON.stringify(outputEntries.value)) {
      outputEntries.value = parsed
    }
  },
)

function addOutputEntry() {
  outputEntries.value = [...outputEntries.value, { key: '', value: '' }]
  syncOutputMapping()
}

function removeOutputEntry(index: number) {
  outputEntries.value = outputEntries.value.filter((_, i) => i !== index)
  syncOutputMapping()
}

function updateOutputKey(index: number, key: string) {
  outputEntries.value[index] = { ...outputEntries.value[index], key }
  syncOutputMapping()
}

function updateOutputValue(index: number, value: string) {
  outputEntries.value[index] = { ...outputEntries.value[index], value }
  syncOutputMapping()
}

function syncOutputMapping() {
  update('outputMapping', entriesToMapping(outputEntries.value))
}

/* --- JSON mode raw values --- */

const inputMappingJson = computed(() => {
  const m = props.node.data?.inputMapping
  if (!m) return '{}'
  if (typeof m === 'string') return m
  try { return JSON.stringify(m, null, 2) } catch { return '{}' }
})

const outputMappingJson = computed(() => {
  const m = props.node.data?.outputMapping
  if (!m) return '{}'
  if (typeof m === 'string') return m
  try { return JSON.stringify(m, null, 2) } catch { return '{}' }
})

function parseJsonOrEmpty(val: string): unknown {
  try { return JSON.parse(val) } catch { return {} }
}

function onMappingModeChange(mode: MappingMode) {
  mappingMode.value = mode
  if (mode === 'kv') {
    // Switching from JSON to KV: re-parse current values
    inputEntries.value = parseMappingToEntries(props.node.data?.inputMapping)
    outputEntries.value = parseMappingToEntries(props.node.data?.outputMapping)
  }
}

/* --- Status display --- */

const STATUS_LABELS: Record<string, string> = {
  published: '已发布',
  draft: '草稿',
  archived: '已归档',
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}
</script>

<template>
  <!-- 子流程选择器弹窗 -->
  <SubProcessSelector
    ref="selectorRef"
    :model-value="selectedFlowId"
    @confirm="onSelectorConfirm"
  />

  <!-- 子流程选择 -->
  <SectionToggle title="子流程配置" :count="2">
    <FieldRow label="选择子流程">
      <div :class="styles['flow-select-row']">
        <el-select
          :model-value="selectedFlowId"
          filterable
          :loading="flowLoading"
          placeholder="搜索并选择已发布的流程"
          clearable
          :class="styles['flow-select']"
          @change="onFlowSelect"
          @input="(q: string) => { flowSearch = q }"
        >
          <el-option
            v-for="flow in filteredFlows"
            :key="flow.id"
            :label="flow.name"
            :value="flow.id"
          >
            <span>{{ flow.name }}</span>
            <span v-if="flow.description" :class="styles['option-desc']">
              {{ flow.description }}
            </span>
          </el-option>
        </el-select>
        <el-button size="small" @click="openSelector">浏览</el-button>
      </div>
    </FieldRow>

    <template v-if="selectedFlow">
      <div :class="styles['flow-detail']">
        <div :class="styles['flow-detail-row']">
          <span :class="styles['flow-detail-label']">名称</span>
          <span :class="styles['flow-detail-value']">{{ selectedFlow.name }}</span>
        </div>
        <div v-if="selectedFlow.description" :class="styles['flow-detail-row']">
          <span :class="styles['flow-detail-label']">说明</span>
          <span :class="styles['flow-detail-value']">{{ selectedFlow.description }}</span>
        </div>
        <div :class="styles['flow-detail-row']">
          <span :class="styles['flow-detail-label']">状态</span>
          <span :class="[styles['status-tag'], styles[`status-${selectedFlow.status}`]]">
            {{ statusLabel(selectedFlow.status) }}
          </span>
        </div>
        <div v-if="selectedFlow.category" :class="styles['flow-detail-row']">
          <span :class="styles['flow-detail-label']">分类</span>
          <span :class="styles['flow-detail-value']">{{ selectedFlow.category }}</span>
        </div>
      </div>
    </template>

    <HintText v-else>选择一个已发布的流程作为子流程，子流程将在运行时被动态调用。</HintText>
  </SectionToggle>

  <!-- 参数映射 -->
  <SectionToggle title="参数映射">
    <div :class="styles['mapping-header']">
      <el-radio-group
        :model-value="mappingMode"
        size="small"
        :class="styles['mapping-mode-switch']"
        @change="onMappingModeChange"
      >
        <el-radio-button value="kv">键值对</el-radio-button>
        <el-radio-button value="json">JSON</el-radio-button>
      </el-radio-group>
    </div>

    <!-- KV mode -->
    <template v-if="mappingMode === 'kv'">
      <FieldRow label="输入变量映射">
        <div :class="styles['mapping-section']">
          <div
            v-for="(entry, i) in inputEntries"
            :key="i"
            :class="styles['mapping-row']"
          >
            <el-input
              :model-value="entry.key"
              placeholder="子流程变量"
              size="small"
              :class="styles['mapping-key']"
              @input="updateInputKey(i, $event)"
            />
            <el-input
              :model-value="entry.value"
              placeholder="${parentVar}"
              size="small"
              :class="styles['mapping-value']"
              @input="updateInputValue(i, $event)"
            />
            <AppIcon name="delete" :class="styles['mapping-remove']" @click="removeInputEntry(i)" />
          </div>
          <el-button
            :class="styles['mapping-add']"
            size="small"
            link
            type="primary"
            @click="addInputEntry"
          >
            <AppIcon name="plus" />
            添加映射
          </el-button>
        </div>
      </FieldRow>

      <FieldRow label="输出变量映射">
        <div :class="styles['mapping-section']">
          <div
            v-for="(entry, i) in outputEntries"
            :key="i"
            :class="styles['mapping-row']"
          >
            <el-input
              :model-value="entry.key"
              placeholder="父流程变量"
              size="small"
              :class="styles['mapping-key']"
              @input="updateOutputKey(i, $event)"
            />
            <el-input
              :model-value="entry.value"
              placeholder="${childOutput}"
              size="small"
              :class="styles['mapping-value']"
              @input="updateOutputValue(i, $event)"
            />
            <AppIcon name="delete" :class="styles['mapping-remove']" @click="removeOutputEntry(i)" />
          </div>
          <el-button
            :class="styles['mapping-add']"
            size="small"
            link
            type="primary"
            @click="addOutputEntry"
          >
            <AppIcon name="plus" />
            添加映射
          </el-button>
        </div>
      </FieldRow>
    </template>

    <!-- JSON mode -->
    <template v-else>
      <FieldRow label="输入变量映射" textarea>
        <el-input
          type="textarea"
          :model-value="inputMappingJson"
          :rows="3"
          placeholder='{"childVar": "${parentVar}"}'
          :class="styles['mapping-json']"
          @input="update('inputMapping', parseJsonOrEmpty($event))"
        />
      </FieldRow>

      <FieldRow label="输出变量映射" textarea>
        <el-input
          type="textarea"
          :model-value="outputMappingJson"
          :rows="3"
          placeholder='{"parentResult": "${childOutput}"}'
          :class="styles['mapping-json']"
          @input="update('outputMapping', parseJsonOrEmpty($event))"
        />
      </FieldRow>
    </template>

    <HintText>输入映射将父流程变量传入子流程；输出映射将子流程结果传回父流程。支持 <code>${variable}</code> 表达式。</HintText>
  </SectionToggle>
</template>
