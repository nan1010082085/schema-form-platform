<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getAppUrl } from '@schema-form/micro-app/config'
import MicroAppLoader from '@/components/MicroAppLoader.vue'

const route = useRoute()

const config = computed(() => {
  const conversationId = route.query.conversationId as string | undefined
  return {
    name: 'ai',
    url: getAppUrl('ai', import.meta.env.DEV),
    data: conversationId ? { conversationId } : {},
  }
})
</script>

<template>
  <MicroAppLoader :config="config" />
</template>
