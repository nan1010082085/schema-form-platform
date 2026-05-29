<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Odometer, Edit, Connection, User } from '@element-plus/icons-vue'

const router = useRouter()
const auth = useAuthStore()

const cards = [
  { title: '概览', desc: '系统统计数据概览', icon: Odometer, route: '/dashboard', color: '#667eea' },
  { title: '编辑器', desc: '可视化拖拽设计器，支持 30+ 组件', icon: Edit, route: '/editor', color: '#764ba2' },
  { title: '流程引擎', desc: 'BPMN 流程设计器与运行时引擎', icon: Connection, route: '/flow', color: '#f5576c' },
  { title: '用户管理', desc: '管理平台用户、角色与权限', icon: User, route: '/users', color: '#0ea5e9' },
]

function handleLogout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="portal-page">
    <header class="portal-header">
      <span class="logo">Schema Form Platform</span>
      <div class="header-right">
        <span class="username">{{ auth.user?.displayName }}</span>
        <el-button text @click="handleLogout">退出</el-button>
      </div>
    </header>

    <section class="hero">
      <h1>Schema Form Platform</h1>
      <p>Schema 驱动的可视化表单设计器与流程引擎。通过拖拽配置快速构建表单、审批流与数据接口。</p>
    </section>

    <main class="cards">
      <article
        v-for="card in cards"
        :key="card.route"
        class="card"
        @click="router.push(card.route)"
      >
        <div class="card-icon" :style="{ background: card.color }">
          <el-icon :size="24" color="#fff"><component :is="card.icon" /></el-icon>
        </div>
        <h2>{{ card.title }}</h2>
        <p>{{ card.desc }}</p>
      </article>
    </main>
  </div>
</template>

<style scoped>
.portal-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.portal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 56px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
}

.logo {
  font-size: 16px;
  font-weight: 700;
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

.hero {
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
  color: #fff;
  text-align: center;
  padding: 80px 24px 100px;
  position: relative;
  overflow: hidden;
}

.hero::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.25) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(78, 84, 200, 0.2) 0%, transparent 40%);
  pointer-events: none;
}

.hero h1 {
  font-size: 2.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 16px;
  position: relative;
}

.hero p {
  font-size: 1.15rem;
  color: rgba(255, 255, 255, 0.72);
  max-width: 560px;
  margin: 0 auto;
  line-height: 1.6;
  position: relative;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 28px;
  max-width: 1000px;
  margin: -60px auto 0;
  padding: 0 24px 60px;
  position: relative;
  z-index: 1;
}

.card {
  background: #fff;
  border-radius: 16px;
  padding: 36px 28px 32px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  flex-direction: column;
  cursor: pointer;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.1);
}

.card-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.card h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 10px;
}

.card p {
  font-size: 0.92rem;
  color: #555;
  line-height: 1.6;
  flex: 1;
}
</style>
