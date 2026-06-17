/**
 * 图标名称解析器
 *
 * 将数据库中存储的图标名（可能是 TDesign 风格或其他别名）解析为
 * AppIcon 组件可用的 kebab-case 图标名。
 *
 * 使用方式：
 * ```vue
 * <AppIcon :name="resolveIconName(item.icon)" />
 * ```
 */

/** 别名 → AppIcon kebab-case 图标名映射 */
const ICON_ALIAS: Record<string, string> = {
  // 导航
  home: 'home-filled',
  'chevron-right': 'arrow-right',
  'menu-fold': 'fold',
  'menu-unfold': 'expand',
  // 文件/文档
  file: 'document',
  document: 'document',
  files: 'files',
  notebook: 'notebook',
  // 系统/设置
  setting: 'setting',
  system: 'setting',
  config: 'setting',
  // 用户
  user: 'user',
  'user-filled': 'user-filled',
  people: 'user-filled',
  person: 'user',
  // 权限/安全
  lock: 'lock',
  key: 'key',
  safe: 'lock',
  // 布局/组件
  grid: 'grid',
  layout: 'grid',
  dashboard: 'odometer',
  odometer: 'odometer',
  // 菜单
  menu: 'menu',
  list: 'menu',
  // 连接/集成
  connection: 'connection',
  link: 'connection',
  plugin: 'connection',
  api: 'connection',
  // 其他
  medal: 'medal',
  trophy: 'trophy',
  platform: 'platform',
  monitor: 'monitor',
  cpu: 'cpu',
  chat: 'chat-dot-round',
  bell: 'bell',
  notification: 'bell',
  image: 'picture-filled',
  picture: 'picture-filled',
  edit: 'edit',
  delete: 'delete',
  search: 'search',
  plus: 'plus',
  add: 'plus',
  refresh: 'refresh',
  download: 'download',
  upload: 'upload',
  view: 'view',
  check: 'check',
  close: 'close',
  warning: 'warning',
  info: 'info-filled',
  success: 'success-filled',
}

/**
 * 将图标名解析为 AppIcon 的 kebab-case 名称
 *
 * 解析顺序：
 * 1. 别名映射（TDesign / 其他 → EP kebab-case）
 * 2. 已经是 kebab-case 则直接返回
 * 3. fallback 到 'document'
 */
export function resolveIconName(name?: string): string {
  if (!name) return 'document'

  const lower = name.toLowerCase()

  // 1. 别名映射
  const alias = ICON_ALIAS[lower]
  if (alias) return alias

  // 2. 已经是 kebab-case 格式（包含连字符）
  if (lower.includes('-')) return lower

  // 3. PascalCase → kebab-case
  const kebab = lower
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()

  return kebab || 'document'
}
