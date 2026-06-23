/**
 * usePropertyAdapters -- Widget 属性适配器
 *
 * 职责：
 * - Widget 属性的读写（支持 dot-notation 路径）
 * - 样式属性 → 输入类型映射
 * - 样式属性 → 中文标签映射
 * - 组件 props → 输入类型映射
 *
 * 配合 PropertyPanel / PropertyField 使用。
 */
import type { Widget } from '../widgets/base/types'

// ---- Style metadata maps ----

const STYLE_LABEL_MAP: Record<string, string> = {
  width: '宽度',
  height: '高度',
  margin: '外边距',
  padding: '内边距',
  backgroundColor: '背景色',
  border: '边框',
  borderRadius: '圆角',
  fontSize: '字号',
  fontWeight: '字重',
  color: '颜色',
}

const COLOR_STYLE_PROPS = new Set(['color', 'backgroundColor'])
const TEXT_STYLE_PROPS = new Set(['width', 'height', 'fontSize'])
const SELECT_STYLE_PROPS = new Set(['fontWeight'])
const BORDER_STYLE_PROPS = new Set(['border'])
const BORDER_RADIUS_STYLE_PROPS = new Set(['borderRadius'])
const SPACING_MARGIN_PROPS = new Set(['margin'])
const SPACING_PADDING_PROPS = new Set(['padding'])

const STYLE_OPTIONS_MAP: Record<string, { label: string; value: string | number }[]> = {
  fontWeight: [
    { label: '正常', value: 'normal' },
    { label: '粗体', value: 'bold' },
  ],
}

// ---- Props metadata maps ----

const BOOLEAN_PROPS = new Set([
  'disabled',
  'readonly',
  'clearable',
  'multiple',
  'filterable',
  'showPassword',
  'showWordLimit',
  'showHeader',
])

// ---- Composable ----

export function usePropertyAdapters() {
  /**
   * 读取 Widget 属性（支持 dot-notation 路径）
   * 如 'position.x' → widget.position.x
   *    'style.width' → widget.style.width
   *    'props.placeholder' → widget.props.placeholder
   *    'field' → widget.field
   */
  function readProperty(widget: Widget, path: string): unknown {
    const parts = path.split('.')
    let current: unknown = widget
    for (const part of parts) {
      if (current == null || typeof current !== 'object') return undefined
      current = (current as Record<string, unknown>)[part]
    }
    return current
  }

  /**
   * 写入 Widget 属性（支持 dot-notation 路径）
   * 返回 patch 对象，由调用方传给 widgetStore.updateWidget
   */
  function writeProperty(widget: Widget, path: string, value: unknown): Partial<Widget> {
    const parts = path.split('.')

    if (parts.length === 1) {
      return { [parts[0]]: value }
    }

    if (parts[0] === 'position') {
      return {
        position: { ...widget.position, [parts[1]]: value },
      }
    }

    if (parts[0] === 'style') {
      return {
        style: { ...(widget.style ?? {}), [parts[1]]: value },
      }
    }

    if (parts[0] === 'props') {
      return {
        props: { ...(widget.props ?? {}), [parts[1]]: value },
      }
    }

    return {}
  }

  /**
   * 样式属性 → 中文标签
   */
  function getStyleLabel(prop: string): string {
    return STYLE_LABEL_MAP[prop] || prop
  }

  /**
   * 样式属性 → PropertyField 输入类型
   */
  function getStyleInputType(prop: string): string {
    if (COLOR_STYLE_PROPS.has(prop)) return 'color'
    if (SELECT_STYLE_PROPS.has(prop)) return 'select'
    if (BORDER_STYLE_PROPS.has(prop)) return 'border-editor'
    if (BORDER_RADIUS_STYLE_PROPS.has(prop)) return 'border-radius-editor'
    if (SPACING_MARGIN_PROPS.has(prop)) return 'spacing-margin-editor'
    if (SPACING_PADDING_PROPS.has(prop)) return 'spacing-padding-editor'
    if (TEXT_STYLE_PROPS.has(prop)) return 'text'
    return 'text'
  }

  /**
   * 组件 props → PropertyField 输入类型
   */
  function getPropInputType(prop: string): string {
    if (BOOLEAN_PROPS.has(prop)) return 'switch'
    return 'text'
  }

  /**
   * 样式属性 → 下拉选项（仅 select 类型有值）
   */
  function getStyleOptions(prop: string): { label: string; value: string | number }[] | undefined {
    return STYLE_OPTIONS_MAP[prop]
  }

  return {
    readProperty,
    writeProperty,
    getStyleLabel,
    getStyleInputType,
    getPropInputType,
    getStyleOptions,
  }
}
