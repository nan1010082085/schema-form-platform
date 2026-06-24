/**
 * ClassicSidebarLayout — classic sidebar layout
 *
 * Style: dark sidebar + top header + content area.
 * When withoutMenu is true, renders full-screen micro-app without sidebar/header.
 * The withoutMenu prop is controlled by DynamicLayout based on micro-app config.
 */

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useLayoutStore } from '@schema-form/business-shared/stores/layout'
import { useMicroAppStore } from '@/stores/microApp'
import { APP_CONFIGS } from '@schema-form/platform-shared/qiankun/config'
import SideMenu from '@/components/SideMenu.vue'
import Breadcrumb from '@/components/Breadcrumb.vue'
import UserDropdown from '@/components/UserDropdown.vue'
import GlobalSearch from '@/components/GlobalSearch.vue'
import MicroAppContainer from '@/components/MicroAppContainer.vue'
import AppIcon from '@schema-form/platform-shared/components/common/AppIcon.vue'

const props = defineProps<{
  withoutMenu?: boolean
}>()

const route = useRoute()
const layoutStore = useLayoutStore()
const microAppStore = useMicroAppStore()

layoutStore.restoreCollapsed()

const currentApp = computed(() => route.params.app as string || '')

const appEntry = computed(() => {
  if (!currentApp.value) return ''
  // Try micro-app store first
  const entry = microAppStore.getAppEntry(currentApp.value)
  if (entry) return entry
  // Fallback to APP_CONFIGS
  const config = APP_CONFIGS[currentApp.value as keyof typeof APP_CONFIGS]
  if (config) {
    const isDev = import.meta.env.DEV
    return isDev
      ? `//localhost:${config.devPort}${config.basePath}`
      : `//${window.location.host}${config.basePath}`
  }
  return ''
})

function toggleCollapse() {
  layoutStore.toggleCollapse()
}
</script>

<template>
  <!-- Without menu: full-screen micro-app -->
  <div v-if="props.withoutMenu" :class="$style.layout">
    <main :class="$style.main">
      <MicroAppContainer
        v-if="currentApp && appEntry"
        :app-name="currentApp"
        :entry="appEntry"
      />
      <router-view v-else />
    </main>
  </div>

  <!-- Sidebar layout -->
  <div v-else :class="$style.layout">
    <SideMenu
      :collapsed="layoutStore.collapsed"
      @toggle-collapse="toggleCollapse"
    />

    <div :class="$style.contentArea">
      <header :class="$style.header">
        <div :class="$style.headerLeft">
          <el-button
            :class="$style.mobileMenuBtn"
            text
            @click="toggleCollapse"
          >
            <AppIcon name="menu" :size="18" />
          </el-button>
          <Breadcrumb />
        </div>

        <div :class="$style.headerRight">
          <GlobalSearch />
          <UserDropdown />
        </div>
      </header>

      <main :class="$style.main">
        <MicroAppContainer
          v-if="currentApp && appEntry"
          :app-name="currentApp"
          :entry="appEntry"
        />
        <router-view v-else />
      </main>
    </div>
  </div>
</template>

<style module>
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-color-page);
}

.contentArea {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: var(--bg-color-white);
  border-bottom: 1px solid var(--border-color-base);
  flex-shrink: 0;
}

.headerLeft {
  display: flex;
  align-items: center;
  gap: 8px;
}

.headerRight {
  display: flex;
  align-items: center;
  gap: 16px;
}

.mobileMenuBtn {
  display: none;
}

.main {
  flex: 1;
  overflow: auto;
  background: var(--bg-color-page);
}

@media (max-width: 900px) {
  .mobileMenuBtn {
    display: flex;
  }
}
</style>
