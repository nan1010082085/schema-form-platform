<script setup lang="ts">
import { useRouter } from 'vue-router'
import {
  Plus,
  Connection,
  ChatLineSquare,
  Document,
  UserFilled,
  Reading,
} from '@element-plus/icons-vue'

const router = useRouter()

interface QuickAction {
  id: string
  label: string
  desc: string
  icon: typeof Plus
  color: string
  bg: string
  route?: string
  href?: string
}

const actions: QuickAction[] = [
  {
    id: 'new-form',
    label: '新建表单',
    desc: '创建可视化表单',
    icon: Plus,
    color: '#667eea',
    bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    route: '/editor',
  },
  {
    id: 'new-flow',
    label: '新建流程',
    desc: '设计审批流程',
    icon: Connection,
    color: '#f093fb',
    bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    route: '/flow',
  },
  {
    id: 'new-chat',
    label: '发起对话',
    desc: 'AI 智能助手',
    icon: ChatLineSquare,
    color: '#4facfe',
    bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    route: '/ai',
  },
  {
    id: 'new-doc',
    label: '查看文档',
    desc: '平台使用指南',
    icon: Document,
    color: '#fa709a',
    bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    href: '/docs/docs.html',
  },
  {
    id: 'user-mgmt',
    label: '用户管理',
    desc: '管理平台用户',
    icon: UserFilled,
    color: '#43e97b',
    bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    route: '/users',
  },
  {
    id: 'role-mgmt',
    label: '角色管理',
    desc: '配置角色权限',
    icon: Reading,
    color: '#a18cd1',
    bg: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    route: '/roles',
  },
]

function handleClick(action: QuickAction) {
  if (action.href) {
    window.open(action.href, '_blank')
  } else if (action.route) {
    router.push(action.route)
  }
}
</script>

<template>
  <div :class="$style.container">
    <h3 :class="$style.title">快捷操作</h3>
    <div :class="$style.grid">
      <button
        v-for="action in actions"
        :key="action.id"
        :class="$style.actionBtn"
        @click="handleClick(action)"
      >
        <div :class="$style.iconWrap" :style="{ background: action.bg }">
          <el-icon :size="20" color="#fff"><component :is="action.icon" /></el-icon>
        </div>
        <div :class="$style.actionContent">
          <span :class="$style.actionLabel">{{ action.label }}</span>
          <span :class="$style.actionDesc">{{ action.desc }}</span>
        </div>
      </button>
    </div>
  </div>
</template>

<style module>
.container {
  width: 100%;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0 0 16px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.actionBtn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--bg-color-white);
  border: 1px solid var(--border-color-light);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;
  font-family: inherit;
}

.actionBtn:hover {
  border-color: var(--color-primary);
  box-shadow: 0 4px 12px rgba(0, 96, 162, 0.1);
  transform: translateY(-2px);
}

.iconWrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.actionContent {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.actionLabel {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color-primary);
}

.actionDesc {
  font-size: 12px;
  color: var(--text-color-secondary);
}

@media (max-width: 600px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
