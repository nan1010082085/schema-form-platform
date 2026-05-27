import { FlowDefinitionModel } from '../flow-models/FlowDefinition.js'

export class FlowPermissionService {
  async checkEditPermission(userId: string, definitionId: string): Promise<boolean> {
    const def = await FlowDefinitionModel.findById(definitionId)
    if (!def) return false
    // Creator always has permission
    if (def.createdBy === userId) return true
    // Check editors list (empty = no restriction)
    if (!def.permissions?.editors || def.permissions.editors.length === 0) return true
    return def.permissions.editors.includes(userId)
  }

  async checkLaunchPermission(userId: string, definitionId: string): Promise<boolean> {
    const def = await FlowDefinitionModel.findById(definitionId)
    if (!def) return false
    if (def.status !== 'published') return false
    if (!def.permissions?.launchers || def.permissions.launchers.length === 0) return true
    return def.permissions.launchers.includes(userId)
  }

  async checkViewPermission(userId: string, definitionId: string): Promise<boolean> {
    const def = await FlowDefinitionModel.findById(definitionId)
    if (!def) return false
    if (def.createdBy === userId) return true
    if (!def.permissions?.viewers || def.permissions.viewers.length === 0) return true
    return def.permissions.viewers.includes(userId)
  }
}

export const flowPermissionService = new FlowPermissionService()
