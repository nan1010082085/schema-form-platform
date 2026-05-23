import Router from '@koa/router'

const router = new Router({ prefix: '/api/dict' })

const dictionaries: Record<string, Array<{ label: string; value: string }>> = {
  city: [
    { label: '北京', value: 'beijing' },
    { label: '上海', value: 'shanghai' },
    { label: '广州', value: 'guangzhou' },
    { label: '深圳', value: 'shenzhen' },
    { label: '杭州', value: 'hangzhou' },
  ],
  gender: [
    { label: '男', value: 'male' },
    { label: '女', value: 'female' },
    { label: '其他', value: 'other' },
  ],
  status: [
    { label: '启用', value: 'enabled' },
    { label: '禁用', value: 'disabled' },
    { label: '待审核', value: 'pending' },
  ],
  department: [
    { label: '技术部', value: 'tech' },
    { label: '产品部', value: 'product' },
    { label: '设计部', value: 'design' },
    { label: '运营部', value: 'operations' },
  ],
}

/**
 * GET /api/dict/:code
 */
router.get('/:code', async (ctx) => {
  const { code } = ctx.params
  const items = dictionaries[code] ?? []
  ctx.body = { success: true, data: items }
})

export default router
