<script setup lang="ts">
import SubPageLayout from '@/components/SubPageLayout.vue'
</script>

<template>
  <SubPageLayout title="流程引擎">
    <micro-app
      name="flow"
      :url="'http://localhost:5174/flow/'"
      :data="{ token: localStorage.getItem('token') }"
      style="width: 100%; height: calc(100vh - 56px); border: none"
    />
  </SubPageLayout>
</template>
