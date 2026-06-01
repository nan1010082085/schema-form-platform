/**
 * 子应用主题守卫
 *
 * micro-app 运行时可能通过 JS 直接修改 document.documentElement.style，
 * 注入宿主 EP 默认 CSS 变量（#409eff 等），覆盖 editor 自定义主题。
 *
 * 防御策略：
 * 1. applyThemeInline() — 立即写入 inline style（优先级高于 :root 样式表规则）
 * 2. installThemeWatchdog() — MutationObserver 监听 <html> 的 style 属性变化，
 *    一旦被外部修改就立即恢复，形成闭环保护
 */

/** editor 主题 CSS 变量 → 值（与 styles/variables.scss + styles/theme.scss 保持同步） */
const THEME_VARS: Record<string, string> = {
  // 主色
  '--el-color-primary': '#0060A2',
  '--el-color-primary-light-3': '#4d8fbe',
  '--el-color-primary-light-5': '#80b0d1',
  '--el-color-primary-light-7': '#b3d0e4',
  '--el-color-primary-light-8': '#cce0ee',
  '--el-color-primary-light-9': '#e6f0f7',
  '--el-color-primary-dark-2': '#004c82',

  // 功能色
  '--el-color-warning': '#F09700',
  '--el-color-danger': '#E50113',
  '--el-color-success': '#26A036',

  // 文字
  '--el-text-color-primary': '#333333',
  '--el-text-color-regular': '#666666',
  '--el-text-color-placeholder': '#969FA8',
  '--el-text-color-disabled': '#969FA8',

  // 边框
  '--el-border-color': '#D5DDE3',
  '--el-border-color-light': '#EBEDF3',
  '--el-border-color-lighter': '#EBEDF3',
  '--el-border-color-extra-light': '#EBEDF3',
  '--el-border-color-dark': '#D5DDE3',
  '--el-border-color-hover': '#0060A2',
  '--el-border-color-focus': '#0060A2',

  // 字体
  '--el-font-family': "'Microsoft YaHei', '微软雅黑', 'PingFang SC', 'Hiragino Sans GB', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  '--el-font-size-base': '14px',
  '--el-font-size-small': '12px',
  '--el-font-size-large': '16px',

  // 圆角
  '--el-border-radius-base': '2px',
  '--el-border-radius-small': '2px',
  '--el-border-radius-round': '20px',
  '--el-border-radius-circle': '100%',

  // 尺寸
  '--el-component-size': '44px',
  '--el-component-size-small': '24px',
  '--el-component-size-large': '40px',
}

/**
 * 将主题变量写入 document.documentElement.style（inline style）
 * 幂等——重复调用不会产生副作用
 */
export function applyThemeInline(): void {
  const root = document.documentElement
  for (const [prop, value] of Object.entries(THEME_VARS)) {
    root.style.setProperty(prop, value)
  }
}

let watchdogInstalled = false

/**
 * 安装主题看门狗
 *
 * 监听 document.documentElement 的 style 属性变化，
 * 一旦被外部修改就立即恢复 editor 主题变量。
 * 幂等——多次调用只安装一次。
 */
export function installThemeWatchdog(): void {
  if (watchdogInstalled) return
  watchdogInstalled = true

  const observer = new MutationObserver(() => {
    const root = document.documentElement
    for (const [prop, value] of Object.entries(THEME_VARS)) {
      if (root.style.getPropertyValue(prop) !== value) {
        root.style.setProperty(prop, value)
      }
    }
  })
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })
}
