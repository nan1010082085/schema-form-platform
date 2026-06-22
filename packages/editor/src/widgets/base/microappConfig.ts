/**
 * 微应用配置模块 — 被 micro-app-container 和 dialog 两个 Widget 共用
 *
 * 提供统一的属性面板配置项和默认值。
 */
import type { PropertyPanelItem } from './types'

/** 微应用默认 props */
export const microappDefaults = {
  microappName: '',
  microappEntry: '',
  microappSandbox: true,
  microappStyleIsolation: 'experimental' as const,
  microappTimeout: 10000,
  microappFallback: '子应用加载失败',
  microappRouteBase: '',
  microappRoute: '',
}

/** 微应用属性面板配置项（带 visibleOn 条件） */
export function createMicroappPropertyItems(visibleOn: string): PropertyPanelItem[] {
  return [
    {
      key: 'microappName',
      label: '子应用名称',
      type: 'input',
      default: '',
      placeholder: '例：approval-flow',
      visibleOn,
    },
    {
      key: 'microappEntry',
      label: '入口地址',
      type: 'input',
      default: '',
      placeholder: '例：http://localhost:6000',
      visibleOn,
    },
    {
      key: 'microappRoute',
      label: '加载路由',
      type: 'input',
      default: '',
      placeholder: '例：/approval/123（SPA 路由路径）',
      visibleOn,
    },
    {
      key: 'microappRouteBase',
      label: '路由前缀',
      type: 'input',
      default: '',
      placeholder: '留空自动匹配',
      visibleOn,
    },
    {
      key: 'microappSandbox',
      label: '启用沙箱',
      type: 'switch',
      default: true,
      visibleOn,
    },
    {
      key: 'microappStyleIsolation',
      label: 'CSS 隔离',
      type: 'select',
      options: [
        { label: '实验性隔离', value: 'experimental' },
        { label: '严格隔离', value: 'strict' },
        { label: '关闭', value: 'none' },
      ],
      default: 'experimental',
      visibleOn,
    },
    {
      key: 'microappTimeout',
      label: '加载超时（ms）',
      type: 'number',
      default: 10000,
      visibleOn,
    },
    {
      key: 'microappFallback',
      label: '加载失败文案',
      type: 'input',
      default: '子应用加载失败',
      placeholder: '加载失败时显示的文案',
      visibleOn,
    },
  ]
}
