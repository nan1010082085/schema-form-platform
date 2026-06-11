import { v4 as uuidv4 } from 'uuid'
import { FormSchemaModel } from '../../models/FormSchema.js'
import { NodeExecutor } from './NodeExecutor.js'
import type { NodeExecutionContext, NodeExecutionResult } from './NodeExecutor.js'

/**
 * Supported operations for the Editor node.
 */
type EditorOperation = 'create_schema' | 'update_schema' | 'get_schema'

/**
 * Configuration for the Editor node executor.
 */
interface EditorNodeInputs {
  /** Operation to perform */
  operation: EditorOperation
  /** Name for the schema (used in create_schema) */
  schemaName?: string
  /** Schema type: 'form' or 'search_list' */
  schemaType?: 'form' | 'search_list'
  /** Fields definition (from AI generation or manual config) */
  fields?: Array<{
    id?: string
    type: string
    label: string
    name: string
    required?: boolean
    props?: Record<string, unknown>
  }>
  /** Template ID to clone from (optional) */
  templateId?: string
  /** Schema ID to update or get (for update_schema / get_schema) */
  schemaId?: string
  /** JSON data to set on the schema */
  schemaJson?: Record<string, unknown>
}

/**
 * EditorNodeExecutor — handles schema CRUD operations within workflow execution.
 *
 * Supports three operations:
 * - create_schema: Creates a new FormSchema with the given name and fields
 * - update_schema: Updates an existing FormSchema's json data
 * - get_schema: Retrieves an existing FormSchema by ID
 *
 * Output variables written to instance:
 *   - schemaId:   The schema's UUID
 *   - schemaName: The schema's display name
 *   - schemaJson: The schema's JSON content
 */
export class EditorNodeExecutor extends NodeExecutor {
  async execute(
    inputs: Record<string, unknown>,
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = inputs as unknown as EditorNodeInputs
    const operation: EditorOperation = config.operation ?? 'create_schema'

    switch (operation) {
      case 'create_schema':
        return this.createSchema(config, context)
      case 'update_schema':
        return this.updateSchema(config, context)
      case 'get_schema':
        return this.getSchema(config, context)
      default:
        return { success: false, error: `Unknown editor operation: ${operation}` }
    }
  }

  /**
   * Create a new FormSchema.
   * Uses templateId to clone if provided, otherwise builds from fields config.
   */
  private async createSchema(
    config: EditorNodeInputs,
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const schemaName = this.resolveString(config.schemaName, context.variables) ?? 'Untitled Schema'
    const schemaType = config.schemaType ?? 'form'

    let json: Record<string, unknown>

    if (config.templateId) {
      // Clone from template
      const template = await FormSchemaModel.findById(config.templateId)
      if (!template) {
        return { success: false, error: `Template not found: ${config.templateId}` }
      }
      json = { ...(template.json as Record<string, unknown>) }
    } else if (config.fields && config.fields.length > 0) {
      // Build schema JSON from field definitions
      json = this.buildSchemaFromFields(config.fields)
    } else if (config.schemaJson) {
      // Use provided schema JSON directly
      json = config.schemaJson
    } else {
      // Empty schema
      json = { items: [] }
    }

    const schemaId = uuidv4()
    const editId = uuidv4()

    const schema = await FormSchemaModel.create({
      _id: schemaId,
      editId,
      version: '1.0.0',
      name: schemaName,
      type: schemaType,
      status: 'draft',
      json,
      createdBy: context.instance.initiatedBy ?? null,
    })

    return {
      success: true,
      output: {
        schemaId: schema._id,
        schemaName: schema.name,
        schemaJson: schema.json,
      },
    }
  }

  /**
   * Update an existing FormSchema's JSON data.
   */
  private async updateSchema(
    config: EditorNodeInputs,
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const schemaId = this.resolveString(config.schemaId, context.variables)
    if (!schemaId) {
      return { success: false, error: 'schemaId is required for update_schema' }
    }

    const schema = await FormSchemaModel.findById(schemaId)
    if (!schema) {
      return { success: false, error: `Schema not found: ${schemaId}` }
    }

    const updateData: Record<string, unknown> = {}

    if (config.schemaName) {
      updateData.name = this.resolveString(config.schemaName, context.variables) ?? schema.name
    }

    if (config.schemaJson) {
      updateData.json = config.schemaJson
    } else if (config.fields && config.fields.length > 0) {
      updateData.json = this.buildSchemaFromFields(config.fields)
    }

    if (Object.keys(updateData).length > 0) {
      await FormSchemaModel.findByIdAndUpdate(schemaId, { $set: updateData })
    }

    const updated = await FormSchemaModel.findById(schemaId)

    return {
      success: true,
      output: {
        schemaId: updated!._id,
        schemaName: updated!.name,
        schemaJson: updated!.json,
      },
    }
  }

  /**
   * Retrieve an existing FormSchema by ID.
   */
  private async getSchema(
    config: EditorNodeInputs,
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const schemaId = this.resolveString(config.schemaId, context.variables)
    if (!schemaId) {
      return { success: false, error: 'schemaId is required for get_schema' }
    }

    const schema = await FormSchemaModel.findById(schemaId)
    if (!schema) {
      return { success: false, error: `Schema not found: ${schemaId}` }
    }

    return {
      success: true,
      output: {
        schemaId: schema._id,
        schemaName: schema.name,
        schemaJson: schema.json,
      },
    }
  }

  /**
   * Build a minimal schema JSON structure from field definitions.
   * Produces a flat list of widget items that the editor can render.
   */
  private buildSchemaFromFields(
    fields: NonNullable<EditorNodeInputs['fields']>,
  ): Record<string, unknown> {
    const items = fields.map((field, index) => ({
      id: field.id ?? `field_${index}_${Date.now()}`,
      type: field.type,
      props: {
        label: field.label,
        name: field.name,
        required: field.required ?? false,
        ...field.props,
      },
      position: {
        x: 0,
        y: index * 60,
        w: 12,
        h: 1,
      },
    }))

    return { items }
  }

  /**
   * Resolve a string value that may contain {{variable}} placeholders.
   * Replaces placeholders with values from the variables bag.
   */
  private resolveString(
    template: string | undefined,
    variables: Record<string, unknown>,
  ): string | undefined {
    if (!template) return undefined

    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_match, path: string) => {
      const value = this.resolvePath(variables, path)
      return value != null ? String(value) : `{{${path}}}`
    })
  }

  /**
   * Resolve a dot-notation path from an object.
   * e.g. "formData.name" -> variables.formData.name
   */
  private resolvePath(obj: Record<string, unknown>, path: string): unknown {
    const segments = path.split('.')
    let value: unknown = obj
    for (const seg of segments) {
      if (value == null || typeof value !== 'object') return undefined
      value = (value as Record<string, unknown>)[seg]
    }
    return value
  }
}
