<script setup lang="ts">
/**
 * ShellView -- main shell layout
 *
 * Two layout modes based on route meta:
 * - with-menu (default): sidebar + header (breadcrumb + user) + content
 * - without-menu (meta.withoutMenu): full-screen content, no sidebar
 *
 * Pure layout component -- no business logic.
 */
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import SideMenu from '@/components/SideMenu.vue'
import Breadcrumb from '@/components/Breadcrumb.vue'
import UserDropdown from '@/components/UserDropdown.vue'
import styles from './ShellView.module.css'

const route = useRoute()
const collapsed = ref(false)

const withoutMenu = computed(() => route.meta?.withoutMenu === true)

function toggleCollapse(): void {
  collapsed.value = !collapsed.value
}
</script>

<template>
  <!-- Without-menu layout: full-screen micro-app -->
  <div v-if="withoutMenu" :class="styles.layout">
    <div :class="styles.contentArea">
      <main :class="styles.main">
        <router-view />
      </main>
    </div>
  </div>

  <!-- With-menu layout: sidebar + header + content -->
  <div v-else :class="styles.layout">
    <SideMenu :collapsed="collapsed" @toggle-collapse="toggleCollapse" />

    <div :class="styles.contentArea">
      <header :class="styles.header">
        <div :class="styles.headerLeft">
          <Breadcrumb />
        </div>
        <div :class="styles.headerRight">
          <UserDropdown />
        </div>
      </header>

      <main :class="styles.main">
        <router-view />
      </main>
    </div>
  </div>
</template>
