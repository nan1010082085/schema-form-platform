<script setup lang="ts">
/**
 * FgFormContainer — 工作流表单容器
 * 工具栏 + 内容区布局
 */
defineProps<{
  title?: string
  showToolbar?: boolean
}>()

const emit = defineEmits<{
  'save': []
  'submit': []
  'back': []
  'print': []
}>()
</script>

<template>
  <div class="fg-form-container">
    <!-- 工具栏 -->
    <div v-if="showToolbar !== false" class="fg-form-container__toolbar">
      <div class="fg-form-container__title">{{ title }}</div>
      <div class="fg-form-container__actions">
        <slot name="toolbar-actions">
          <el-button size="small" @click="emit('back')">返回</el-button>
          <el-button size="small" @click="emit('print')">打印</el-button>
          <el-button type="primary" size="small" @click="emit('save')">保存</el-button>
          <el-button type="primary" size="small" @click="emit('submit')">发送</el-button>
        </slot>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="fg-form-container__body">
      <slot />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.fg-form-container {
  min-height: 100vh;
  background: #f5f7fa;

  &__toolbar {
    min-height: 60px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 24px;
    background: #fff;
    border-bottom: 1px solid #d5dde3;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  &__title {
    font-size: 18px;
    font-weight: 500;
    color: #333;
  }

  &__actions {
    display: flex;
    gap: 8px;
  }

  &__body {
    padding: 16px;
  }
}
</style>
