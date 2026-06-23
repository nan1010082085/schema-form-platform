<script setup lang="ts">
/**
 * ActionButtonsEditor -- 工具栏按钮编辑器
 *
 * 配置按钮列表，每个按钮可独立设置事件链（包含 API 调用、设置变量、路由跳转等 18 种动作）
 * 按钮支持 visibleCondition 控制显示时机（如 selectedRows.length > 0）
 */
import { ref } from 'vue'
import type { ActionButton, ButtonEventConfig } from '@/widgets/advanced-table/config'
import type { SchemaEventAction } from '@/widgets/base/types'
import AppIcon from '@schema-form/platform-shared/components/common/AppIcon.vue'
import ActionListEditor from '@/components/Editor/ActionListEditor.vue'
import type { ActionTypeOption } from '@/components/Editor/ActionListEditor.vue'

const props = defineProps<{
  buttons: ActionButton[]
}>()

const emit = defineEmits<{
  'update:buttons': [buttons: ActionButton[]]
}>()

const buttonTypeOptions = [
  { label: '默认', value: '' },
  { label: '主要', value: 'primary' },
  { label: '成功', value: 'success' },
  { label: '警告', value: 'warning' },
  { label: '危险', value: 'danger' },
  { label: '信息', value: 'info' },
  { label: '文字', value: 'text' },
]

const actionTypeOptions: ActionTypeOption[] = [
  { label: '显示', value: 'show' },
  { label: '隐藏', value: 'hide' },
  { label: '打开弹窗', value: 'open-dialog' },
  { label: '关闭弹窗', value: 'close-dialog' },
  { label: '切换标签', value: 'switch-tab' },
  { label: '设置值', value: 'set-value' },
  { label: '提交表单', value: 'submit' },
  { label: '重置表单', value: 'reset' },
  { label: '触发事件', value: 'emit' },
  { label: '触发组件事件', value: 'trigger-event' },
  { label: '设置变量', value: 'set-variable' },
  { label: '调用 API', value: 'api' },
  { label: '路由跳转', value: 'navigate' },
  { label: '发送消息', value: 'post-message' },
  { label: '复制文本', value: 'copy' },
  { label: '刷新数据', value: 'refresh' },
  { label: '关闭页签', value: 'close-tab' },
  { label: '发起流程', value: 'startFlow' },
  { label: '结束流程', value: 'endFlow' },
]

// ---- CRUD ----

function addButton() {
  const btn: ActionButton = {
    key: `btn${props.buttons.length + 1}`,
    label: '按钮',
    type: 'default',
  }
  emit('update:buttons', [...props.buttons, btn])
}

function removeButton(index: number) {
  emit('update:buttons', props.buttons.filter((_, i) => i !== index))
}

function updateButton<K extends keyof ActionButton>(index: number, field: K, value: ActionButton[K]) {
  const updated = props.buttons.map((btn, i) =>
    i === index ? { ...btn, [field]: value } : btn,
  )
  emit('update:buttons', updated)
}

// ---- Events ----

function updateButtonEvents(index: number, actions: SchemaEventAction[]) {
  const events: ButtonEventConfig[] = actions.length
    ? [{ trigger: 'click', actions }]
    : []
  updateButton(index, 'events', events)
}

// ---- Expand state ----

const expandedEvents = ref<number>(-1)

function toggleEvents(index: number) {
  expandedEvents.value = expandedEvents.value === index ? -1 : index
}
</script>

<template>
  <div class="action-buttons-editor">
    <div v-if="buttons.length === 0" class="action-buttons-editor__empty">
      暂无按钮，点击下方添加。
    </div>

    <div
      v-for="(btn, idx) in buttons"
      :key="idx"
      class="action-buttons-editor__item"
    >
      <!-- Header -->
      <div class="action-buttons-editor__item-header">
        <span class="action-buttons-editor__item-title">{{ btn.label || btn.key }}</span>
        <el-button type="danger" size="small" text @click="removeButton(idx)">
          <AppIcon name="delete" />
        </el-button>
      </div>

      <!-- Basic fields -->
      <div class="action-buttons-editor__row">
        <div class="action-buttons-editor__field">
          <label class="action-buttons-editor__label">key</label>
          <el-input :model-value="btn.key" size="small" @update:model-value="(v: string) => updateButton(idx, 'key', v)" />
        </div>
        <div class="action-buttons-editor__field">
          <label class="action-buttons-editor__label">文字</label>
          <el-input :model-value="btn.label" size="small" @update:model-value="(v: string) => updateButton(idx, 'label', v)" />
        </div>
      </div>

      <div class="action-buttons-editor__row">
        <div class="action-buttons-editor__field">
          <label class="action-buttons-editor__label">类型</label>
          <el-select :model-value="btn.type || ''" size="small" style="width:100%" @update:model-value="(v: string) => updateButton(idx, 'type', v)">
            <el-option v-for="opt in buttonTypeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </div>
        <div class="action-buttons-editor__field">
          <label class="action-buttons-editor__label">图标</label>
          <el-input :model-value="btn.icon ?? ''" size="small" placeholder="图标名" @update:model-value="(v: string) => updateButton(idx, 'icon', v || undefined)" />
        </div>
      </div>

      <div class="action-buttons-editor__field">
        <label class="action-buttons-editor__label">显示条件</label>
        <el-input
          :model-value="btn.visibleCondition ?? ''"
          size="small"
          placeholder="如: selectedRows.length > 0"
          @update:model-value="(v: string) => updateButton(idx, 'visibleCondition', v || undefined)"
        />
      </div>

      <div class="action-buttons-editor__field">
        <label class="action-buttons-editor__label">确认提示</label>
        <el-input
          :model-value="btn.confirm ?? ''"
          size="small"
          placeholder="可选，点击后弹出确认"
          @update:model-value="(v: string) => updateButton(idx, 'confirm', v || undefined)"
        />
      </div>

      <!-- Events toggle -->
      <div class="action-buttons-editor__events-toggle" @click="toggleEvents(idx)">
        <AppIcon :name="expandedEvents === idx ? 'arrow-down' : 'arrow-right'" />
        <span>事件配置 ({{ btn.events?.length || 0 }} 个事件)</span>
      </div>

      <!-- Events editor -->
      <div v-if="expandedEvents === idx" class="action-buttons-editor__events">
        <div v-if="!btn.events?.length" class="action-buttons-editor__events-hint">
          暂无事件。点击下方添加动作，支持 API 调用、设置变量、路由跳转等 18 种动作。
        </div>
        <ActionListEditor
          :actions="btn.events?.[0]?.actions ?? []"
          :action-types="actionTypeOptions"
          @update:actions="(actions) => updateButtonEvents(idx, actions)"
        />
      </div>
    </div>

    <el-button type="primary" size="small" plain style="width:100%;margin-top:8px" @click="addButton">
      <AppIcon name="plus" /> 添加按钮
    </el-button>
  </div>
</template>

<style scoped lang="scss">
.action-buttons-editor {
  &__empty {
    text-align: center;
    color: #909399;
    font-size: 12px;
    padding: 12px 0;
  }

  &__item {
    border: 1px solid #ebeef5;
    border-radius: 4px;
    padding: 10px;
    margin-bottom: 10px;
    background: #fafafa;
  }

  &__item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  &__item-title {
    font-size: 12px;
    font-weight: 600;
    color: #303133;
  }

  &__row {
    display: flex;
    gap: 8px;
    > * { flex: 1; }
  }

  &__field {
    margin-bottom: 8px;
    &:last-child { margin-bottom: 0; }
  }

  &__label {
    display: block;
    font-size: 11px;
    font-weight: 500;
    color: #606266;
    margin-bottom: 3px;
  }

  &__events-toggle {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: #409eff;
    cursor: pointer;
    margin-top: 4px;
    user-select: none;
  }

  &__events {
    margin-top: 6px;
    padding: 6px;
    border: 1px solid #e4e7ed;
    border-radius: 4px;
    background: #fff;
  }

  &__events-hint {
    text-align: center;
    color: #c0c4cc;
    font-size: 11px;
    padding: 8px 0;
  }
}
</style>
