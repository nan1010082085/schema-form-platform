import type { FormSchemaItem } from '@/components/FormGrid/types'

export function applyMode(schema: FormSchemaItem[], _mode: 'add' | 'edit' | 'detail'): FormSchemaItem[] {
  return schema
}
