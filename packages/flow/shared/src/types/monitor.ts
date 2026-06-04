/** 流程监控仪表盘数据类型 */

/** 按状态分组的实例统计 */
export interface FlowMonitorStats {
  total: number
  running: number
  completed: number
  terminated: number
  suspended: number
  failed: number
}

/** 平均审批时长（毫秒） */
export interface FlowMonitorAvgDuration {
  avgDuration: number
}

/** 单个节点的统计信息 */
export interface FlowMonitorNodeStat {
  nodeId: string
  nodeName: string
  count: number
  avgDuration: number
}

/** 趋势图数据点 */
export interface FlowMonitorTrendPoint {
  date: string
  count: number
}

/** 监控仪表盘完整数据 */
export interface FlowMonitorDashboard {
  stats: FlowMonitorStats
  avgDuration: number
  nodeStats: FlowMonitorNodeStat[]
  trend: FlowMonitorTrendPoint[]
}
