import type { PartialWidget } from '@/widgets/base/types'

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
  schema: PartialWidget[]
  /**
   * 弹窗管理模式
   * - 'internal'（默认）：由 FormGrid 内部管理弹窗，弹窗在 demo 区域内部渲染
   * - 'external'：由 PreviewView 接管弹窗，在页面顶层渲染，适合展示跨组件弹窗联动
   */
  dialogMode?: 'internal' | 'external'
}

/** 组件暴露的运行时值 — 供其他组件联动条件引用 */
export interface ExposedValueDoc {
  key: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description: string
  example?: unknown
}

/** 组件可接收的外部事件 — 由事件引擎 trigger-event 动作触发 */
export interface ReceivableEventDoc {
  name: string
  description: string
  params?: Record<string, string>
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
  /** 组件暴露的运行时值（可选，业务组件声明） */
  exposedValues?: ExposedValueDoc[]
  /** 组件可接收的外部事件（可选，业务组件声明） */
  receivableEvents?: ReceivableEventDoc[]
}
