/**
 * schemaValidate — Schema 结构校验 + 引用完整性校验
 *
 * Layer 1: 静态结构校验（type、field、position、options 等）
 * Layer 2: 引用完整性校验（watchFields、event target、formId 等）
 */
import { getComponentMap } from '@/widgets/registry'
import type { PartialWidget, SchemaType } from '@/widgets/base/types'
import { useBasicTypes, useBusinessTypes, useLayoutTypes } from '@/composables/useConstant'

/**
 * Fallback set of known schema types when the widget registry is not yet populated
 * (e.g. in test environments where registerAllWidgets() has not been called).
 * Must be kept in sync with widgets/index.ts registrations.
 */
const FALLBACK_SCHEMA_TYPES = new Set([
  'form', 'card', 'tabs', 'dialog',
  'single-col', 'double-col', 'triple-col', 'quad-col',
  'input', 'select', 'number', 'radio', 'checkbox', 'date', 'textarea', 'switch', 'slider',
  'button-list', 'title', 'divider', 'spacer', 'toolbar-buttons', 'button',
  'table', 'richtext', 'upload', 'banner', 'tree-layout', 'date-time-slot', 'time-picker',
  'file-list', 'transfer', 'cascader', 'rate', 'color-picker',
  'search-list', 'editable-table', 'tag-input', 'autocomplete',
])

/** Valid SchemaType values — lazily generated from widget registry */
let _validTypes: Set<string> | null = null
function getValidSchemaTypes(): Set<string> {
  if (!_validTypes) {
    const map = getComponentMap()
    const keys = Object.keys(map)
    _validTypes = keys.length > 0 ? new Set(keys) : FALLBACK_SCHEMA_TYPES
  }
  return _validTypes
}

/** Types that are containers (support children) */
const CONTAINER_TYPES = new Set<string>([
  'card', 'single-col', 'double-col', 'triple-col', 'quad-col',
  'form', 'dialog', 'tabs',
])

/** Get the category of a component type: 'basic', 'business', or 'layout' */
function getComponentCategory(type: string): 'basic' | 'business' | 'layout' {
  if (useBasicTypes().has(type as SchemaType)) return 'basic'
  if (useBusinessTypes().has(type as SchemaType)) return 'business'
  return 'layout'
}

/** Types that don't require a `field` property even though they're not layout types */
const NO_FIELD_TYPES = new Set<string>(['button', 'toolbar-buttons', 'title', 'banner', 'file-list', 'search-list'])

/** Types that typically have options (select/radio/checkbox) */
const OPTION_TYPES = new Set<string>(['select', 'radio', 'checkbox'])

export type ValidationRuleType =
  // Layer 1 — 静态结构
  | 'invalid-type' | 'missing-field' | 'duplicate-field' | 'deep-nesting' | 'empty-container'
  | 'nesting-violation' | 'required-field-missing-label' | 'options-empty-on-select'
  | 'api-config-invalid' | 'circular-linkage'
  | 'id-duplicate' | 'position-invalid' | 'options-format-invalid' | 'default-value-type-mismatch'
  // Layer 2 — 引用完整性
  | 'watch-field-orphan' | 'event-target-orphan' | 'event-target-missing'
  | 'form-id-orphan' | 'tab-key-orphan' | 'dialog-target-invalid'
  | 'trigger-event-orphan' | 'lifecycle-string-ignored'

export interface ValidationError {
  path: number[]
  type: ValidationRuleType
  severity: 'error' | 'warning' | 'info'
  message: string
  widgetId?: string
  widgetType?: string
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
function buildLinkageGraph(items: PartialWidget[]): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>()

  function walk(schemaItems: PartialWidget[]) {
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
export function validateSchema(schema: PartialWidget[]): ValidationResult {
  const errors: ValidationError[] = []
  const fieldCounts = new Map<string, number[]>() // field → [occurrence indices]

  function walk(items: PartialWidget[], path: number[], depth: number): void {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const itemPath = [...path, i]

      // 1. Invalid type
      if (!getValidSchemaTypes().has(item.type)) {
        errors.push({
          path: itemPath,
          type: 'invalid-type',
          severity: 'error',
          message: `Invalid type "${item.type}" at path [${itemPath.join(', ')}]`,
        })
      }

      // 2. Missing field on non-layout components
      if (!useLayoutTypes().has(item.type as SchemaType) && !NO_FIELD_TYPES.has(item.type) && !item.field) {
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

      // 6. Nesting violation: basic/business components cannot nest inside each other
      if (item.children?.length) {
        const parentCategory = getComponentCategory(item.type)
        if (parentCategory !== 'layout') {
          for (let j = 0; j < item.children.length; j++) {
            const child = item.children[j]
            const childCategory = getComponentCategory(child.type)
            if (childCategory !== 'layout' && childCategory !== parentCategory) {
              errors.push({
                path: [...itemPath, j],
                type: 'nesting-violation',
                severity: 'error',
                message: `${parentCategory === 'basic' ? '基础' : '业务'}组件 "${item.type}" 不允许嵌套${childCategory === 'basic' ? '基础' : '业务'}组件 "${child.type}"`,
              })
            }
          }
        }
      }

      // 7. [S17] required-field-missing-label
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

      // 9. position 校验
      if (item.position) {
        if (typeof item.position.w !== 'number' || typeof item.position.h !== 'number'
          || item.position.w <= 0 || item.position.h <= 0) {
          errors.push({
            path: itemPath,
            type: 'position-invalid',
            severity: 'error',
            message: `Component "${item.type}" has invalid position (w=${item.position.w}, h=${item.position.h})`,
            widgetId: item.id,
            widgetType: item.type,
          })
        }
      }

      // 10. options 格式校验
      if (item.options?.length) {
        for (let oi = 0; oi < item.options.length; oi++) {
          const opt = item.options[oi]
          if (!opt || typeof opt.label === 'undefined' || typeof opt.value === 'undefined') {
            errors.push({
              path: itemPath,
              type: 'options-format-invalid',
              severity: 'error',
              message: `options[${oi}] of "${item.field ?? item.type}" missing label or value`,
              widgetId: item.id,
              widgetType: item.type,
            })
          }
        }
      }

      // 11. defaultValue 类型检查（number 组件不应有字符串默认值）
      if (item.type === 'number' && item.defaultValue !== undefined && item.defaultValue !== null) {
        if (typeof item.defaultValue === 'string' && item.defaultValue !== '' && isNaN(Number(item.defaultValue))) {
          errors.push({
            path: itemPath,
            type: 'default-value-type-mismatch',
            severity: 'warning',
            message: `Number component "${item.field ?? ''}" has non-numeric defaultValue "${item.defaultValue}"`,
            widgetId: item.id,
            widgetType: item.type,
          })
        }
      }

      // 12. lifecycle 字符串表达式警告
      if (item.lifecycle) {
        for (const [hookName, hook] of Object.entries(item.lifecycle)) {
          if (typeof hook === 'string') {
            errors.push({
              path: itemPath,
              type: 'lifecycle-string-ignored',
              severity: 'warning',
              message: `lifecycle.${hookName} uses string expression but only function references are supported`,
              widgetId: item.id,
              widgetType: item.type,
            })
          }
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
  function collectOccurrences(items: PartialWidget[], path: number[]) {
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

  // ── Layer 2: 引用完整性校验 ──

  // 构建全局索引
  const allIds = new Set<string>()
  const allFields = new Set<string>()
  const formContainerIds = new Set<string>()
  const dialogIds = new Set<string>()
  const tabKeysMap = new Map<string, Set<string>>() // widgetId → Set<tabKey>
  const widgetPathMap = new Map<string, number[]>()
  const widgetTypeMap = new Map<string, string>()

  function collectGlobals(items: PartialWidget[], path: number[]) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const itemPath = [...path, i]
      if (item.id) {
        allIds.add(item.id)
        widgetPathMap.set(item.id, itemPath)
        widgetTypeMap.set(item.id, item.type)
      }
      if (item.field) allFields.add(item.field)
      if (item.type === 'form') formContainerIds.add(item.id)
      if (item.type === 'dialog') dialogIds.add(item.id)
      if (item.type === 'tabs' && item.props?.tabs) {
        const keys = new Set<string>()
        for (const tab of item.props.tabs as Array<{ key?: string }>) {
          if (tab.key) keys.add(tab.key)
        }
        tabKeysMap.set(item.id, keys)
      }
      if (item.children?.length) collectGlobals(item.children, itemPath)
    }
  }
  collectGlobals(schema, [])

  // 引用校验遍历
  function checkRefs(items: PartialWidget[], path: number[]) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const itemPath = [...path, i]

      // watchFields 引用校验
      if (item.linkages?.length) {
        for (const linkage of item.linkages) {
          for (const wf of linkage.watchFields) {
            if (!allFields.has(wf)) {
              errors.push({
                path: itemPath,
                type: 'watch-field-orphan',
                severity: 'error',
                message: `watchFields references non-existent field "${wf}"`,
                widgetId: item.id,
                widgetType: item.type,
              })
            }
          }
        }
      }

      // events 引用校验
      if (item.events?.length) {
        for (const evt of item.events) {
          for (const action of evt.actions) {
            // 需要 target 的动作
            const needsTarget = ['show', 'hide', 'set-value', 'open-dialog', 'close-dialog',
              'switch-tab', 'trigger-event', 'refresh'].includes(action.type)
            if (needsTarget) {
              if (!action.target) {
                errors.push({
                  path: itemPath,
                  type: 'event-target-missing',
                  severity: 'error',
                  message: `Event action "${action.type}" requires a target but none specified`,
                  widgetId: item.id,
                  widgetType: item.type,
                })
              } else if (!allIds.has(action.target)) {
                errors.push({
                  path: itemPath,
                  type: 'event-target-orphan',
                  severity: 'error',
                  message: `Event action "${action.type}" targets non-existent widget "${action.target}"`,
                  widgetId: item.id,
                  widgetType: item.type,
                })
              }
            }

            // open-dialog/close-dialog 目标必须是 dialog
            if ((action.type === 'open-dialog' || action.type === 'close-dialog') && action.target) {
              if (allIds.has(action.target) && !dialogIds.has(action.target)) {
                errors.push({
                  path: itemPath,
                  type: 'dialog-target-invalid',
                  severity: 'error',
                  message: `Action "${action.type}" targets "${action.target}" which is not a dialog component`,
                  widgetId: item.id,
                  widgetType: item.type,
                })
              }
            }
          }
        }
      }

      // formId 引用校验
      if (item.formId && !formContainerIds.has(item.formId)) {
        errors.push({
          path: itemPath,
          type: 'form-id-orphan',
          severity: 'error',
          message: `formId "${item.formId}" references non-existent form container`,
          widgetId: item.id,
          widgetType: item.type,
        })
      }

      // tabKey 引用校验
      if (item.tabKey) {
        // 找到包含此 tabKey 的 tabs 容器
        let found = false
        for (const [_tabsId, keys] of tabKeysMap) {
          if (keys.has(item.tabKey)) { found = true; break }
        }
        if (!found && tabKeysMap.size > 0) {
          errors.push({
            path: itemPath,
            type: 'tab-key-orphan',
            severity: 'warning',
            message: `tabKey "${item.tabKey}" not found in any tabs container`,
            widgetId: item.id,
            widgetType: item.type,
          })
        }
      }

      if (item.children?.length) checkRefs(item.children, itemPath)
    }
  }
  checkRefs(schema, [])

  // ID 重复检测
  const idOccurrences = new Map<string, number[][]>()
  function collectIdOccurrences(items: PartialWidget[], path: number[]) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const itemPath = [...path, i]
      if (item.id) {
        const occs = idOccurrences.get(item.id) ?? []
        occs.push(itemPath)
        idOccurrences.set(item.id, occs)
      }
      if (item.children?.length) collectIdOccurrences(item.children, itemPath)
    }
  }
  collectIdOccurrences(schema, [])
  for (const [id, occurrences] of idOccurrences) {
    if (occurrences.length > 1) {
      errors.push({
        path: occurrences[0],
        type: 'id-duplicate',
        severity: 'error',
        message: `Duplicate widget id "${id}" found ${occurrences.length} times`,
        firstPath: occurrences[0],
        duplicatePath: occurrences[1],
      })
    }
  }

  // Sort: errors first, then warnings, then info
  const severityOrder = { error: 0, warning: 1, info: 2 }
  errors.sort((a, b) => {
    const sa = severityOrder[a.severity] ?? 1
    const sb = severityOrder[b.severity] ?? 1
    return sa - sb
  })

  const hasErrors = errors.some((e) => e.severity === 'error')

  return { valid: !hasErrors, errors }
}
