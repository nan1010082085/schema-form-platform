<script setup lang="ts">
/**
 * UserDropdown -- 用户头像下拉菜单（共享组件）
 *
 * 纯渲染组件，逻辑通过 props 回调注入。
 * 各子项目通过 slot 可扩展下拉菜单项。
 */
import styles from './UserDropdown.module.css'

defineProps<{
  /** 用户名，显示首字母头像和用户名文本 */
  username?: string
}>()

const emit = defineEmits<{
  logout: []
}>()
</script>

<template>
  <t-dropdown trigger="click">
    <div :class="styles.userArea">
      <div :class="styles.userAvatar">
        {{ username?.charAt(0)?.toUpperCase() || 'U' }}
      </div>
      <span :class="styles.userName">{{ username || 'Guest' }}</span>
    </div>
    <template #dropdown>
      <t-dropdown-menu>
        <slot name="menu-prefix" />
        <t-dropdown-item @click="emit('logout')">退出登录</t-dropdown-item>
        <slot name="menu-suffix" />
      </t-dropdown-menu>
    </template>
  </t-dropdown>
</template>
