import type { FormSchemaItem } from '@/components/FormGrid'

export interface PropDoc {
  name: string
  type: string
  default: string
  description: string
}

export interface EventDoc {
  name: string
  description: string
  params: string
}

export interface SlotDoc {
  name: string
  description: string
  scope?: string
}

export interface ExposeDoc {
  name: string
  type: string
  description: string
}

export interface SchemaExample {
  title: string
  description?: string
  schema: FormSchemaItem[]
  /**
   * 弹窗管理模式
   * - 'internal'（默认）：由 FormGrid 内部管理弹窗，弹窗在 demo 区域内部渲染
   * - 'external'：由 PreviewView 接管弹窗，在页面顶层渲染，适合展示跨组件弹窗联动
   */
  dialogMode?: 'internal' | 'external'
}

export interface ComponentDoc {
  id: string
  name: string
  category: 'layout' | 'base' | 'business'
  description: string
  props: PropDoc[]
  events: EventDoc[]
  slots: SlotDoc[]
  exposes: ExposeDoc[]
  schemas: SchemaExample[]
}
