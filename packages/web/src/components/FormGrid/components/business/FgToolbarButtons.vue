<script setup lang="ts">
/**
 * FgToolbarButtons — 居中对齐的工具栏按钮组
 * 支持动态背景色，用于页面顶部操作区
 */
import { inject } from 'vue'
import { useRouter } from 'vue-router'
import FgButtonList from './FgButtonList.vue'
import { executeActions, type ActionContext } from '@/utils/actionExecutor'
import { ACTION_EMIT_KEY, FORM_GRID_API_KEY } from '../../types'
import type { SchemaButtonConfig, FormData } from '../../types'

defineProps<{
  buttons?: SchemaButtonConfig[]
  background?: string
}>()

const emitAction = inject(ACTION_EMIT_KEY, () => {})
const formApi = inject(FORM_GRID_API_KEY, {
  validate: async () => true,
  validateField: async () => true,
  getFormData: () => ({} as FormData),
  resetFields: () => {},
})

const router = useRouter()

function handleButtonClick(btn: SchemaButtonConfig) {
  if (!btn.actions || btn.actions.length === 0) {
    emitAction('action', { type: 'emit', eventName: 'click', eventPayload: btn as unknown })
    return
  }

  const actionContext: ActionContext = {
    emit: emitAction,
    validate: formApi.validate,
    getFormData: formApi.getFormData,
    resetFields: formApi.resetFields,
    router,
    openDialog: (config) => emitAction('open-dialog', config),
    triggerUpload: () => emitAction('action', { type: 'upload' }),
  }

  executeActions(btn.actions, actionContext)
}

function toButtonConfig(btn: SchemaButtonConfig) {
  return {
    name: btn.text,
    type: btn.buttonType ?? 'primary',
    icon: btn.icon,
    disabled: btn.disabled,
    loading: btn.loading,
  }
}
</script>

<template>
  <div
    class="fg-toolbar-buttons"
    :style="background ? { background } : undefined"
  >
    <FgButtonList
      :buttons="(buttons ?? []).map(toButtonConfig)"
      @click="(_btn, idx) => handleButtonClick((buttons ?? [])[idx])"
    />
  </div>
</template>

<style lang="scss" scoped>
.fg-toolbar-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 16px;
  background: #EEF5FF;
  border-radius: 4px;
}
</style>
