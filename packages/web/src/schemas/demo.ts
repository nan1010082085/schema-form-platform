import type { FormSchemaItem } from '@/components/FormGrid/types'

export interface DemoSchemaEntry {
  name: string
  title?: string
  schema: FormSchemaItem[]
}

export const demoSchemas: Record<string, DemoSchemaEntry> = {}
