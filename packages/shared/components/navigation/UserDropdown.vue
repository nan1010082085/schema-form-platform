<script setup lang="ts">
/**
 * UserDropdown -- 用户头像下拉菜单（共享组件）
 *
 * 纯渲染组件，逻辑通过 props 回调注入。
 * 各子项目通过 slot 可扩展下拉菜单项。
 */
import styles from './UserDropdown.module.scss'

defineProps<{
  /** 用户名，显示首字母头像和用户名文本 */
  username?: string
}>()

const emit = defineEmits<{
  logout: []
}>()
</script>

<template>
  <el-dropdown trigger="click" @command="(cmd: string) => cmd === 'logout' && emit('logout')">
    <div :class="styles.userArea">
      <div :class="styles.userAvatar">
        {{ username?.charAt(0)?.toUpperCase() || '用' }}
      </div>
      <span :class="styles.userName">{{ username || '未登录' }}</span>
    </div>
    <template #dropdown>
      <el-dropdown-menu>
        <slot name="menu-prefix" />
        <el-dropdown-item command="logout">退出登录</el-dropdown-item>
        <slot name="menu-suffix" />
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>
