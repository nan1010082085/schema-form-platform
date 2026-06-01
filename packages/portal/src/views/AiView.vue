<script setup lang="ts">
import { getAppUrl } from '@schema-form/micro-app/config'

const url = getAppUrl('ai', import.meta.env.DEV)
</script>

<template>
  <micro-app
    name="ai"
    :url="url"
    :data="{}"
    iframe
    style="width: 100%; height: 100%; border: none; display: block"
  />
</template>
