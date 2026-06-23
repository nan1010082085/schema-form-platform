<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import '@schema-form/shared-styles/css-variables.scss'
import { useAppStore } from '@/stores/app'
import { fetchCurrentUser } from '@/utils/apiClient'

const appStore = useAppStore()

onMounted(async () => {
  try {
    const user = await fetchCurrentUser()
    appStore.userContext.id = user.id
    appStore.userContext.name = user.displayName || user.username
    appStore.userContext.roles = user.roles ?? []
    appStore.userContext.permissions = user.permissions ?? []
    appStore.userContext.deptId = user.deptId ?? ''
  } catch {
    // 静默失败：路由守卫已处理未登录跳转，此处仅填充 userContext
  }
})
</script>

<template>
  <ElConfigProvider
    :locale="zhCn"
    :size="'default'"
    :z-index="2000"
  >
    <RouterView />
  </ElConfigProvider>
</template>
