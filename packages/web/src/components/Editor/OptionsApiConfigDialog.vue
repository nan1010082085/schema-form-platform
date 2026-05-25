<script setup lang="ts">
/**
 * OptionsApiConfigDialog -- SchemaApiConfig 配置对话框
 *
 * 包装 ApiConfig.vue 组件，提供弹窗交互。
 * 用于 select / checkbox / radio 等需要动态选项数据源的组件。
 */
import { ref, watch } from 'vue'
import type { SchemaApiConfig } from '../../widgets/base/types'
import ApiConfig from './ApiConfig.vue'

import EnhancedDialog from '@/components/EnhancedDialog.vue'

const props = defineProps<{
  visible: boolean
  api: SchemaApiConfig | undefined
}>()

const emit = defineEmits<{
  'update:visible': [val: boolean]
  save: [api: SchemaApiConfig | undefined]
}>()

// ---- 本地编辑副本 ----

const localApi = ref<SchemaApiConfig | undefined>(undefined)

watch(
  () => props.visible,
  (open) => {
    if (open) {
      localApi.value = props.api ? JSON.parse(JSON.stringify(props.api)) : undefined
    }
  },
)

// ---- ApiConfig 事件处理 ----

const apiConfigRef = ref<InstanceType<typeof ApiConfig> | null>(null)

function handleApiUpdate(api: SchemaApiConfig | undefined) {
  localApi.value = api
}

function testConnection() {
  apiConfigRef.value?.testConnection()
}

function clearApi() {
  localApi.value = undefined
}

// ---- 保存 / 关闭 ----

function handleSave() {
  emit('save', localApi.value)
  emit('update:visible', false)
}

function handleClose() {
  emit('update:visible', false)
}
</script>

<template>
  <EnhancedDialog
    :model-value="visible"
    title="数据源配置"
    width="560px"
    @update:model-value="emit('update:visible', $event)"
  >
    <!-- 顶部操作栏：所有按钮一行排列 -->
    <div :class="$style.toolbar">
      <el-button @click="handleClose">取消</el-button>
      <el-button
        v-if="localApi"
        type="danger"
        plain
        @click="clearApi"
      >
        移除配置
      </el-button>
      <el-button
        v-if="localApi"
        type="primary"
        plain
        :loading="apiConfigRef?.testing"
        @click="testConnection"
      >
        测试连接
      </el-button>
      <el-button type="primary" @click="handleSave">保存</el-button>
    </div>

    <div :class="$style.body">
      <ApiConfig
        ref="apiConfigRef"
        :api="localApi"
        @update:api="handleApiUpdate"
      />
    </div>
  </EnhancedDialog>
</template>

<style module>
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f2f5;
  margin-bottom: 12px;
}

/* 统一表单控件高度 32px */
.toolbar :global(.el-button:not(.is-text):not(.is-link)) {
  height: 32px !important;
  min-height: 32px !important;
}

.body {
  max-height: 60vh;
  overflow-y: auto;
}

/* 统一表单控件高度 32px */
.body :global(.el-input__wrapper),
.body :global(.el-select .el-input__wrapper),
.body :global(.el-radio-group),
.body :global(.el-button:not(.is-text):not(.is-link)) {
  height: 32px !important;
  min-height: 32px !important;
}
</style>
