import Router from '@koa/router'
import { v4 as uuidv4, validate as uuidValidate } from 'uuid'
import { MenuModel } from '../models/Menu.js'
import { RoleModel } from '../models/Role.js'
import { authMiddleware, type JwtPayload } from '../middleware/auth.js'
import { requirePermission } from '../middleware/permission.js'
import { validate } from '../middleware/validate.js'
import { createMenuSchema, updateMenuSchema } from '../schemas/menuSchemas.js'

const requireAuth = authMiddleware({ required: true })
const router = new Router({ prefix: '/api/menus' })

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

interface MenuTreeNode {
  id: string
  name: string
  path: string
  icon: string
  type: string
  permission: string
  sort: number
  status: string
  component: string
  parentId: string | null
  routeType: string
  schemaId: string | null
  url: string
  children: MenuTreeNode[]
  [key: string]: unknown
}

/**
 * Build a tree structure from flat menu list.
 * Menus with parentId=null (or not found in the set) become root nodes.
 */
function buildTree(menus: Record<string, unknown>[]): MenuTreeNode[] {
  const map = new Map<string, MenuTreeNode>()
  const roots: MenuTreeNode[] = []

  for (const menu of menus) {
    map.set(menu.id as string, { ...(menu as MenuTreeNode), children: [] })
  }

  for (const menu of menus) {
    const node = map.get(menu.id as string)!
    const parentId = menu.parentId as string | null
    if (parentId && map.has(parentId)) {
      map.get(parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  function sortChildren(nodes: MenuTreeNode[]): void {
    nodes.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    for (const node of nodes) {
      sortChildren(node.children)
    }
  }

  sortChildren(roots)
  return roots
}

// ────────────────────────────────────────────
// GET /api/menus
// Lists menus. Supports ?tree=true for tree structure,
// plus search, type filter, status filter, and parentId filter.
// ────────────────────────────────────────────
router.get('/', requireAuth, requirePermission('menu:view'), async (ctx) => {
  const { search, type, status, parentId, tree } = ctx.query

  const filter: Record<string, unknown> = {}
  if (search) {
    filter.name = { $regex: escapeRegex(search as string), $options: 'i' }
  }
  if (type && ['menu', 'button'].includes(type as string)) {
    filter.type = type
  }
  if (status && ['active', 'inactive'].includes(status as string)) {
    filter.status = status
  }
  if (parentId !== undefined) {
    filter.parentId = parentId === 'null' ? null : parentId
  }

  const menus = await MenuModel.find(filter).sort({ sort: 1, createdAt: -1 })

  if (tree === 'true') {
    const items = menus.map((m) => m.toJSON())
    ctx.body = { success: true, data: buildTree(items) }
    return
  }

  ctx.body = {
    success: true,
    data: {
      items: menus.map((m) => m.toJSON()),
      total: menus.length,
    },
  }
})

// ────────────────────────────────────────────
// GET /api/menus/route
// Returns the menu tree visible to the current user (for frontend dynamic routing).
// Filters: only type='menu', status='active', and user has matching permission.
// ────────────────────────────────────────────
router.get('/route', requireAuth, async (ctx) => {
  const user = ctx.state.user as JwtPayload

  // Fetch user's roles and collect all permissions
  const roles = await RoleModel.find({ _id: { $in: user.roles } })
  const userPermissions = new Set(roles.flatMap(r => r.permissions))

  // Fetch all active menus
  const allMenus = await MenuModel.find({ status: 'active' }).sort({ sort: 1 })

  // Filter: only menu type (not button), and permission check
  // If menu has no permission, it's visible to all authenticated users
  const visibleMenus = allMenus
    .filter(m => {
      if (m.type !== 'menu') return false
      if (!m.permission) return true  // no permission required
      return userPermissions.has(m.permission)
    })
    .map(m => m.toJSON())

  // Also include parent menus that are needed for tree structure
  // even if the user doesn't have direct permission (the children have it)
  const visibleIds = new Set(visibleMenus.map(m => m.id as string))
  const allMenusJson = allMenus.map(m => m.toJSON())

  // Build full tree, then prune branches with no visible descendants
  function pruneTree(nodes: MenuTreeNode[]): MenuTreeNode[] {
    return nodes
      .map(node => {
        const children = pruneTree(node.children)
        const isVisible = visibleIds.has(node.id)
        if (!isVisible && children.length === 0) return null
        return { ...node, children }
      })
      .filter((n): n is MenuTreeNode => n !== null)
  }

  const fullTree = buildTree(allMenusJson)
  const routeTree = pruneTree(fullTree)

  ctx.body = { success: true, data: routeTree }
})

// ────────────────────────────────────────────
// GET /api/menus/:id
// ────────────────────────────────────────────
router.get('/:id', requireAuth, requirePermission('menu:view'), async (ctx) => {
  const { id } = ctx.params

  if (!uuidValidate(id)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Invalid UUID format.' } }
    return
  }

  const menu = await MenuModel.findById(id)
  if (!menu) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Menu not found.' } }
    return
  }

  ctx.body = { success: true, data: menu.toJSON() }
})

// ────────────────────────────────────────────
// POST /api/menus
// Creates a menu. Validates parentId exists if provided.
// ────────────────────────────────────────────
router.post('/', requireAuth, requirePermission('menu:create'), validate(createMenuSchema), async (ctx) => {
  const body = ctx.request.body as {
    name: string
    parentId: string | null
    path: string
    icon: string
    type: string
    permission: string
    sort: number
    status: string
    component: string
    microAppId: string | null
    target: '_self' | '_blank'
    routeType: 'schema' | 'micro-app' | 'link'
    schemaId: string | null
    url: string
  }

  // Validate parentId exists if not null
  if (body.parentId) {
    if (!uuidValidate(body.parentId)) {
      ctx.status = 400
      ctx.body = { success: false, error: { message: 'Invalid parent menu UUID.' } }
      return
    }
    const parent = await MenuModel.findById(body.parentId)
    if (!parent) {
      ctx.status = 400
      ctx.body = { success: false, error: { message: 'Parent menu not found.' } }
      return
    }
  }

  const menu = await MenuModel.create({
    _id: uuidv4(),
    name: body.name,
    parentId: body.parentId ?? null,
    path: body.path,
    icon: body.icon,
    type: body.type,
    permission: body.permission,
    sort: body.sort,
    status: body.status,
    component: body.component,
    microAppId: body.microAppId ?? null,
    target: body.target ?? '_self',
    routeType: body.routeType ?? 'micro-app',
    schemaId: body.schemaId ?? null,
    url: body.url ?? '',
  })

  ctx.status = 201
  ctx.body = { success: true, data: menu.toJSON() }
})

// ────────────────────────────────────────────
// PUT /api/menus/:id
// ────────────────────────────────────────────
router.put('/:id', requireAuth, requirePermission('menu:edit'), validate(updateMenuSchema), async (ctx) => {
  const { id } = ctx.params

  if (!uuidValidate(id)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Invalid UUID format.' } }
    return
  }

  const existing = await MenuModel.findById(id)
  if (!existing) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Menu not found.' } }
    return
  }

  const body = ctx.request.body as Record<string, unknown>

  // If parentId is being changed, validate it
  if (body.parentId !== undefined && body.parentId !== null) {
    const newParentId = body.parentId as string
    if (!uuidValidate(newParentId)) {
      ctx.status = 400
      ctx.body = { success: false, error: { message: 'Invalid parent menu UUID.' } }
      return
    }
    if (newParentId === id) {
      ctx.status = 400
      ctx.body = { success: false, error: { message: 'Cannot set menu as its own parent.' } }
      return
    }
    const parent = await MenuModel.findById(newParentId)
    if (!parent) {
      ctx.status = 400
      ctx.body = { success: false, error: { message: 'Parent menu not found.' } }
      return
    }

    // Cycle detection
    let current = parent
    while (current.parentId) {
      if (current.parentId === id) {
        ctx.status = 400
        ctx.body = { success: false, error: { message: 'Cannot move menu under its own descendant (cycle detected).' } }
        return
      }
      const ancestor = await MenuModel.findById(current.parentId)
      if (!ancestor) break
      current = ancestor
    }
  }

  const update: Record<string, unknown> = {}
  if (body.name !== undefined) update.name = body.name
  if (body.parentId !== undefined) update.parentId = body.parentId
  if (body.path !== undefined) update.path = body.path
  if (body.icon !== undefined) update.icon = body.icon
  if (body.type !== undefined) update.type = body.type
  if (body.permission !== undefined) update.permission = body.permission
  if (body.sort !== undefined) update.sort = body.sort
  if (body.status !== undefined) update.status = body.status
  if (body.component !== undefined) update.component = body.component
  if (body.microAppId !== undefined) update.microAppId = body.microAppId
  if (body.target !== undefined) update.target = body.target
  if (body.routeType !== undefined) update.routeType = body.routeType
  if (body.schemaId !== undefined) update.schemaId = body.schemaId
  if (body.url !== undefined) update.url = body.url

  const menu = await MenuModel.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true })

  ctx.body = { success: true, data: menu!.toJSON() }
})

// ────────────────────────────────────────────
// DELETE /api/menus/:id
// Deletes a menu. Rejects if it has children.
// ────────────────────────────────────────────
router.delete('/:id', requireAuth, requirePermission('menu:delete'), async (ctx) => {
  const { id } = ctx.params

  if (!uuidValidate(id)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Invalid UUID format.' } }
    return
  }

  const existing = await MenuModel.findById(id)
  if (!existing) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Menu not found.' } }
    return
  }

  const childCount = await MenuModel.countDocuments({ parentId: id })
  if (childCount > 0) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Cannot delete menu with children. Delete or move children first.' } }
    return
  }

  await MenuModel.findByIdAndDelete(id)

  ctx.status = 200
  ctx.body = { success: true, data: null }
})

export default router
