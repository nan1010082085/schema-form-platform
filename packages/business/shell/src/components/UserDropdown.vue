<script setup lang="ts">
/**
 * UserDropdown -- shell 用户下拉菜单
 *
 * 包装共享 UserDropdown 组件，注入 shell 特有的 logout 逻辑（重置菜单）。
 */
import { useAuth } from '@/composables/useAuth'
import { useMenu } from '@/composables/useMenu'
import SharedUserDropdown from '@schema-form/business-shared/components/UserDropdown.vue'

const { user, logout } = useAuth()
const { reset: resetMenu } = useMenu()

async function handleLogout(): Promise<void> {
  resetMenu()
  await logout()
}
</script>

<template>
  <SharedUserDropdown :username="user?.username" @logout="handleLogout" />
</template>
