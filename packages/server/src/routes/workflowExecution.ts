import Router from '@koa/router'
import { FlowInstanceModel } from '../flow-models/FlowInstance.js'
import { NodeExecutionLogModel } from '../models/NodeExecutionLog.js'
import { WorkflowModel } from '../models/Workflow.js'
import { apiOrJwtAuthMiddleware } from '../middleware/apiOrJwtAuth.js'

const jwtAuth = apiOrJwtAuthMiddleware()

const router = new Router({ prefix: '/api/workflow-executions' })

// ────────────────────────────────────────────
// GET /api/workflow-executions
// 执行历史列表（分页、筛选）
// ────────────────────────────────────────────
router.get('/', jwtAuth, async (ctx) => {
  const {
    page = '1',
    pageSize = '20',
    status,
    workflowId,
    search,
  } = ctx.query as Record<string, string | undefined>

  const pageNum = Math.max(1, parseInt(page ?? '1', 10))
  const size = Math.min(100, Math.max(1, parseInt(pageSize ?? '20', 10)))
  const skip = (pageNum - 1) * size

  // Build filter
  const filter: Record<string, unknown> = {}
  if (status) filter.status = status
  if (workflowId) filter.definitionId = workflowId

  // If search provided, find matching workflow IDs first
  if (search?.trim()) {
    const matchingWorkflows = await WorkflowModel.find({
      name: { $regex: search.trim(), $options: 'i' },
    }).select('_id').lean()
    const workflowIds = matchingWorkflows.map((w) => w._id)
    if (workflowIds.length === 0) {
      ctx.body = { success: true, data: { items: [], total: 0, page: pageNum, pageSize: size, totalPages: 0 } }
      return
    }
    filter.definitionId = { $in: workflowIds }
  }

  const [items, total] = await Promise.all([
    FlowInstanceModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(size)
      .lean(),
    FlowInstanceModel.countDocuments(filter),
  ])

  // Enrich with workflow names
  const definitionIds = [...new Set(items.map((i) => i.definitionId))]
  const workflows = await WorkflowModel.find({ _id: { $in: definitionIds } })
    .select('_id name')
    .lean()
  const workflowNameMap = new Map(workflows.map((w) => [w._id, w.name]))

  const enriched = items.map((item) => ({
    ...item,
    id: item._id,
    workflowName: workflowNameMap.get(item.definitionId) ?? 'Unknown',
  }))

  ctx.body = {
    success: true,
    data: {
      items: enriched,
      total,
      page: pageNum,
      pageSize: size,
      totalPages: Math.ceil(total / size),
    },
  }
})

// ────────────────────────────────────────────
// GET /api/workflow-executions/stats
// 执行统计
// ────────────────────────────────────────────
router.get('/stats', jwtAuth, async (ctx) => {
  const { days = '7' } = ctx.query as Record<string, string | undefined>
  const daysNum = Math.min(90, Math.max(1, parseInt(days ?? '7', 10)))
  const since = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000)

  // Overall counts by status
  const statusCounts = await FlowInstanceModel.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ])

  const statusMap: Record<string, number> = {}
  for (const row of statusCounts) {
    statusMap[row._id] = row.count
  }

  const total = Object.values(statusMap).reduce((a, b) => a + b, 0)
  const completed = statusMap['completed'] ?? 0
  const failed = statusMap['failed'] ?? 0
  const successRate = total > 0 ? Math.round((completed / total) * 10000) / 100 : 0

  // Average execution time (completed instances only)
  const avgResult = await FlowInstanceModel.aggregate([
    {
      $match: {
        status: 'completed',
        completedAt: { $ne: null },
        createdAt: { $gte: since },
      },
    },
    {
      $project: {
        duration: { $subtract: ['$completedAt', '$startedAt'] },
      },
    },
    {
      $group: {
        _id: null,
        avgDuration: { $avg: '$duration' },
      },
    },
  ])
  const avgDurationMs = avgResult[0]?.avgDuration ?? 0
  const avgDurationSec = Math.round(avgDurationMs / 1000 * 100) / 100

  // Daily trend
  const dailyTrend = await FlowInstanceModel.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          status: '$status',
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.date': 1 } },
  ])

  // Reshape into { date, running, completed, failed, terminated, suspended }
  const dailyMap = new Map<string, Record<string, unknown>>()
  for (const row of dailyTrend) {
    const date = row._id.date
    if (!dailyMap.has(date)) {
      dailyMap.set(date, { date, running: 0, completed: 0, failed: 0, terminated: 0, suspended: 0 })
    }
    const entry = dailyMap.get(date)!
    entry[row._id.status] = row.count
  }
  const trend = Array.from(dailyMap.values())

  // Top workflows by execution count
  const topWorkflows = await FlowInstanceModel.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: '$definitionId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ])

  const topDefIds = topWorkflows.map((t) => t._id)
  const topDefs = await WorkflowModel.find({ _id: { $in: topDefIds } })
    .select('_id name')
    .lean()
  const topNameMap = new Map(topDefs.map((d) => [d._id, d.name]))

  const hotWorkflows = topWorkflows.map((t) => ({
    id: t._id,
    name: topNameMap.get(t._id) ?? 'Unknown',
    count: t.count,
  }))

  ctx.body = {
    success: true,
    data: {
      total,
      completed,
      failed,
      successRate,
      avgDurationSec,
      statusBreakdown: statusMap,
      dailyTrend: trend,
      hotWorkflows,
    },
  }
})

// ────────────────────────────────────────────
// GET /api/workflow-executions/:id
// 执行详情（含节点日志）
// ────────────────────────────────────────────
router.get('/:id', jwtAuth, async (ctx) => {
  const { id } = ctx.params

  const instance = await FlowInstanceModel.findById(id).lean() as Record<string, unknown> | null
  if (!instance) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Execution not found.' } }
    return
  }

  const [workflow, nodeLogs] = await Promise.all([
    WorkflowModel.findById(instance.definitionId).select('_id name').lean() as Promise<{ _id: string; name: string } | null>,
    NodeExecutionLogModel.find({ instanceId: id })
      .sort({ startedAt: 1 })
      .lean() as Promise<Array<Record<string, unknown>>>,
  ])

  const enrichedLogs = nodeLogs.map((log) => ({
    ...log,
    id: log._id,
  }))

  ctx.body = {
    success: true,
    data: {
      ...instance,
      id: instance._id,
      workflowName: workflow?.name ?? 'Unknown',
      nodeLogs: enrichedLogs,
    },
  }
})

export default router
