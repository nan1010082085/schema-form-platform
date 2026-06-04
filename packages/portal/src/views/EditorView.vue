<script setup lang="ts">
import { computed } from 'vue'
import { getAppUrl } from '@schema-form/micro-app/config'
import MicroAppLoader from '@/components/MicroAppLoader.vue'

const config = computed(() => ({
  name: 'editor',
  url: getAppUrl('editor', import.meta.env.DEV),
}))
</script>

<template>
  <MicroAppLoader :config="config" />
</template>
