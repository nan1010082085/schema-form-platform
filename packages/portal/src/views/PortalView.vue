<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Edit,
  Connection,
  ChatLineSquare,
  User,
  Document,
  UserFilled,
  Warning,
} from '@element-plus/icons-vue'
import { useHomeData } from '@/composables/useHomeData'
import type { DashboardStats, RecentConversation } from '@/types/home'

const router = useRouter()
const {
  stats,
  conversations,
  loading,
  error,
  hasStats,
  isConversationsEmpty,
  fetchAll,
  refreshStats,
  refreshConversations,
} = useHomeData()

onMounted(() => {
  fetchAll()
})

// ---- 功能导航卡片 ----

interface NavCard {
  title: string
  desc: string
  icon: typeof Edit
  gradient: string
  route?: string
  href?: string
}

const cards: NavCard[] = [
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

// ---- 统计卡片 ----

interface StatCardDef {
  key: keyof DashboardStats
  title: string
  icon: typeof Edit
  gradient: string
  getValue: (s: DashboardStats) => string
  getSub: (s: DashboardStats) => string
}

const statCards: StatCardDef[] = [
  {
    key: 'schemas',
    title: '表单',
    icon: Edit,
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    getValue: (s) => String(s.schemas.total),
    getSub: (s) => `已发布 ${s.schemas.published} / 草稿 ${s.schemas.draft}`,
  },
  {
    key: 'flows',
    title: '流程',
    icon: Connection,
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    getValue: (s) => String(s.flows.total),
    getSub: (s) => `运行中 ${s.flows.running} / 已完成 ${s.flows.completed}`,
  },
  {
    key: 'ai',
    title: 'AI 对话',
    icon: ChatLineSquare,
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    getValue: (s) => String(s.ai.total),
    getSub: (s) => `成功率 ${(s.ai.successRate * 100).toFixed(0)}%`,
  },
  {
    key: 'userActivity',
    title: '用户活跃',
    icon: User,
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    getValue: (s) => String(s.userActivity.onlineUsers),
    getSub: (s) => `今日访问 ${s.userActivity.todayVisits}`,
  },
]

// ---- 对话列表辅助 ----

const agentLabels: Record<RecentConversation['agentType'], string> = {
  auto: 'Auto',
  editor: 'Editor',
  flow: 'Flow',
}

const statusMap: Record<RecentConversation['status'], { text: string; type: 'success' | 'info' | 'danger' }> = {
  active: { text: '进行中', type: 'info' },
  completed: { text: '已完成', type: 'success' },
  error: { text: '异常', type: 'danger' },
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function goToConversation(conv: RecentConversation) {
  router.push({ path: '/ai', query: { conversationId: conv.id } })
}
</script>

<template>
  <div :class="$style.page">
    <!-- Header -->
    <header :class="$style.header">
      <div :class="$style.headerInner">
        <span :class="$style.logo">Schema Form Platform</span>
      </div>
    </header>

    <main :class="$style.main">
      <!-- Hero -->
      <section :class="$style.hero">
        <h1 :class="$style.heroTitle">Schema Form Platform</h1>
        <p :class="$style.heroDesc">Schema 驱动的可视化表单设计器与流程引擎</p>
      </section>

      <!-- 统计卡片 -->
      <section :class="$style.statsSection">
        <!-- 加载骨架屏 -->
        <template v-if="loading.stats">
          <div v-for="i in 4" :key="i" :class="$style.statCard">
            <el-skeleton :rows="2" animated />
          </div>
        </template>

        <!-- 错误 -->
        <template v-else-if="error.stats">
          <div :class="[$style.statCard, $style.statCardError]">
            <el-icon :size="24" color="var(--color-danger)"><Warning /></el-icon>
            <p :class="$style.errorText">统计数据加载失败</p>
            <el-button size="small" type="primary" @click="refreshStats">重试</el-button>
          </div>
        </template>

        <!-- 数据 -->
        <template v-else-if="hasStats && stats">
          <div v-for="def in statCards" :key="def.key" :class="$style.statCard">
            <div :class="$style.statIcon" :style="{ background: def.gradient }">
              <el-icon :size="20" color="#fff"><component :is="def.icon" /></el-icon>
            </div>
            <div :class="$style.statBody">
              <span :class="$style.statTitle">{{ def.title }}</span>
              <span :class="$style.statValue">{{ def.getValue(stats) }}</span>
              <span :class="$style.statSub">{{ def.getSub(stats) }}</span>
            </div>
          </div>
        </template>
      </section>

      <!-- 功能导航 -->
      <section :class="$style.navSection">
        <h2 :class="$style.sectionTitle">功能导航</h2>
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
              <h3 :class="$style.cardTitle">{{ card.title }}</h3>
              <p :class="$style.cardDesc">{{ card.desc }}</p>
            </div>
          </component>
        </div>
      </section>

      <!-- 最新 AI 对话 -->
      <section :class="$style.convSection">
        <div :class="$style.convHeader">
          <h2 :class="$style.sectionTitle">最新 AI 对话</h2>
          <router-link to="/ai" :class="$style.viewAll">查看全部</router-link>
        </div>

        <!-- 加载骨架屏 -->
        <template v-if="loading.conversations">
          <div v-for="i in 5" :key="i" :class="$style.convRow">
            <el-skeleton :rows="1" animated />
          </div>
        </template>

        <!-- 错误 -->
        <template v-else-if="error.conversations">
          <div :class="$style.convEmpty">
            <el-icon :size="24" color="var(--color-danger)"><Warning /></el-icon>
            <p :class="$style.errorText">对话列表加载失败</p>
            <el-button size="small" type="primary" @click="refreshConversations">重试</el-button>
          </div>
        </template>

        <!-- 空状态 -->
        <template v-else-if="isConversationsEmpty">
          <div :class="$style.convEmpty">
            <el-icon :size="28" color="var(--text-color-placeholder)"><ChatLineSquare /></el-icon>
            <p :class="$style.convEmptyText">暂无对话记录</p>
            <p :class="$style.convEmptyHint">前往 AI 助手开始你的第一次对话</p>
          </div>
        </template>

        <!-- 对话列表 -->
        <template v-else>
          <div
            v-for="conv in conversations"
            :key="conv.id"
            :class="$style.convRow"
            @click="goToConversation(conv)"
          >
            <div :class="$style.convLeft">
              <span :class="$style.convTitle">{{ conv.title }}</span>
              <el-tag size="small" :type="statusMap[conv.status].type">
                {{ statusMap[conv.status].text }}
              </el-tag>
            </div>
            <div :class="$style.convRight">
              <el-tag size="small" type="info">{{ agentLabels[conv.agentType] }}</el-tag>
              <span :class="$style.convMeta">{{ conv.messageCount }} 条消息</span>
              <span :class="$style.convTime">{{ formatTime(conv.updatedAt) }}</span>
            </div>
          </div>
        </template>
      </section>
    </main>
  </div>
</template>

<style module>
.page {
  min-height: 100vh;
  background: var(--bg-color-page);
}

/* ---- Header ---- */

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

/* ---- Main ---- */

.main {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 32px 64px;
}

/* ---- Hero ---- */

.hero {
  padding: 40px 0 28px;
}

.heroTitle {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-color-primary);
  margin-bottom: 4px;
  letter-spacing: -0.02em;
}

.heroDesc {
  font-size: 14px;
  color: var(--text-color-secondary);
  line-height: 1.6;
}

/* ---- Section ---- */

.sectionTitle {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0 0 16px;
}

/* ---- Stats ---- */

.statsSection {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 40px;
}

.statCard {
  background: var(--bg-color-white);
  border: 1px solid var(--border-color-light);
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.statCardError {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  gap: 8px;
}

.errorText {
  font-size: 13px;
  color: var(--text-color-secondary);
}

.statIcon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.statBody {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.statTitle {
  font-size: 13px;
  color: var(--text-color-secondary);
}

.statValue {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-color-primary);
  line-height: 1.2;
}

.statSub {
  font-size: 12px;
  color: var(--text-color-placeholder);
}

/* ---- Nav Cards ---- */

.navSection {
  margin-bottom: 40px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
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
  margin: 0 0 4px;
}

.cardDesc {
  font-size: 13px;
  color: var(--text-color-secondary);
  line-height: 1.5;
  margin: 0;
}

/* ---- Conversations ---- */

.convSection {
  margin-bottom: 32px;
}

.convHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.convHeader .sectionTitle {
  margin-bottom: 0;
}

.viewAll {
  font-size: 13px;
  color: var(--color-primary);
  text-decoration: none;
}

.viewAll:hover {
  text-decoration: underline;
}

.convRow {
  background: var(--bg-color-white);
  border: 1px solid var(--border-color-light);
  border-radius: 8px;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.convRow + .convRow {
  margin-top: 8px;
}

.convRow:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 96, 162, 0.06);
}

.convLeft {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.convTitle {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.convRight {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.convMeta {
  font-size: 12px;
  color: var(--text-color-secondary);
}

.convTime {
  font-size: 12px;
  color: var(--text-color-placeholder);
  white-space: nowrap;
}

.convEmpty {
  background: var(--bg-color-white);
  border: 1px solid var(--border-color-light);
  border-radius: 8px;
  padding: 48px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.convEmptyText {
  font-size: 14px;
  color: var(--text-color-secondary);
  margin: 0;
}

.convEmptyHint {
  font-size: 13px;
  color: var(--text-color-placeholder);
  margin: 0;
}

/* ---- Responsive ---- */

@media (max-width: 900px) {
  .statsSection {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .headerInner,
  .main {
    padding-left: 16px;
    padding-right: 16px;
  }

  .statsSection {
    grid-template-columns: 1fr;
  }

  .grid {
    grid-template-columns: 1fr;
  }

  .convRow {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .convRight {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
