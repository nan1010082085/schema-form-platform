/**
 * 动态布局容器
 *
 * 根据用户的布局偏好自动切换侧边栏布局或顶部导航布局
 */

<script setup lang="ts">
import { computed } from 'vue'
import { useLayoutStore } from '@schema-form/shared-stores/layout'
import ClassicSidebarLayout from './ClassicSidebarLayout.vue'
import TopNavLayout from './TopNavLayout.vue'

const layoutStore = useLayoutStore()

const currentLayout = computed(() => {
  return layoutStore.isSidebar ? ClassicSidebarLayout : TopNavLayout
})
</script>

<template>
  <component :is="currentLayout" :key="layoutStore.style" />
</template>
