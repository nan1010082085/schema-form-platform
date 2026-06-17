<script setup lang="ts">
/**
 * Breadcrumb -- route-based breadcrumb
 *
 * Generates breadcrumb items from the current route's matched array.
 * Uses route.meta.title for display text.
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import styles from './Breadcrumb.module.scss'

interface BreadcrumbItem {
  title: string
  path: string
  isLast: boolean
}

const route = useRoute()
const router = useRouter()

const items = computed<BreadcrumbItem[]>(() => {
  const matched = route.matched.filter(r => r.meta?.title)
  return matched.map((r, i) => ({
    title: (r.meta.title as string) ?? '',
    path: r.path,
    isLast: i === matched.length - 1,
  }))
})

function handleClick(item: BreadcrumbItem): void {
  if (!item.isLast && item.path) {
    router.push(item.path)
  }
}
</script>

<template>
  <nav :class="styles.breadcrumb" aria-label="Breadcrumb">
    <span
      v-for="(item, index) in items"
      :key="index"
      :class="[styles.item, { [styles.itemActive]: item.isLast }]"
      @click="handleClick(item)"
    >
      {{ item.title }}
    </span>
    <span v-if="items.length === 0" :class="styles.itemActive">首页</span>
  </nav>
</template>
