<script setup lang="ts">
/**
 * FgButtonList — 动态按钮列表
 * 根据配置数组渲染按钮组，统一大小由全局样式控制
 */
interface ButtonConfig {
  name: string
  type?: '' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  icon?: string
  disabled?: boolean
  loading?: boolean
}

defineProps<{
  buttons: ButtonConfig[]
}>()

const emit = defineEmits<{
  'click': [btn: ButtonConfig, index: number]
}>()
</script>

<template>
  <div class="fg-button-list">
    <slot name="prefix" />
    <el-button
      v-for="(btn, idx) in buttons"
      :key="idx"
      :type="btn.type ?? 'primary'"
      :icon="btn.icon"
      :disabled="btn.disabled"
      :loading="btn.loading"
      @click="emit('click', btn, idx)"
    >
      {{ btn.name }}
    </el-button>
    <slot name="suffix" />
  </div>
</template>

<style lang="scss" scoped>
.fg-button-list {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
</style>
