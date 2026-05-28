import type { PartialWidget } from '@/widgets/base/types'

/**
 * 生成一行（标签 + 内容）的 Schema 片段
 */
export const simpleRow = (label: string, _spanLabel: number, _spanContent: number, component: PartialWidget): PartialWidget => ({
  type: 'card',
  children: [
    { type: 'title', label },
    component,
  ]
})
