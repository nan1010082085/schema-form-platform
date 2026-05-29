<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ArrowLeft } from '@element-plus/icons-vue'

defineProps<{
  title: string
}>()

const router = useRouter()
const auth = useAuthStore()

function handleLogout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="sub-page">
    <header class="sub-page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" text @click="router.push('/')">
          返回入口
        </el-button>
        <span class="page-title">{{ title }}</span>
      </div>
      <div class="header-right">
        <span class="username">{{ auth.user?.displayName }}</span>
        <el-button text @click="handleLogout">退出</el-button>
      </div>
    </header>
    <main class="sub-page-content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.sub-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.sub-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 56px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a2e;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.username {
  font-size: 14px;
  color: #666;
}

.sub-page-content {
  flex: 1;
  padding: 24px;
}
</style>
