<script setup lang="ts">
import { getAppUrl } from '@schema-form/micro-app/config'

const url = getAppUrl('editor', import.meta.env.DEV)
</script>

<template>
  <micro-app
    name="editor"
    :url="url"
    :data="{}"
    destroy
    iframe
    style="width: 100%; height: 100%; border: none; display: block"
  />
</template>
