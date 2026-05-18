<script setup lang="ts">
/**
 * FgSchemaButtonList — Schema 驱动的按钮列表
 * 支持 action 联动：emit / dialog / upload / submit / reset / navigate / api / validate
 */
import { inject } from 'vue'
import { useRouter } from 'vue-router'
import FgButtonList from './FgButtonList.vue'
import { executeActions, type ActionContext } from '@/utils/actionExecutor'
import { ACTION_EMIT_KEY, FORM_GRID_API_KEY } from '../../types'
import type { SchemaButtonConfig, FormData } from '../../types'

defineProps<{
  buttons?: SchemaButtonConfig[]
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
    // 无 action 配置时，emit 默认 click 事件
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
  <FgButtonList
    :buttons="(buttons ?? []).map(toButtonConfig)"
    @click="(_btn, idx) => handleButtonClick((buttons ?? [])[idx])"
  />
</template>
