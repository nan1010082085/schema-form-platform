/**
 * Role data_scope & getDataScopeFilter Tests
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import http from 'node:http'
import Koa from 'koa'
import cors from '@koa/cors'
import bodyParser from 'koa-bodyparser'
import { v4 as uuidv4 } from 'uuid'
import { errorHandler } from '../middleware/errorHandler.js'
import rolesRouter from '../routes/roles.js'
import { RoleModel, type DataScope } from '../models/Role.js'
import { UserModel } from '../models/User.js'
import { DeptModel } from '../models/Dept.js'
import { getDataScopeFilter } from '../utils/dataScope.js'
import { connectDatabase, mongoose } from '../config/database.js'

const BASE = 'http://localhost:3008'

let server: ReturnType<typeof http.createServer> | null = null

function request(method: string, path: string, body?: unknown): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE)
    const options: http.RequestOptions = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' },
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try { resolve({ status: res.statusCode ?? 0, body: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode ?? 0, body: data.substring(0, 500) }) }
      })
    })

    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

beforeAll(async () => {
  await connectDatabase()

  const app = new Koa()
  app.use(errorHandler)
  app.use(bodyParser())
  app.use(cors({ origin: () => '' }))
  app.use(rolesRouter.routes())
  app.use(rolesRouter.allowedMethods())

  await new Promise<void>((resolve) => {
    server = app.listen(3008, () => resolve())
  })
}, 30000)

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve) => { server!.close(() => resolve()) })
  }
  await mongoose.disconnect()
})

beforeEach(async () => {
  await RoleModel.deleteMany({})
  await UserModel.deleteMany({})
  await DeptModel.deleteMany({})
})

// ── Role CRUD with data_scope ──

describe('Role API with data_scope', () => {
  it('POST /api/roles creates a role with default data_scope=all', async () => {
    const { status, body } = await request('POST', '/api/roles', { name: 'Admin' })

    expect(status).toBe(201)
    expect(body.data.data_scope).toBe('all')
    expect(body.data.dept_ids).toEqual([])
  })

  it('POST /api/roles creates a role with data_scope=dept', async () => {
    const { status, body } = await request('POST', '/api/roles', {
      name: 'Dept Manager',
      data_scope: 'dept',
    })

    expect(status).toBe(201)
    expect(body.data.data_scope).toBe('dept')
  })

  it('POST /api/roles creates a role with data_scope=custom and dept_ids', async () => {
    const deptA = uuidv4()
    const deptB = uuidv4()
    const { status, body } = await request('POST', '/api/roles', {
      name: 'Custom Role',
      data_scope: 'custom',
      dept_ids: [deptA, deptB],
    })

    expect(status).toBe(201)
    expect(body.data.data_scope).toBe('custom')
    expect(body.data.dept_ids).toEqual([deptA, deptB])
  })

  it('POST /api/roles rejects invalid data_scope', async () => {
    const { status } = await request('POST', '/api/roles', {
      name: 'Bad',
      data_scope: 'invalid',
    })

    expect(status).toBe(400)
  })

  it('PUT /api/roles/:id updates data_scope', async () => {
    const role = await RoleModel.create({ name: 'Updater' })

    const { status, body } = await request('PUT', `/api/roles/${role._id}`, {
      data_scope: 'self',
    })

    expect(status).toBe(200)
    expect(body.data.data_scope).toBe('self')
  })

  it('PUT /api/roles/:id updates dept_ids for custom scope', async () => {
    const role = await RoleModel.create({ name: 'Custom Update' })
    const deptId = uuidv4()

    const { status, body } = await request('PUT', `/api/roles/${role._id}`, {
      data_scope: 'custom',
      dept_ids: [deptId],
    })

    expect(status).toBe(200)
    expect(body.data.data_scope).toBe('custom')
    expect(body.data.dept_ids).toEqual([deptId])
  })

  it('GET /api/roles returns data_scope in list', async () => {
    await RoleModel.create({ name: 'A', data_scope: 'all' })
    await RoleModel.create({ name: 'B', data_scope: 'self' })

    const { status, body } = await request('GET', '/api/roles')

    expect(status).toBe(200)
    const scopes = body.data.items.map((r: any) => r.data_scope)
    expect(scopes).toContain('all')
    expect(scopes).toContain('self')
  })
})

// ── getDataScopeFilter utility ──

describe('getDataScopeFilter', () => {
  // Scenario 1: data_scope = all
  it('returns empty filter for scope=all', async () => {
    const roleId = uuidv4()
    const userId = uuidv4()
    await RoleModel.create({ _id: roleId, name: 'All', data_scope: 'all' })
    await UserModel.create({ _id: userId, username: 'u1', password: 'p', displayName: 'U1', roles: [roleId] })

    const filter = await getDataScopeFilter(userId)

    expect(filter).toEqual({})
  })

  // Scenario 2: data_scope = self
  it('returns userId filter for scope=self', async () => {
    const roleId = uuidv4()
    const userId = uuidv4()
    await RoleModel.create({ _id: roleId, name: 'Self', data_scope: 'self' })
    await UserModel.create({ _id: userId, username: 'u2', password: 'p', displayName: 'U2', roles: [roleId] })

    const filter = await getDataScopeFilter(userId)

    expect(filter).toEqual({ userId })
  })

  // Scenario 3: data_scope = dept
  it('returns deptId filter with descendants for scope=dept', async () => {
    const roleId = uuidv4()
    const userId = uuidv4()
    const parentDeptId = uuidv4()
    const childDeptId = uuidv4()

    await DeptModel.create({ _id: parentDeptId, name: 'Parent' })
    await DeptModel.create({ _id: childDeptId, name: 'Child', parentId: parentDeptId })
    await RoleModel.create({ _id: roleId, name: 'Dept', data_scope: 'dept' })
    await UserModel.create({
      _id: userId, username: 'u3', password: 'p', displayName: 'U3',
      roles: [roleId], deptId: parentDeptId,
    })

    const filter = await getDataScopeFilter(userId) as Record<string, unknown>

    expect(filter.deptId).toBeDefined()
    const deptIds = (filter.deptId as Record<string, unknown>).$in as string[]
    expect(deptIds).toContain(parentDeptId)
    expect(deptIds).toContain(childDeptId)
  })

  // Scenario 4: data_scope = custom
  it('returns deptId filter from custom dept_ids with descendants', async () => {
    const roleId = uuidv4()
    const userId = uuidv4()
    const deptA = uuidv4()
    const deptAChild = uuidv4()
    const deptB = uuidv4()

    await DeptModel.create({ _id: deptA, name: 'Dept A' })
    await DeptModel.create({ _id: deptAChild, name: 'Dept A Child', parentId: deptA })
    await DeptModel.create({ _id: deptB, name: 'Dept B' })
    await RoleModel.create({ _id: roleId, name: 'Custom', data_scope: 'custom', dept_ids: [deptA, deptB] })
    await UserModel.create({ _id: userId, username: 'u4', password: 'p', displayName: 'U4', roles: [roleId] })

    const filter = await getDataScopeFilter(userId) as Record<string, unknown>

    expect(filter.deptId).toBeDefined()
    const deptIds = (filter.deptId as Record<string, unknown>).$in as string[]
    expect(deptIds).toContain(deptA)
    expect(deptIds).toContain(deptAChild)
    expect(deptIds).toContain(deptB)
  })

  it('returns {_id: null} for user with no roles', async () => {
    const userId = uuidv4()
    await UserModel.create({ _id: userId, username: 'norole', password: 'p', displayName: 'No Role', roles: [] })

    const filter = await getDataScopeFilter(userId)

    expect(filter).toEqual({ _id: null })
  })

  it('returns {_id: null} for non-existent user', async () => {
    const filter = await getDataScopeFilter(uuidv4())

    expect(filter).toEqual({ _id: null })
  })

  it('uses most permissive scope when user has multiple roles', async () => {
    const selfRoleId = uuidv4()
    const allRoleId = uuidv4()
    const userId = uuidv4()

    await RoleModel.create({ _id: selfRoleId, name: 'Self', data_scope: 'self' })
    await RoleModel.create({ _id: allRoleId, name: 'All', data_scope: 'all' })
    await UserModel.create({ _id: userId, username: 'multi', password: 'p', displayName: 'Multi', roles: [selfRoleId, allRoleId] })

    const filter = await getDataScopeFilter(userId)

    // 'all' is more permissive than 'self', so filter should be empty
    expect(filter).toEqual({})
  })

  it('returns {deptId: null} for custom scope with empty dept_ids', async () => {
    const roleId = uuidv4()
    const userId = uuidv4()

    await RoleModel.create({ _id: roleId, name: 'Empty Custom', data_scope: 'custom', dept_ids: [] })
    await UserModel.create({ _id: userId, username: 'empty', password: 'p', displayName: 'Empty', roles: [roleId] })

    const filter = await getDataScopeFilter(userId)

    expect(filter).toEqual({ deptId: null })
  })
})
