import { describe, it, expect } from 'vitest'
import { createFlowRouter } from '../router/index'

describe('router', () => {
  const router = createFlowRouter()

  it('has instances route', () => {
    const route = router.getRoutes().find((r) => r.path === '/instances')
    expect(route).toBeDefined()
  })

  it('has designer route', () => {
    const route = router.getRoutes().find((r) => r.path === '/designer')
    expect(route).toBeDefined()
  })

  it('has list route under layout', () => {
    const route = router.getRoutes().find((r) => r.path === '/list')
    expect(route).toBeDefined()
  })

  it('has tasks route under layout', () => {
    const route = router.getRoutes().find((r) => r.path === '/tasks')
    expect(route).toBeDefined()
  })

  it('has instance detail route with param', () => {
    const route = router.getRoutes().find((r) => r.path === '/instance/:id')
    expect(route).toBeDefined()
  })

  it('has monitor route', () => {
    const route = router.getRoutes().find((r) => r.path === '/monitor')
    expect(route).toBeDefined()
  })

  it('has catch-all 404 route', () => {
    const route = router.getRoutes().find((r) => r.path === '/:pathMatch(.*)*')
    expect(route).toBeDefined()
  })

  it('redirects root to /list', async () => {
    const rootRoute = router.getRoutes().find((r) => r.path === '/')
    expect(rootRoute?.redirect).toBeDefined()
  })
})
