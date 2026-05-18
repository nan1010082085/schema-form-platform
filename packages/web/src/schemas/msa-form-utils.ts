import type { FormSchemaItem } from '@/components/FormGrid'

/**
 * 根据模式转换 schema
 * - detail 模式：递归设置所有组件 disabled/readonly
 * - add/edit 模式：原样返回
 */
export function applyMode(
  schema: FormSchemaItem[],
  mode: 'add' | 'edit' | 'detail'
): FormSchemaItem[] {
  if (mode !== 'detail') return schema

  return schema.map(item => {
    if (item.children) {
      return { ...item, children: applyMode(item.children, mode) }
    }
    // 跳过布局节点和按钮列表
    const skipTypes = [
      'grid-row', 'grid-col', 'button-list', 'table', 'file-list', 'pagination',
      'page', 'toolbar', 'card', 'title', 'divider', 'spacer'
    ]
    if (skipTypes.includes(item.type)) return item

    return {
      ...item,
      props: { ...item.props, disabled: true, readonly: true }
    }
  })
}
