<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
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
  <el-config-provider :locale="zhCn" size="default">
    <RouterView />
  </el-config-provider>
</template>

<style>
html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
}

#app {
  height: 100%;
}
</style>
