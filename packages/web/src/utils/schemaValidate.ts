/**
 * schemaValidate — Schema structure validation (Sprint 11 / S17扩展)
 *
 * Validates FormSchemaItem[] for common issues.
 * Sprint 17 added: required-field-missing-label, options-empty-on-select,
 *   api-config-invalid, circular-linkage + P2 improvements
 */
import { compMap } from '@/components/FormGrid/compMap'
import type { FormSchemaItem } from '@/components/FormGrid/types'

/** Valid SchemaType values — dynamically generated from compMap */
const VALID_SCHEMA_TYPES = new Set(Object.keys(compMap))

/** Types that are containers (support children) */
const CONTAINER_TYPES = new Set<string>(['card', 'page', 'toolbar'])

/** Types that are layout components and don't require a `field` property */
const LAYOUT_TYPES = new Set<string>([
  'grid-row', 'grid-col', 'page', 'toolbar', 'card', 'title', 'divider', 'spacer', 'steps', 'tabs',
])

/** Types that don't require a `field` property even though they're not layout types */
const NO_FIELD_TYPES = new Set<string>(['button-list', 'pagination', 'file-list', 'file-preview', 'toolbar-buttons', 'search-list'])

/** Types that typically have options (select/radio/checkbox) */
const OPTION_TYPES = new Set<string>(['select', 'radio', 'checkbox'])

export interface ValidationError {
  path: number[]
  type: 'duplicate-field' | 'empty-container' | 'deep-nesting' | 'invalid-type' | 'missing-field'
    | 'required-field-missing-label' | 'options-empty-on-select' | 'api-config-invalid' | 'circular-linkage'
  severity: 'error' | 'warning'
  message: string
  /** For duplicate-field: first occurrence path */
  firstPath?: number[]
  /** For duplicate-field: duplicate occurrence path */
  duplicatePath?: number[]
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/** Build a dependency graph from linkage rules */
function buildLinkageGraph(items: FormSchemaItem[]): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>()

  function walk(schemaItems: FormSchemaItem[]) {
    for (const item of schemaItems) {
      if (item.field && item.linkages?.length) {
        const deps = new Set<string>()
        for (const linkage of item.linkages) {
          for (const wf of linkage.watchFields) {
            deps.add(wf)
          }
        }
        graph.set(item.field, deps)
      }
      if (item.children?.length) walk(item.children)
    }
  }

  walk(items)
  return graph
}

/** DFS cycle detection in linkage dependency graph */
function detectLinkageCycles(graph: Map<string, Set<string>>): { field: string; cycle: string[] }[] {
  const cycles: { field: string; cycle: string[] }[] = []
  const visited = new Set<string>()
  const inStack = new Set<string>()

  function dfs(field: string, path: string[]): boolean {
    if (inStack.has(field)) {
      const cycleStart = path.indexOf(field)
      cycles.push({ field, cycle: path.slice(cycleStart).concat(field) })
      return true
    }
    if (visited.has(field)) return false

    visited.add(field)
    inStack.add(field)
    path.push(field)

    const deps = graph.get(field)
    if (deps) {
      for (const dep of deps) {
        if (graph.has(dep)) dfs(dep, path)
      }
    }

    path.pop()
    inStack.delete(field)
    return false
  }

  for (const field of graph.keys()) {
    if (!visited.has(field)) dfs(field, [])
  }

  return cycles
}

/**
 * Validate a schema tree for structural issues.
 */
export function validateSchema(schema: FormSchemaItem[]): ValidationResult {
  const errors: ValidationError[] = []
  const fieldCounts = new Map<string, number[]>() // field → [occurrence indices]

  function walk(items: FormSchemaItem[], path: number[], depth: number): void {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const itemPath = [...path, i]

      // 1. Invalid type
      if (!VALID_SCHEMA_TYPES.has(item.type)) {
        errors.push({
          path: itemPath,
          type: 'invalid-type',
          severity: 'error',
          message: `Invalid type "${item.type}" at path [${itemPath.join(', ')}]`,
        })
      }

      // 2. Missing field on non-layout components
      if (!LAYOUT_TYPES.has(item.type) && !NO_FIELD_TYPES.has(item.type) && !item.field) {
        errors.push({
          path: itemPath,
          type: 'missing-field',
          severity: 'error',
          message: `Component "${item.type}" at path [${itemPath.join(', ')}] is missing a field name`,
        })
      }

      // 3. Duplicate field names — with path tracking
      if (item.field) {
        fieldCounts.set(item.field, [...(fieldCounts.get(item.field) ?? []), ...itemPath])
      }

      // 4. Deep nesting
      if (depth > 5) {
        errors.push({
          path: itemPath,
          type: 'deep-nesting',
          severity: 'warning',
          message: `Item at path [${itemPath.join(', ')}] exceeds 5 levels of nesting (depth: ${depth})`,
        })
      }

      // 5. Empty container
      if (CONTAINER_TYPES.has(item.type) && (!item.children || item.children.length === 0)) {
        errors.push({
          path: itemPath,
          type: 'empty-container',
          severity: 'warning',
          message: `Container "${item.type}" at path [${itemPath.join(', ')}] has no children`,
        })
      }

      // 6. [S17] required-field-missing-label
      if (item.field && item.linkages?.some(l => l.type === 'required') && !item.label) {
        errors.push({
          path: itemPath,
          type: 'required-field-missing-label',
          severity: 'warning',
          message: `Field "${item.field}" has required linkage but no label set`,
        })
      }

      // 7. [S17] options-empty-on-select
      if (OPTION_TYPES.has(item.type)) {
        const hasOptions = item.options?.length
        const hasApi = !!item.api?.url || !!item.api?.dictCode
        if (!hasOptions && !hasApi) {
          errors.push({
            path: itemPath,
            type: 'options-empty-on-select',
            severity: 'warning',
            message: `"${item.type}" component "${item.field ?? ''}" has no options or API configured`,
          })
        }
      }

      // 8. [S17] api-config-invalid
      if (item.api) {
        if (item.api.url === '' || item.api.url === undefined) {
          errors.push({
            path: itemPath,
            type: 'api-config-invalid',
            severity: 'error',
            message: `API config for field "${item.field ?? ''}" has an empty URL`,
          })
        }
        if (item.api.method && !['get', 'post'].includes(item.api.method)) {
          errors.push({
            path: itemPath,
            type: 'api-config-invalid',
            severity: 'error',
            message: `API config for field "${item.field ?? ''}" has invalid method "${item.api.method}"`,
          })
        }
      }

      // Recurse into children
      if (item.children?.length) {
        walk(item.children, itemPath, depth + 1)
      }
    }
  }

  walk(schema, [], 0)

  // Report duplicate fields with path info
  // (collect per unique field across the walk)
  const fieldOccurrences = new Map<string, number[][]>()
  function collectOccurrences(items: FormSchemaItem[], path: number[]) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const itemPath = [...path, i]
      if (item.field) {
        const occs = fieldOccurrences.get(item.field) ?? []
        occs.push(itemPath)
        fieldOccurrences.set(item.field, occs)
      }
      if (item.children?.length) collectOccurrences(item.children, itemPath)
    }
  }
  collectOccurrences(schema, [])

  for (const [fieldName, occurrences] of fieldOccurrences) {
    if (occurrences.length > 1) {
      errors.push({
        path: occurrences[0],
        type: 'duplicate-field',
        severity: 'error',
        message: `Duplicate field name "${fieldName}" found ${occurrences.length} times`,
        firstPath: occurrences[0],
        duplicatePath: occurrences[1],
      })
    }
  }

  // 9. [S17] circular-linkage
  const linkageGraph = buildLinkageGraph(schema)
  const cycles = detectLinkageCycles(linkageGraph)
  for (const { field: _field, cycle } of cycles) {
    errors.push({
      path: [],
      type: 'circular-linkage',
      severity: 'error',
      message: `Circular linkage detected: ${cycle.join(' → ')}`,
    })
  }

  // Sort: errors first, then warnings
  errors.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'error' ? -1 : 1
    return 0
  })

  const hasErrors = errors.some((e) => e.severity === 'error')

  return { valid: !hasErrors, errors }
}
