/**
 * Editor Tools — 表单 Schema 操作工具集
 *
 * 提供表单 Schema 的创建、更新和查询能力。
 */

import { v4 as uuidv4 } from 'uuid'
import { FormSchemaModel } from '../../models/FormSchema.js'
import { PublishedSchemaModel } from '../../models/PublishedSchema.js'
import { toolRegistry, type ToolDefinition, type ToolResult } from '../toolRegistry.js'

// ─── Helper Functions ──────────────────────────────────────────

function generateVersion(): string {
  const now = new Date()
  const pad = (n: number, len: number) => String(n).padStart(len, '0')
  return (
    pad(now.getFullYear(), 4) +
    pad(now.getMonth() + 1, 2) +
    pad(now.getDate(), 2) +
    pad(now.getHours(), 2) +
    pad(now.getMinutes(), 2) +
    pad(now.getSeconds(), 2)
  )
}

// ─── Tool Definitions ──────────────────────────────────────────

const createSchema: ToolDefinition = {
  name: 'editor.create_schema',
  description: '创建一个新的表单 Schema',
  parameters: [
    { name: 'name', type: 'string', description: 'Schema 名称', required: true },
    { name: 'type', type: 'string', description: 'Schema 类型', enum: ['form', 'search_list'], default: 'form' },
    { name: 'json', type: 'object', description: 'Schema JSON 结构', required: true },
    { name: 'thumbnail', type: 'string', description: '缩略图 URL' },
  ],
  handler: async (params): Promise<ToolResult> => {
    const { name, type = 'form', json, thumbnail } = params as {
      name: string
      type?: 'form' | 'search_list'
      json: Record<string, unknown>
      thumbnail?: string
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return { success: false, error: 'Field "name" is required and must be a non-empty string' }
    }

    if (!json || typeof json !== 'object') {
      return { success: false, error: 'Field "json" is required and must be an object' }
    }

    const editId = uuidv4()
    const schemaId = uuidv4()
    const version = generateVersion()

    const schema = await FormSchemaModel.create({
      _id: schemaId,
      editId,
      version,
      name: name.trim(),
      type: type === 'search_list' ? 'search_list' : 'form',
      json,
      ...(thumbnail ? { thumbnail } : {}),
    })

    return {
      success: true,
      data: {
        id: schema._id,
        editId: schema.editId,
        name: schema.name,
        type: schema.type,
        version: schema.version,
      },
      summary: `Created schema "${schema.name}" (${schema._id})`,
    }
  },
}

const updateSchema: ToolDefinition = {
  name: 'editor.update_schema',
  description: '更新已有的表单 Schema',
  parameters: [
    { name: 'schemaId', type: 'string', description: 'Schema ID', required: true },
    { name: 'name', type: 'string', description: '新的 Schema 名称' },
    { name: 'json', type: 'object', description: '新的 Schema JSON 结构' },
    { name: 'type', type: 'string', description: 'Schema 类型', enum: ['form', 'search_list'] },
    { name: 'thumbnail', type: 'string', description: '缩略图 URL' },
  ],
  handler: async (params): Promise<ToolResult> => {
    const { schemaId, name, json, type, thumbnail } = params as {
      schemaId: string
      name?: string
      json?: Record<string, unknown>
      type?: 'form' | 'search_list'
      thumbnail?: string
    }

    if (!schemaId) {
      return { success: false, error: 'Field "schemaId" is required' }
    }

    const existing = await FormSchemaModel.findById(schemaId)
    if (!existing) {
      return { success: false, error: `Schema "${schemaId}" not found` }
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return { success: false, error: 'Field "name" must be a non-empty string' }
      }
      updateData.name = name.trim()
    }
    if (json !== undefined) {
      if (typeof json !== 'object') {
        return { success: false, error: 'Field "json" must be an object' }
      }
      updateData.json = json
    }
    if (type !== undefined) {
      if (!['form', 'search_list'].includes(type)) {
        return { success: false, error: 'Field "type" must be "form" or "search_list"' }
      }
      updateData.type = type
    }
    if (thumbnail !== undefined) {
      updateData.thumbnail = thumbnail
    }

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: 'No fields to update' }
    }

    const newVersion = generateVersion()
    updateData.version = newVersion

    const schema = await FormSchemaModel.findByIdAndUpdate(schemaId, updateData, { new: true })

    return {
      success: true,
      data: {
        id: schema!._id,
        editId: schema!.editId,
        name: schema!.name,
        type: schema!.type,
        version: schema!.version,
      },
      summary: `Updated schema "${schema!.name}" (${schema!._id})`,
    }
  },
}

const getSchema: ToolDefinition = {
  name: 'editor.get_schema',
  description: '获取表单 Schema 详情',
  parameters: [
    { name: 'schemaId', type: 'string', description: 'Schema ID', required: true },
  ],
  handler: async (params): Promise<ToolResult> => {
    const { schemaId } = params as { schemaId: string }

    if (!schemaId) {
      return { success: false, error: 'Field "schemaId" is required' }
    }

    const schema = await FormSchemaModel.findById(schemaId)
    if (!schema) {
      return { success: false, error: `Schema "${schemaId}" not found` }
    }

    return {
      success: true,
      data: {
        id: schema._id,
        editId: schema.editId,
        name: schema.name,
        type: schema.type,
        status: schema.status,
        version: schema.version,
        json: schema.json,
        thumbnail: schema.thumbnail,
        createdAt: schema.createdAt,
        updatedAt: schema.updatedAt,
      },
    }
  },
}

// ─── Register Tools ────────────────────────────────────────────

export function registerEditorTools(): void {
  toolRegistry.register(createSchema)
  toolRegistry.register(updateSchema)
  toolRegistry.register(getSchema)
}
