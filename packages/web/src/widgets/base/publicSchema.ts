import type { SchemaType, Widget } from './types'

/**
 * 公共字段工厂函数
 * 为所有 Widget 提供统一的默认值基底
 * 返回 Omit<Widget, 'name'>，工厂函数补充 name 后即可满足 Widget 类型
 */
export function publicSchema(id: string, type: SchemaType): Omit<Widget, 'name'> {
  return {
    id,
    type,
    position: { x: 0, y: 0, w: 240, h: 44, zIndex: 1 },
    style: {},
    props: {},
    options: [],
    variables: [],
    events: [],
    rules: [],
    validationRules: [],
  }
}

/**
 * 公共样式面板声明
 * 所有组件共享的可配置样式属性
 */
export const publicStylePanel = [
  'margin',
  'padding',
  'backgroundColor',
  'border',
  'borderRadius',
  'fontSize',
  'fontWeight',
  'color',
] as const
