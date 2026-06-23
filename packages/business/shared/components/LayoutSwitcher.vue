/**
 * 布局切换器组件
 *
 * 用于在侧边栏布局和顶部导航布局之间切换
 */

<script setup lang="ts">
import { useLayoutStore } from '../stores/layout'
import AppIcon from '@schema-form/shared-components/common/AppIcon.vue'

const layoutStore = useLayoutStore()

function handleSwitch(style: 'sidebar' | 'topnav') {
  layoutStore.setStyle(style)
}
</script>

<template>
  <div :class="$style.switcher">
    <el-tooltip content="侧边栏布局" placement="bottom" effect="dark">
      <div
        :class="[
          $style.option,
          { [$style.optionActive]: layoutStore.isSidebar }
        ]"
        @click="handleSwitch('sidebar')"
      >
        <AppIcon name="monitor" :size="18" />
      </div>
    </el-tooltip>

    <el-tooltip content="顶部导航布局" placement="bottom" effect="dark">
      <div
        :class="[
          $style.option,
          { [$style.optionActive]: layoutStore.isTopNav }
        ]"
        @click="handleSwitch('topnav')"
      >
        <MenuIcon :size="18" />
      </div>
    </el-tooltip>
  </div>
</template>

<style module>
.switcher {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: var(--el-bg-color-overlay, #f5f5f5);
  border-radius: var(--el-border-radius-base, 6px);
}

.option {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--el-border-radius-small, 3px);
  color: var(--el-text-color-secondary, rgba(0, 0, 0, 0.6));
  cursor: pointer;
  transition: all var(--el-transition-duration-fast, 0.1s);
}

.option:hover {
  color: var(--el-text-color-primary, rgba(0, 0, 0, 0.9));
  background: var(--el-fill-color-light, #f5f5f5);
}

.optionActive {
  color: var(--el-color-primary, #0052d9);
  background: var(--el-bg-color, #fff);
  box-shadow: var(--el-box-shadow-light, 0 1px 10px rgba(0, 0, 0, 0.05));
}

.optionActive:hover {
  color: var(--el-color-primary, #0052d9);
  background: var(--el-bg-color, #fff);
}
</style>
