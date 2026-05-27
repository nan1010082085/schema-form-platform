<script setup lang="ts">
/**
 * OptionsApiConfigDialog -- SchemaApiConfig 配置对话框
 *
 * 900px 宽左右分栏，toolbar 移至底部。
 * ApiConfig 内部自渲染左右分栏（表单 + 测试面板），本组件只负责弹窗壳和底部操作栏。
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
function handleApiUpdate(api: SchemaApiConfig | undefined) {
  localApi.value = api
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
    width="900px"
    @update:model-value="emit('update:visible', $event)"
  >
    <div :class="$style.body">
      <ApiConfig
        :api="localApi"
        @update:api="handleApiUpdate"
        @remove-config="clearApi"
      />
    </div>

    <template #footer>
      <el-button size="small" @click="handleClose">取消</el-button>
      <el-button type="primary" size="small" @click="handleSave">保存</el-button>
    </template>
  </EnhancedDialog>
</template>

<style module>
.body {
  height: 60vh;
  overflow: hidden;
}
</style>
