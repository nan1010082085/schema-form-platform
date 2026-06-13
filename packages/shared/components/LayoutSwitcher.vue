/**
 * 布局切换器组件
 *
 * 用于在侧边栏布局和顶部导航布局之间切换
 */

<script setup lang="ts">
import { useLayoutStore } from '@schema-form/shared-stores/layout'
import { DesktopIcon, MenuIcon } from 'tdesign-icons-vue-next'

const layoutStore = useLayoutStore()

function handleSwitch(style: 'sidebar' | 'topnav') {
  layoutStore.setStyle(style)
}
</script>

<template>
  <div :class="$style.switcher">
    <t-tooltip content="侧边栏布局" placement="bottom">
      <div
        :class="[
          $style.option,
          { [$style.optionActive]: layoutStore.isSidebar }
        ]"
        @click="handleSwitch('sidebar')"
      >
        <desktop-icon :size="18" />
      </div>
    </t-tooltip>

    <t-tooltip content="顶部导航布局" placement="bottom">
      <div
        :class="[
          $style.option,
          { [$style.optionActive]: layoutStore.isTopNav }
        ]"
        @click="handleSwitch('topnav')"
      >
        <menu-icon :size="18" />
      </div>
    </t-tooltip>
  </div>
</template>

<style module>
.switcher {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: var(--td-bg-color-secondarycontainer, #f5f5f5);
  border-radius: var(--td-radius-default, 6px);
}

.option {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--td-radius-small, 3px);
  color: var(--td-text-color-secondary, rgba(0, 0, 0, 0.6));
  cursor: pointer;
  transition: all var(--td-anim-duration-fast, 0.1s);
}

.option:hover {
  color: var(--td-text-color-primary, rgba(0, 0, 0, 0.9));
  background: var(--td-bg-color-container-hover, #f5f5f5);
}

.optionActive {
  color: var(--td-brand-color, #0052d9);
  background: var(--td-bg-color-container, #fff);
  box-shadow: var(--td-shadow-1, 0 1px 10px rgba(0, 0, 0, 0.05));
}

.optionActive:hover {
  color: var(--td-brand-color, #0052d9);
  background: var(--td-bg-color-container, #fff);
}
</style>
