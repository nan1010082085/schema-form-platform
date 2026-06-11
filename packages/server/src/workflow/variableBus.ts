/**
 * VariableBus — unified variable bus for workflow execution.
 *
 * Design inspired by Dify's variable system:
 * - Variables are stored as a flat key-value map scoped by a namespace
 * - Namespace format: "nodeId.output.fieldName" or "input.varName" or "env.varName"
 * - Template references like {{nodeId.output.field}} are resolved against the bus
 * - Each variable carries its type and source metadata for validation
 */

import type { VariableDefinition, VariableSource, VariableType, NodeOutput } from './types.js'

// ─── Internal entry ───────────────────────────────────────────────

interface BusEntry {
  value: unknown
  type: VariableType
  source: VariableSource
  /** ISO timestamp when the value was last written */
  updatedAt: string
}

// ─── Errors ───────────────────────────────────────────────────────

export class VariableNotFoundError extends Error {
  constructor(public readonly key: string) {
    super(`Variable not found: ${key}`)
    this.name = 'VariableNotFoundError'
  }
}

export class VariableTypeError extends Error {
  constructor(
    public readonly key: string,
    public readonly expected: VariableType,
    public readonly actual: VariableType,
  ) {
    super(`Variable type mismatch for "${key}": expected ${expected}, got ${actual}`)
    this.name = 'VariableTypeError'
  }
}

// ─── Type guards ──────────────────────────────────────────────────

function inferType(value: unknown): VariableType {
  if (value === null || value === undefined) return 'string'
  if (Array.isArray(value)) return 'array'
  const t = typeof value
  if (t === 'string') return 'string'
  if (t === 'number') return 'number'
  if (t === 'boolean') return 'boolean'
  if (t === 'object') return 'object'
  return 'string'
}

// ─── VariableBus ──────────────────────────────────────────────────

export class VariableBus {
  private readonly store = new Map<string, BusEntry>()

  // ── Write ─────────────────────────────────────────────────────

  /**
   * Set a variable value.
   *
   * @param key     Namespaced key, e.g. "node1.output.result" or "input.userName"
   * @param value   The value to store
   * @param type    Expected variable type (validated against value)
   * @param source  Where the variable comes from
   */
  set(key: string, value: unknown, type: VariableType, source: VariableSource): void {
    const inferred = inferType(value)
    if (inferred !== type) {
      throw new VariableTypeError(key, type, inferred)
    }
    this.store.set(key, {
      value,
      type,
      source,
      updatedAt: new Date().toISOString(),
    })
  }

  /**
   * Set a variable without strict type checking (useful for dynamic / mixed outputs).
   */
  setUnchecked(key: string, value: unknown, source: VariableSource): void {
    this.store.set(key, {
      value,
      type: inferType(value),
      source,
      updatedAt: new Date().toISOString(),
    })
  }

  // ── Read ──────────────────────────────────────────────────────

  /**
   * Get a variable value. Throws VariableNotFoundError if missing.
   */
  get(key: string): unknown {
    const entry = this.store.get(key)
    if (!entry) throw new VariableNotFoundError(key)
    return entry.value
  }

  /**
   * Get a variable value, returning defaultValue when missing (no throw).
   */
  getOrDefault(key: string, defaultValue: unknown = undefined): unknown {
    const entry = this.store.get(key)
    return entry ? entry.value : defaultValue
  }

  /**
   * Get full metadata for a variable.
   */
  getEntry(key: string): BusEntry | undefined {
    return this.store.get(key)
  }

  /**
   * Check whether a variable exists.
   */
  has(key: string): boolean {
    return this.store.has(key)
  }

  // ── Bulk operations for node outputs ──────────────────────────

  /**
   * Write all outputs from a NodeOutput into the bus.
   *
   * Each field in nodeOutput.data is stored as "{nodeId}.output.{field}".
   * If data is a single value (not an object), it is stored as "{nodeId}.output".
   */
  writeNodeOutputs(nodeOutput: NodeOutput): void {
    const { nodeId, data } = nodeOutput
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      for (const [field, val] of Object.entries(data)) {
        this.setUnchecked(`${nodeId}.output.${field}`, val, 'node-output')
      }
    } else {
      this.setUnchecked(`${nodeId}.output`, data, 'node-output')
    }
  }

  /**
   * Inject input variables (source='input') from a VariableDefinition[] and a values map.
   * Missing values fall back to defaultValue from the definition.
   */
  injectInputs(definitions: VariableDefinition[], values: Record<string, unknown>): void {
    for (const def of definitions) {
      const key = `input.${def.name}`
      const val = values[def.name] ?? def.defaultValue
      if (val !== undefined) {
        this.set(key, val, def.type, 'input')
      }
    }
  }

  /**
   * Inject environment variables (source='env').
   */
  injectEnv(definitions: VariableDefinition[], values: Record<string, unknown>): void {
    for (const def of definitions) {
      const key = `env.${def.name}`
      const val = values[def.name] ?? def.defaultValue
      if (val !== undefined) {
        this.set(key, val, def.type, 'env')
      }
    }
  }

  // ── Template resolution ───────────────────────────────────────

  /**
   * Resolve all {{...}} references in a string against the bus.
   *
   * Supported patterns:
   *   {{nodeId.output.field}}  →  get("nodeId.output.field")
   *   {{input.varName}}        →  get("input.varName")
   *   {{env.varName}}          →  get("env.varName")
   *
   * If a reference cannot be resolved, it is left as-is (no throw)
   * so that partial resolution is possible during multi-step execution.
   */
  resolveTemplate(template: string): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (_match, ref: string) => {
      const key = ref.trim()
      try {
        const val = this.get(key)
        if (val === undefined || val === null) return ''
        if (typeof val === 'object') return JSON.stringify(val)
        return String(val)
      } catch {
        // Leave unresolved references intact
        return `{{${key}}}`
      }
    })
  }

  /**
   * Deep-resolve an arbitrary value:
   * - strings: template-resolved
   * - arrays: each element resolved
   * - objects: each value resolved
   * - primitives: returned as-is
   */
  resolveValue(value: unknown): unknown {
    if (typeof value === 'string') {
      // Only resolve if it contains template markers
      if (value.includes('{{')) {
        return this.resolveTemplate(value)
      }
      return value
    }
    if (Array.isArray(value)) {
      return value.map((v) => this.resolveValue(v))
    }
    if (value !== null && typeof value === 'object') {
      const resolved: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        resolved[k] = this.resolveValue(v)
      }
      return resolved
    }
    return value
  }

  // ── Condition evaluation ──────────────────────────────────────

  /**
   * Evaluate a simple condition expression against the bus.
   *
   * Supported operators: ==, !=, >, <, >=, <=, contains, not_contains
   * Format: "{{nodeId.output.field}} == 'value'" or "{{input.amount}} > 100"
   *
   * Returns false for unresolvable expressions (graceful degradation).
   */
  evaluateCondition(expression: string): boolean {
    const resolved = this.resolveTemplate(expression)

    // Try to match "left op right" pattern
    const match = resolved.match(
      /^(.+?)\s*(==|!=|>=|<=|>|<|contains|not_contains)\s*(.+)$/,
    )
    if (!match) return false

    const left = this.parsePrimitive(match[1].trim())
    const op = match[2]
    const right = this.parsePrimitive(match[3].trim())

    switch (op) {
      case '==':
        return left === right
      case '!=':
        return left !== right
      case '>':
        return Number(left) > Number(right)
      case '<':
        return Number(left) < Number(right)
      case '>=':
        return Number(left) >= Number(right)
      case '<=':
        return Number(left) <= Number(right)
      case 'contains':
        return String(left).includes(String(right))
      case 'not_contains':
        return !String(left).includes(String(right))
      default:
        return false
    }
  }

  // ── Snapshot / debug ──────────────────────────────────────────

  /**
   * Return a plain object snapshot of all variables (for logging / debugging).
   */
  snapshot(): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const [key, entry] of this.store) {
      result[key] = entry.value
    }
    return result
  }

  /**
   * Return all entries with metadata (for introspection APIs).
   */
  dump(): Array<{ key: string } & BusEntry> {
    const result: Array<{ key: string } & BusEntry> = []
    for (const [key, entry] of this.store) {
      result.push({ key, ...entry })
    }
    return result
  }

  /**
   * Remove all variables (useful for resetting between workflow runs).
   */
  clear(): void {
    this.store.clear()
  }

  get size(): number {
    return this.store.size
  }

  // ── Helpers ───────────────────────────────────────────────────

  private parsePrimitive(raw: string): unknown {
    // Strip surrounding quotes
    if (
      (raw.startsWith("'") && raw.endsWith("'")) ||
      (raw.startsWith('"') && raw.endsWith('"'))
    ) {
      return raw.slice(1, -1)
    }
    if (raw === 'true') return true
    if (raw === 'false') return false
    if (raw === 'null') return null
    if (raw === 'undefined') return undefined
    const num = Number(raw)
    if (!Number.isNaN(num) && raw.trim() !== '') return num
    return raw
  }
}
