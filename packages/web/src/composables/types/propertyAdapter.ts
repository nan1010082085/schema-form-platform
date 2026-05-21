import type { FormSchemaItem } from '@/components/FormGrid/types'

export type FieldType =
  | 'input'
  | 'number'
  | 'select'
  | 'switch'
  | 'color'
  | 'radio-group'
  | 'tag-list'
  | 'key-value'
  | 'slot'

export interface SelectOption {
  label: string
  value: string | number | boolean
}

export interface PropertyField {
  key: string
  label: string
  type: FieldType
  /** Options for select/radio-group */
  options?: SelectOption[]
  /** Placeholder for input/number */
  placeholder?: string
  /** Condition to show this field */
  show?: (schema: FormSchemaItem) => boolean
  /** Read-only — field is visible but not editable */
  disabled?: boolean
}

export interface PropertyCategory {
  /** Category key — matches el-collapse-item name */
  key: string
  /** Display title */
  title: string
  /** Fields in this category */
  fields: PropertyField[]
}

/** Adapter: given a schema, return which fields to show */
export type PropertyAdapter = (schema: FormSchemaItem) => PropertyCategory[]
