import Router from '@koa/router'
import { FlowInstanceModel } from '../flow-models/FlowInstance.js'
import { TaskInstanceModel } from '../flow-models/TaskInstance.js'
import { authMiddleware } from '../middleware/auth.js'

const requireAuth = authMiddleware({ required: true })

const router = new Router({ prefix: '/api/flow-monitor' })

// GET /api/flow-monitor/stats — 按状态分组的实例统计
router.get('/stats', requireAuth, async (ctx) => {
  const stats = await FlowInstanceModel.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ])

  const statusMap = new Map(stats.map((s) => [s._id, s.count]))
  const total = stats.reduce((sum, s) => sum + s.count, 0)

  ctx.body = {
    success: true,
    data: {
      total,
      running: statusMap.get('running') ?? 0,
      completed: statusMap.get('completed') ?? 0,
      terminated: statusMap.get('terminated') ?? 0,
      suspended: statusMap.get('suspended') ?? 0,
      failed: statusMap.get('failed') ?? 0,
    },
  }
})

// GET /api/flow-monitor/avg-duration — 已完成实例的平均时长（毫秒）
router.get('/avg-duration', requireAuth, async (ctx) => {
  const result = await FlowInstanceModel.aggregate([
    { $match: { status: 'completed', completedAt: { $ne: null } } },
    {
      $project: {
        duration: { $subtract: ['$completedAt', '$startedAt'] },
      },
    },
    { $group: { _id: null, avgDuration: { $avg: '$duration' } } },
  ])

  ctx.body = {
    success: true,
    data: { avgDuration: Math.round(result[0]?.avgDuration ?? 0) },
  }
})

// GET /api/flow-monitor/node-stats — 各节点的完成次数和平均耗时
router.get('/node-stats', requireAuth, async (ctx) => {
  const stats = await TaskInstanceModel.aggregate([
    { $match: { status: 'completed' } },
    {
      $project: {
        nodeId: 1,
        nodeName: 1,
        duration: { $subtract: ['$updatedAt', '$createdAt'] },
      },
    },
    {
      $group: {
        _id: '$nodeId',
        nodeName: { $first: '$nodeName' },
        count: { $sum: 1 },
        avgDuration: { $avg: '$duration' },
      },
    },
    { $sort: { count: -1 } },
    {
      $project: {
        _id: 0,
        nodeId: '$_id',
        nodeName: 1,
        count: 1,
        avgDuration: { $round: ['$avgDuration', 0] },
      },
    },
  ])

  ctx.body = { success: true, data: stats }
})

// GET /api/flow-monitor/trend — 按天统计实例创建趋势
router.get('/trend', requireAuth, async (ctx) => {
  const { days: daysStr = '30' } = ctx.query
  const days = Math.min(365, Math.max(1, parseInt(daysStr as string, 10) || 30))

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0, 0, 0, 0)

  const trend = await FlowInstanceModel.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: '$_id',
        count: 1,
      },
    },
  ])

  // 填充没有数据的日期为 0
  const result: Array<{ date: string; count: number }> = []
  const trendMap = new Map(trend.map((t) => [t.date, t.count]))
  const cursor = new Date(startDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  while (cursor <= today) {
    const dateStr = cursor.toISOString().slice(0, 10)
    result.push({ date: dateStr, count: trendMap.get(dateStr) ?? 0 })
    cursor.setDate(cursor.getDate() + 1)
  }

  ctx.body = { success: true, data: result }
})

// GET /api/flow-monitor/top-flows — 按实例数排名的热门流程 Top N
router.get('/top-flows', requireAuth, async (ctx) => {
  const { limit: limitStr = '5' } = ctx.query
  const limit = Math.min(20, Math.max(1, parseInt(limitStr as string, 10) || 5))

  const topFlows = await FlowInstanceModel.aggregate([
    { $group: { _id: '$definitionId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'flowdefinitions',
        localField: '_id',
        foreignField: '_id',
        as: 'definition',
      },
    },
    {
      $project: {
        _id: 0,
        definitionId: '$_id',
        flowName: { $ifNull: [{ $arrayElemAt: ['$definition.name', 0] }, '$_id'] },
        count: 1,
      },
    },
  ])

  ctx.body = { success: true, data: topFlows }
})

export default router
