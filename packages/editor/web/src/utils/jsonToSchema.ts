/**
 * JSON structure analysis engine.
 *
 * Infers PartialWidget[] from a JSON response, with type detection
 * and field-name-to-label conversion.
 */
import type { PartialWidget, SchemaType } from '@/widgets/base/types'

/** Inferred field information */
export interface FieldInference {
  /** Original field path (dot-separated for nested objects) */
  path: string
  /** Suggested PartialWidget field name */
  field: string
  /** Inferred SchemaType */
  type: SchemaType
  /** Human-readable label derived from field name */
  label: string
  /** Sample value from the JSON for preview */
  sample: unknown
  /** Whether the field is an array */
  isArray: boolean
  /** Whether the field is a nested object */
  isObject: boolean
}

/**
 * Infer field types from a JSON value.
 * Handles: string, number, boolean, array, object, null.
 * Nested objects are flattened with dot-path notation.
 *
 * @param json - Parsed JSON value (object or array)
 * @param prefix - Path prefix for nested fields
 * @returns Array of field inferences
 */
export function inferFieldsFromJson(json: unknown, prefix = ''): FieldInference[] {
  const results: FieldInference[] = []

  // If top-level is an array, analyze the first element
  const target = Array.isArray(json) ? json[0] : json

  if (!target || typeof target !== 'object' || Array.isArray(target)) {
    return results
  }

  const obj = target as Record<string, unknown>

  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    const field = path
    const label = fieldNameToLabel(key)
    const inference = inferSingleField(path, field, label, value)
    results.push(inference)

    // Recurse into nested objects (1 level deep to avoid explosion)
    if (inference.isObject && !prefix) {
      const nested = inferFieldsFromJson(value, path)
      results.push(...nested)
    }
  }

  return results
}

function inferSingleField(
  path: string,
  field: string,
  label: string,
  value: unknown,
): FieldInference {
  const isArray = Array.isArray(value)
  const isObject = !isArray && value !== null && typeof value === 'object'

  let type: SchemaType = 'input'

  if (value === null || value === undefined) {
    type = 'input'
  } else if (isArray) {
    // Check if array of objects (table) or array of primitives (select)
    const arr = value as unknown[]
    if (arr.length > 0 && typeof arr[0] === 'object' && arr[0] !== null) {
      type = 'table'
    } else {
      type = 'select'
    }
  } else if (isObject) {
    type = 'card' // nested object becomes a card container
  } else if (typeof value === 'boolean') {
    type = 'radio'
  } else if (typeof value === 'number') {
    type = 'number'
  } else if (typeof value === 'string') {
    type = inferStringType(field, value)
  }

  return { path, field, label, type, sample: value, isArray, isObject }
}

/**
 * Heuristic type inference for string values based on field name and sample.
 */
function inferStringType(field: string, sample: string): SchemaType {
  const lower = field.toLowerCase()

  // Date patterns
  if (
    lower.includes('date') || lower.includes('time') ||
    lower.endsWith('_at') || lower.endsWith('At') ||
    lower.startsWith('create') || lower.startsWith('update')
  ) {
    // Check if it looks like a datetime
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(sample)) {
      return 'date'
    }
    return 'date'
  }

  // Email / URL -> input with special props (keep as input)
  if (lower.includes('email') || lower.includes('url') || lower.includes('link')) {
    return 'input'
  }

  // Long text -> textarea
  if (sample.length > 100 || lower.includes('desc') || lower.includes('content') || lower.includes('remark') || lower.includes('note')) {
    return 'textarea'
  }

  // Status / type / category -> select
  if (
    lower.includes('status') || lower.includes('type') ||
    lower.includes('category') || lower.includes('level') ||
    lower.includes('gender') || lower.includes('role')
  ) {
    return 'select'
  }

  return 'input'
}

/**
 * Convert field name to human-readable label.
 * Handles: snake_case, camelCase, UPPER_SNAKE_CASE.
 *
 * Examples:
 *   user_name     -> "User Name"
 *   userName      -> "User Name"
 *   CREATED_AT    -> "Created At"
 *   deptId        -> "Dept Id"
 */
export function fieldNameToLabel(name: string): string {
  // Split on underscores, then split camelCase segments
  const words = name
    .replace(/([a-z])([A-Z])/g, '$1 $2')  // camelCase -> "camel Case"
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // "XMLParser" -> "XML Parser"
    .replace(/[_-]+/g, ' ')                  // snake_case -> "snake case"
    .trim()
    .split(/\s+/)

  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Convert field inferences to PartialWidget[].
 * For nested objects, creates card containers with children.
 *
 * @param inferences - Array of field inferences
 * @returns PartialWidget[] ready for the editor
 */
export function fieldInferencesToSchema(inferences: FieldInference[]): PartialWidget[] {
  const schema: PartialWidget[] = []
  const processed = new Set<string>()

  for (const inf of inferences) {
    if (processed.has(inf.path)) continue
    processed.add(inf.path)

    // Skip nested fields if their parent is already processed as a card
    if (inf.path.includes('.') && inf.type !== 'card') {
      continue
    }

    const item: PartialWidget = {
      type: inf.type,
      field: inf.field,
      label: inf.label,
    }

    // For card (nested object), gather children
    if (inf.type === 'card' && inf.isObject) {
      const children = inferences
        .filter((c) => c.path.startsWith(inf.path + '.'))
        .map((c) => ({
          type: c.type,
          field: c.path,
          label: c.label,
        } satisfies PartialWidget))
      if (children.length > 0) {
        item.children = children
      }
    }

    // For table (array of objects), we just mark it as table
    // The actual column schema would need deeper analysis
    if (inf.type === 'table') {
      item.label = inf.label + ' (Table)'
    }

    schema.push(item)
  }

  return schema
}

/**
 * Generate a formData mapping from JSON data.
 * Maps each field path to its sample value (useful for preview/testing).
 *
 * @param json - Parsed JSON value
 * @returns Record mapping field paths to sample values
 */
export function generateFormDataMapping(json: unknown): Record<string, unknown> {
  const mapping: Record<string, unknown> = {}
  const inferences = inferFieldsFromJson(json)

  for (const inf of inferences) {
    if (!inf.isObject) {
      mapping[inf.path] = inf.sample
    }
  }

  return mapping
}
