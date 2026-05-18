import type { FormSchemaItem } from '@/components/FormGrid'

/**
 * 生成一行两列（标签 + 内容）的 Schema 片段
 */
export const simpleRow = (label: string, spanLabel: number, spanContent: number, component: FormSchemaItem): FormSchemaItem => ({
  type: 'grid-row',
  children: [
    { type: 'grid-col', span: spanLabel, label, align: 'center' },
    { type: 'grid-col', span: spanContent, children: [component] }
  ]
})
