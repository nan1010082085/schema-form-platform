<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
  <!-- 扩展微应用挂载点（由 main.ts 中 qiankun.registerMicroApps 引用） -->
  <div id="micro-app-container"></div>
</template>
