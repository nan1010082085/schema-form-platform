<template>
  <div :class="$style.toolbar">
    <div :class="$style.left">
      <button :class="$style.btn" title="保存" @click="$emit('save')">保存</button>
      <button :class="$style.btn" title="撤销" @click="$emit('undo')">撤销</button>
      <button :class="$style.btn" title="重做" @click="$emit('redo')">重做</button>
    </div>
    <div :class="$style.center">
      <span :class="$style.title">{{ title || '流程设计器' }}</span>
    </div>
    <div :class="$style.right">
      <button :class="$style.btn" title="导出 BPMN" @click="$emit('export-bpmn')">导出 BPMN</button>
      <button :class="$style.btn" title="导入 BPMN" @click="$emit('import-bpmn')">导入 BPMN</button>
      <button :class="$style.btn" title="校验" @click="$emit('validate')">校验</button>
      <button :class="$style.btn" title="发布" @click="$emit('publish')">发布</button>
      <button :class="$style.btn" title="设置" @click="$emit('settings')">设置</button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
}>()

defineEmits<{
  save: []
  undo: []
  redo: []
  validate: []
  publish: []
  'export-bpmn': []
  'import-bpmn': []
  settings: []
}>()
</script>

<style module>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
}

.left,
.right {
  display: flex;
  gap: 8px;
}

.center {
  display: flex;
  align-items: center;
}

.title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.btn {
  padding: 4px 12px;
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  color: #606266;
  transition: all 0.2s;
}

.btn:hover {
  border-color: #409eff;
  color: #409eff;
}
</style>
