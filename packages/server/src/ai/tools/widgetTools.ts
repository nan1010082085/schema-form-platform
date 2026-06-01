/**
 * Widget domain knowledge and validation.
 *
 * - query_widgets: returns the Widget type catalogue (from editorTools)
 * - validate_schema: validates a Widget[] tree for structural correctness
 */

import { v4 as uuidv4, validate as uuidValidate } from 'uuid'
import { WIDGET_CATALOGUE } from './editorTools.js'

const VALID_TYPES = new Set(WIDGET_CATALOGUE.map((w) => w.type))
const CONTAINER_TYPES = new Set(
  WIDGET_CATALOGUE.filter((w) => w.canHaveChildren).map((w) => w.type),
)

// ────────────────────────────────────────────
// Tool: query_widgets
// ────────────────────────────────────────────

interface QueryWidgetsResult {
  total: number
  widgets: typeof WIDGET_CATALOGUE
}

/**
 * Returns the full Widget type catalogue, optionally filtered by category.
 */
export function queryWidgets(category?: string): QueryWidgetsResult {
  const filtered = category
    ? WIDGET_CATALOGUE.filter((w) => w.category === category)
    : WIDGET_CATALOGUE

  return { total: filtered.length, widgets: filtered }
}

// ────────────────────────────────────────────
// Tool: validate_schema
// ────────────────────────────────────────────

interface ValidationError {
  path: string
  message: string
}

interface ValidateSchemaResult {
  valid: boolean
  errors: ValidationError[]
}

/**
 * Validates a Widget[] tree for structural correctness:
 * - Every widget has a valid type
 * - Every widget has a UUID id
 * - Layout components have children array
 * - Non-layout components do NOT have children
 * - Nested structure respects the "layout-only containers" rule
 */
export function validateSchema(widgets: Record<string, unknown>[]): ValidateSchemaResult {
  const errors: ValidationError[] = []

  function walk(nodes: Record<string, unknown>[], prefix: string, depth: number): void {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      const path = prefix ? `${prefix}[${i}]` : `[${i}]`

      // type check
      const type = node.type as string | undefined
      if (!type) {
        errors.push({ path: `${path}.type`, message: 'Widget is missing required "type" field.' })
        continue
      }
      if (!VALID_TYPES.has(type)) {
        errors.push({ path: `${path}.type`, message: `Invalid widget type "${type}".` })
        continue
      }

      // id check
      const id = node.id as string | undefined
      if (!id) {
        errors.push({ path: `${path}.id`, message: 'Widget is missing required "id" field.' })
      } else if (!uuidValidate(id)) {
        errors.push({ path: `${path}.id`, message: `Widget id "${id}" is not a valid UUID.` })
      }

      // position check
      const pos = node.position as Record<string, unknown> | undefined
      if (!pos || typeof pos !== 'object') {
        errors.push({ path: `${path}.position`, message: 'Widget is missing required "position" field.' })
      } else {
        for (const key of ['x', 'y', 'w', 'h']) {
          if (typeof pos[key] !== 'number' || (pos[key] as number) < 0) {
            errors.push({ path: `${path}.position.${key}`, message: `position.${key} must be a non-negative number.` })
          }
        }
      }

      // children rules
      const isContainer = CONTAINER_TYPES.has(type)
      const children = node.children as Record<string, unknown>[] | undefined

      if (isContainer) {
        if (!Array.isArray(children)) {
          errors.push({ path: `${path}.children`, message: `Container widget "${type}" must have a children array.` })
        } else {
          walk(children, path, depth + 1)
        }
      } else if (depth === 0 && !isContainer) {
        // Top-level non-container — violation of the nesting rule
        errors.push({
          path,
          message: `Basic/static widget "${type}" must be nested inside a layout container.`,
        })
      }
    }
  }

  walk(widgets, '', 0)
  return { valid: errors.length === 0, errors }
}
