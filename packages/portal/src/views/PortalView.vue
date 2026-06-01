<script setup lang="ts">
import { Edit, Connection, ChatLineSquare, User, Document, UserFilled } from '@element-plus/icons-vue'

const cards = [
  {
    title: '表单编辑器',
    desc: '可视化拖拽设计器，30+ 组件开箱即用',
    icon: Edit,
    route: '/editor',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    title: '流程引擎',
    desc: 'BPMN 流程设计器，可视化编排审批流',
    icon: Connection,
    route: '/flow',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    title: 'AI 助手',
    desc: '对话式生成 Schema 与流程定义',
    icon: ChatLineSquare,
    route: '/ai',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
  {
    title: '用户管理',
    desc: '管理平台用户、角色与权限配置',
    icon: User,
    route: '/users',
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  },
  {
    title: '角色管理',
    desc: '管理平台角色，配置角色成员',
    icon: UserFilled,
    route: '/roles',
    gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  },
  {
    title: '项目文档',
    desc: '前端、后端、流程引擎、AI 全平台技术文档',
    icon: Document,
    href: '/docs/docs.html',
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  },
]
</script>

<template>
  <div :class="$style.page">
    <header :class="$style.header">
      <div :class="$style.headerInner">
        <span :class="$style.logo">Schema Form Platform</span>
      </div>
    </header>

    <main :class="$style.main">
      <section :class="$style.hero">
        <h1 :class="$style.heroTitle">Schema Form Platform</h1>
        <p :class="$style.heroDesc">
          Schema 驱动的可视化表单设计器与流程引擎
        </p>
      </section>

      <div :class="$style.grid">
        <component
          v-for="card in cards"
          :key="card.route || card.href"
          :is="card.href ? 'a' : 'router-link'"
          v-bind="card.href ? { href: card.href, target: '_blank' } : { to: card.route }"
          :class="$style.card"
        >
          <div :class="$style.cardIcon" :style="{ background: card.gradient }">
            <el-icon :size="22" color="#fff"><component :is="card.icon" /></el-icon>
          </div>
          <div :class="$style.cardBody">
            <h2 :class="$style.cardTitle">{{ card.title }}</h2>
            <p :class="$style.cardDesc">{{ card.desc }}</p>
          </div>
        </component>
      </div>
    </main>
  </div>
</template>

<style module>
.page {
  min-height: 100vh;
  background: var(--bg-color-page);
}

.header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg-color-white);
  border-bottom: 1px solid var(--border-color-light);
}

.headerInner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 32px;
  height: 52px;
  display: flex;
  align-items: center;
}

.logo {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-color-primary);
  letter-spacing: -0.01em;
}

.main {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 32px;
}

.hero {
  padding: 56px 0 48px;
}

.heroTitle {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-color-primary);
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}

.heroDesc {
  font-size: 15px;
  color: var(--text-color-secondary);
  line-height: 1.6;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  padding-bottom: 64px;
}

.card {
  background: var(--bg-color-white);
  border: 1px solid var(--border-color-light);
  border-radius: 8px;
  padding: 24px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  text-decoration: none;
  color: inherit;
}

.card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 4px 16px rgba(0, 96, 162, 0.08);
}

.cardIcon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cardBody {
  flex: 1;
  min-width: 0;
}

.cardTitle {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin-bottom: 4px;
}

.cardDesc {
  font-size: 13px;
  color: var(--text-color-secondary);
  line-height: 1.5;
}
</style>
