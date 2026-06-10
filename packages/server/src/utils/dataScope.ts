/**
 * Data Scope Filter Utility
 *
 * Generates MongoDB query conditions based on a role's data_scope setting.
 * Used to enforce row-level data permissions across the platform.
 */

import type { DataScope, IRole } from '../models/Role.js'
import type { IUser } from '../models/User.js'
import { RoleModel } from '../models/Role.js'
import { UserModel } from '../models/User.js'
import { DeptModel } from '../models/Dept.js'

export interface DataScopeFilter {
  [key: string]: unknown
}

/**
 * Collect all descendant dept IDs (recursive) for a given set of dept IDs.
 * Includes the original IDs in the result.
 *
 * @param deptIds - Starting dept IDs
 * @param tenantId - Optional tenant ID to scope the query
 */
async function collectDescendantDeptIds(deptIds: string[], tenantId?: string): Promise<string[]> {
  const allIds = new Set(deptIds)
  let currentLevel = [...deptIds]

  while (currentLevel.length > 0) {
    const filter: Record<string, unknown> = { parentId: { $in: currentLevel } }
    // Explicitly pass tenantId to prevent tenantPlugin from injecting
    // an incorrect one, and to scope the query correctly
    if (tenantId) filter.tenantId = tenantId
    const children = await DeptModel.find(filter).select('_id')
    const nextLevel: string[] = []
    for (const child of children) {
      const childId = child._id as string
      if (!allIds.has(childId)) {
        allIds.add(childId)
        nextLevel.push(childId)
      }
    }
    currentLevel = nextLevel
  }

  return [...allIds]
}

/**
 * Get data scope filter for a user.
 *
 * Returns a MongoDB query condition object that can be merged into
 * any collection's find/aggregate query to enforce data permissions.
 *
 * @param userId - The user's UUID
 * @param tenantId - The tenant ID (for tenant-scoped role lookup)
 * @returns MongoDB filter object. Empty object means "no restriction" (all scope).
 *          For invalid/missing role, returns `{ _id: null }` (no data visible).
 */
export async function getDataScopeFilter(
  userId: string,
  tenantId?: string,
): Promise<DataScopeFilter> {
  const user = await UserModel.findById(userId) as (IUser & { _id: string }) | null
  if (!user) {
    return { _id: null }
  }

  // User's deptId is the anchor for dept-level scoping
  const userDeptId = user.deptId

  // Find the user's first role with a data_scope setting
  // If user has multiple roles, we use the most permissive one
  const roleIds = user.roles ?? []
  if (roleIds.length === 0) {
    return { _id: null }
  }

  const roleFilter: Record<string, unknown> = { _id: { $in: roleIds } }
  if (tenantId) roleFilter.tenantId = tenantId

  const roles = await RoleModel.find(roleFilter) as (IRole & { _id: string })[]

  if (roles.length === 0) {
    return { _id: null }
  }

  // Determine the effective scope: use the most permissive scope among all roles
  const scopePriority: Record<DataScope, number> = { all: 4, custom: 3, dept: 2, self: 1 }
  let effectiveRole = roles[0]
  let maxPriority = scopePriority[effectiveRole.data_scope]

  for (let i = 1; i < roles.length; i++) {
    const priority = scopePriority[roles[i].data_scope]
    if (priority > maxPriority) {
      maxPriority = priority
      effectiveRole = roles[i]
    }
  }

  const scope = effectiveRole.data_scope

  switch (scope) {
    case 'all':
      // No restriction
      return {}

    case 'dept':
      // User's own dept + all descendant depts
      if (!userDeptId) {
        return { deptId: null }
      }
      return { deptId: { $in: await collectDescendantDeptIds([userDeptId], tenantId) } }

    case 'self':
      // Only the user's own data
      return { userId }

    case 'custom': {
      // Specific depts + their descendants
      const customDeptIds = effectiveRole.dept_ids ?? []
      if (customDeptIds.length === 0) {
        return { deptId: null }
      }
      const allDeptIds = await collectDescendantDeptIds(customDeptIds, tenantId)
      return { deptId: { $in: allDeptIds } }
    }
  }
}
