import Router from '@koa/router'

const router = new Router({ prefix: '/api/data' })

const departments = ['tech', 'product', 'design', 'operations']
const statuses = ['enabled', 'disabled', 'pending']
const firstNames = ['张', '李', '王', '赵', '刘', '陈', '杨', '黄', '周', '吴']
const lastNames = ['伟', '芳', '娜', '敏', '静', '强', '磊', '洋', '勇', '艳']

function generateMockRecords(count: number) {
  const records = []
  for (let i = 1; i <= count; i++) {
    const firstName = firstNames[i % firstNames.length]
    const lastName = lastNames[(i * 3) % lastNames.length]
    records.push({
      id: String(i),
      name: `${firstName}${lastName}`,
      age: 20 + (i % 40),
      email: `user${i}@example.com`,
      department: departments[i % departments.length],
      status: statuses[i % statuses.length],
    })
  }
  return records
}

const mockRecords = generateMockRecords(50)

/**
 * GET /api/data/list
 */
router.get('/list', async (ctx) => {
  const { page: pageStr = '1', pageSize: pageSizeStr = '10', ...filters } = ctx.query
  const page = Math.max(1, parseInt(pageStr as string, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeStr as string, 10) || 10))

  let items = [...mockRecords]

  // Apply arbitrary filters
  for (const [key, value] of Object.entries(filters)) {
    if (value && typeof value === 'string' && key !== 'page' && key !== 'pageSize') {
      items = items.filter((item) => {
        const fieldValue = (item as Record<string, unknown>)[key]
        if (fieldValue === undefined) return false
        return String(fieldValue).toLowerCase().includes(value.toLowerCase())
      })
    }
  }

  const total = items.length
  const totalPages = Math.ceil(total / pageSize)
  const skip = (page - 1) * pageSize
  const paged = items.slice(skip, skip + pageSize)

  ctx.body = {
    success: true,
    data: {
      items: paged,
      total,
      page,
      pageSize,
      totalPages,
    },
  }
})

/**
 * GET /api/data/:id
 */
router.get('/:id', async (ctx) => {
  const { id } = ctx.params
  const record = mockRecords.find((r) => r.id === id)

  if (!record) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Record not found.' } }
    return
  }

  ctx.body = { success: true, data: record }
})

export default router
