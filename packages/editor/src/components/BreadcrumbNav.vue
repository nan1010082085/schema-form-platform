<script setup lang="ts">
/**
 * BreadcrumbNav — 面包屑导航
 *
 * 根据当前路由自动生成面包屑路径。
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import styles from './BreadcrumbNav.module.scss'

const route = useRoute()
const router = useRouter()

interface BreadcrumbItem {
  label: string
  path?: string
}

const routeLabelMap: Record<string, string> = {
  instances: '实例管理',
  'widget-templates': '模板库',
  submissions: '表单提交数据',
  credentials: '凭证管理',
}

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
  const items: BreadcrumbItem[] = [{ label: '首页', path: '/instances' }]

  const routeName = route.name as string | undefined
  if (routeName && routeLabelMap[routeName]) {
    const isHome = routeName === 'instances'
    if (!isHome) {
      items.push({ label: routeLabelMap[routeName] })
    }
  }

  return items
})

function handleClick(item: BreadcrumbItem) {
  if (item.path) {
    router.push(item.path)
  }
}
</script>

<template>
  <nav v-if="breadcrumbs.length > 1" :class="styles.breadcrumb">
    <template v-for="(item, index) in breadcrumbs" :key="index">
      <span v-if="index > 0" :class="styles.separator">/</span>
      <span
        v-if="item.path && index < breadcrumbs.length - 1"
        :class="styles.item"
        @click="handleClick(item)"
      >{{ item.label }}</span>
      <span v-else :class="styles.current">{{ item.label }}</span>
    </template>
  </nav>
</template>
