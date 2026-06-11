<script setup lang="ts">
/**
 * WorkflowView — Workflow 子应用加载器
 */
import { computed } from 'vue'
import { getAppUrl } from '@schema-form/micro-app/config'
import MicroAppLoader from '@/components/MicroAppLoader.vue'

const config = computed(() => ({
  name: 'workflow',
  url: getAppUrl('workflow', import.meta.env.DEV),
}))
</script>

<template>
  <MicroAppLoader :config="config" />
</template>
