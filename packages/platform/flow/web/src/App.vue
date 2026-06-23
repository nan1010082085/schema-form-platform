<script setup lang="ts">
import { ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import '@schema-form/platform-shared/styles/css-variables.scss'
</script>

<template>
  <ElConfigProvider
    :locale="zhCn"
    :size="'default'"
    :z-index="2000"
  >
    <router-view />
  </ElConfigProvider>
</template>
