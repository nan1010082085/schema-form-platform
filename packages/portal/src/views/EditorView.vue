<script setup lang="ts">
import SubPageLayout from '@/components/SubPageLayout.vue'
</script>

<template>
  <SubPageLayout title="表单编辑器">
    <micro-app
      name="editor"
      :url="'http://localhost:5173/editor/'"
      :data="{ token: localStorage.getItem('token') }"
      style="width: 100%; height: calc(100vh - 56px); border: none"
    />
  </SubPageLayout>
</template>
