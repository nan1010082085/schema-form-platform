/**
 * 首页仪表盘数据类型定义
 * 与后端 API 契约对齐
 */

// ---- 统计卡片 ----

/** 表单统计 */
export interface SchemaStats {
  total: number
  published: number
  draft: number
}

/** 流程统计 */
export interface FlowStats {
  total: number
  running: number
  completed: number
}

/** AI 对话统计 */
export interface AiStats {
  total: number
  tokenUsage: number
  successRate: number
}

/** 用户活跃度统计 */
export interface UserActivityStats {
  onlineUsers: number
  todayVisits: number
}

/** 仪表盘聚合统计 */
export interface DashboardStats {
  schemas: SchemaStats
  flows: FlowStats
  ai: AiStats
  userActivity: UserActivityStats
}

// ---- AI 对话记录 ----

/** 最新 AI 对话列表项 */
export interface RecentConversation {
  id: string
  title: string
  agentType: 'auto' | 'editor' | 'flow'
  messageCount: number
  tokenUsage: number
  status: 'active' | 'completed' | 'error'
  createdAt: string
  updatedAt: string
}

// ---- Store 状态 ----

/** 首页加载状态 */
export interface HomeLoadingState {
  stats: boolean
  conversations: boolean
}

/** 首页错误状态 */
export interface HomeErrorState {
  stats: string | null
  conversations: string | null
}
