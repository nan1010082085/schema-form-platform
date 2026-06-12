<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { flowApi } from '../api/flowApi.js'
import styles from './SubProcessSelector.module.scss'
import type { FlowDefinitionData } from '@schema-form/flow-shared'

const props = withDefaults(defineProps<{
  modelValue?: string
  /** 排除当前流程自身，避免循环引用 */
  excludeId?: string
}>(), {
  modelValue: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'confirm': [flow: FlowDefinitionData]
}>()

const visible = ref(false)
const flowList = ref<FlowDefinitionData[]>([])
const loading = ref(false)
const searchQuery = ref('')
const selectedId = ref(props.modelValue)

watch(() => props.modelValue, (val) => {
  selectedId.value = val
})

const filteredFlows = computed(() => {
  let list = flowList.value
  if (props.excludeId) {
    list = list.filter(f => f.id !== props.excludeId)
  }
  if (!searchQuery.value) return list
  const q = searchQuery.value.toLowerCase()
  return list.filter(
    f => f.name.toLowerCase().includes(q) || (f.description ?? '').toLowerCase().includes(q),
  )
})

const selectedFlow = computed(() =>
  flowList.value.find(f => f.id === selectedId.value) ?? null,
)

const STATUS_LABELS: Record<string, string> = {
  published: '已发布',
  draft: '草稿',
  archived: '已归档',
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

async function loadFlows() {
  loading.value = true
  try {
    const res = await flowApi.listFlows({ status: 'published', pageSize: 200 })
    flowList.value = res.items
  } finally {
    loading.value = false
  }
}

function open() {
  visible.value = true
  selectedId.value = props.modelValue
  if (flowList.value.length === 0) {
    loadFlows()
  }
}

function onSelect(flow: FlowDefinitionData) {
  selectedId.value = flow.id
}

function onConfirm() {
  if (!selectedFlow.value) return
  emit('update:modelValue', selectedFlow.value.id)
  emit('confirm', selectedFlow.value)
  visible.value = false
}

function onCancel() {
  visible.value = false
}

defineExpose({ open })
</script>

<template>
  <el-dialog
    v-model="visible"
    title="选择子流程"
    width="600px"
    :close-on-click-modal="false"
    destroy-on-close
    @close="onCancel"
  >
    <!-- 搜索栏 -->
    <div :class="styles.toolbar">
      <el-input
        v-model="searchQuery"
        placeholder="搜索流程名称或描述"
        clearable
        :prefix-icon="Search"
        :class="styles.searchInput"
      />
      <el-button :icon="Search" @click="loadFlows" :loading="loading">刷新</el-button>
    </div>

    <!-- 流程列表 -->
    <div v-loading="loading" :class="styles.list">
      <div v-if="filteredFlows.length === 0 && !loading" :class="styles.empty">
        暂无可选流程
      </div>
      <div
        v-for="flow in filteredFlows"
        :key="flow.id"
        :class="[styles.item, selectedId === flow.id && styles.itemActive]"
        @click="onSelect(flow)"
      >
        <div :class="styles.itemMain">
          <span :class="styles.itemName">{{ flow.name }}</span>
          <span :class="[styles.statusTag, styles[`status-${flow.status}`]]">
            {{ statusLabel(flow.status) }}
          </span>
        </div>
        <div v-if="flow.description" :class="styles.itemDesc">{{ flow.description }}</div>
        <div v-if="flow.category" :class="styles.itemMeta">
          <span :class="styles.metaLabel">分类</span>
          <span>{{ flow.category }}</span>
        </div>
      </div>
    </div>

    <!-- 底部 -->
    <template #footer>
      <div :class="styles.footer">
        <span v-if="selectedFlow" :class="styles.footerHint">
          已选: {{ selectedFlow.name }}
        </span>
        <span v-else :class="styles.footerHint">请选择一个流程</span>
        <div :class="styles.footerActions">
          <el-button @click="onCancel">取消</el-button>
          <el-button type="primary" :disabled="!selectedFlow" @click="onConfirm">确认</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>
