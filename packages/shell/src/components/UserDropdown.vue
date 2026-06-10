<script setup lang="ts">
/**
 * UserDropdown -- user avatar + dropdown menu
 *
 * Displays current user info and provides logout action.
 * Pure rendering -- logic from useAuth composable.
 */
import { useAuth } from '@/composables/useAuth'
import { useMenu } from '@/composables/useMenu'
import styles from './UserDropdown.module.css'

const { user, logout } = useAuth()
const { reset: resetMenu } = useMenu()

async function handleLogout(): Promise<void> {
  resetMenu()
  await logout()
}
</script>

<template>
  <el-dropdown trigger="click">
    <div :class="styles.userArea">
      <div :class="styles.userAvatar">
        {{ user?.username?.charAt(0)?.toUpperCase() || 'U' }}
      </div>
      <span :class="styles.userName">{{ user?.username || 'Guest' }}</span>
    </div>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item @click="handleLogout">Logout</el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>
