import type { FormSchemaItem, SchemaButtonConfig } from '@/components/FormGrid/types'

export interface MsaFormSchemaConfig {
  title: string
  schema: FormSchemaItem[]
  buttons: Record<string, SchemaButtonConfig[]>
}

export const msaFormRegistry: Record<string, MsaFormSchemaConfig> = {}
