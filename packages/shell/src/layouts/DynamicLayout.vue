<script setup lang="ts">
// DynamicLayout -- 动态布局容器
// 根据用户的布局偏好自动切换侧边栏布局或顶部导航布局
import { useLayoutStore } from '@schema-form/shared-stores/layout'
import ClassicSidebarLayout from './ClassicSidebarLayout.vue'
import TopNavLayout from './TopNavLayout.vue'

const layoutStore = useLayoutStore()
</script>

<template>
  <ClassicSidebarLayout v-if="layoutStore.isSidebar" />
  <TopNavLayout v-else />
</template>
