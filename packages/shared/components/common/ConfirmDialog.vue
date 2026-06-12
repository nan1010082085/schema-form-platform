<template>
  <AppDialog
    :model-value="modelValue"
    :title="title"
    :width="width"
    :loading="loading"
    @update:model-value="$emit('update:modelValue', $event)"
    @confirm="handleConfirm"
  >
    <div :class="$style.content">
      <el-icon v-if="type === 'warning'" :class="$style.icon" color="var(--el-color-warning)">
        <WarningFilled />
      </el-icon>
      <el-icon v-else-if="type === 'danger'" :class="$style.icon" color="var(--el-color-danger)">
        <CircleCloseFilled />
      </el-icon>
      <el-icon v-else :class="$style.icon" color="var(--el-color-primary)">
        <InfoFilled />
      </el-icon>
      <p :class="$style.message">{{ message }}</p>
    </div>
  </AppDialog>
</template>

<script setup lang="ts">
import { WarningFilled, CircleCloseFilled, InfoFilled } from '@element-plus/icons-vue'
import AppDialog from './AppDialog.vue'

withDefaults(defineProps<{
  modelValue: boolean
  title?: string
  width?: string
  loading?: boolean
  message: string
  type?: 'info' | 'warning' | 'danger'
}>(), {
  title: '确认操作',
  width: '400px',
  loading: false,
  type: 'warning',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()

function handleConfirm() {
  emit('confirm')
}
</script>

<style module>
.content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.icon {
  font-size: 24px;
  flex-shrink: 0;
}

.message {
  margin: 0;
  color: var(--el-text-color-regular);
  line-height: 1.6;
}
</style>
