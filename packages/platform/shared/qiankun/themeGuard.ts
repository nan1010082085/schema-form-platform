/**
 * 子应用主题守卫（共享模块）
 *
 * qiankun 子应用运行时，宿主可能通过 CSS 注入覆盖子应用自定义主题。
 *
 * 防御策略：
 * 1. applyThemeInline(vars) — 立即写入 inline style（优先级高于 :root 样式表规则）
 * 2. installThemeWatchdog(vars) — MutationObserver 监听 <html> 的 style 属性变化，
 *    一旦被外部修改就立即恢复，形成闭环保护
 *
 * 各子应用传入自己的主题变量表，guard 逻辑复用。
 */

/** 主题变量表类型 */
export type ThemeVars = Record<string, string>

/** Editor 主题 CSS 变量 */
export const EDITOR_THEME_VARS: ThemeVars = {
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

/** Flow 主题 CSS 变量（与 Editor 共享主色，组件尺寸不同） */
export const FLOW_THEME_VARS: ThemeVars = {
  ...EDITOR_THEME_VARS,
  '--el-component-size': '32px',
}

/** AI 主题 CSS 变量 - 科技感深色主题 */
export const AI_THEME_VARS: ThemeVars = {
  ...EDITOR_THEME_VARS,
  '--el-color-primary': '#00d4ff',
  '--el-color-primary-light-3': '#33ddff',
  '--el-color-primary-light-5': '#66e3ff',
  '--el-color-primary-light-7': '#99ebff',
  '--el-color-primary-light-8': '#b3eeff',
  '--el-color-primary-light-9': '#e6f9ff',
  '--el-color-primary-dark-2': '#00aacc',
  '--el-color-warning': '#ffab40',
  '--el-color-danger': '#ff5252',
  '--el-color-success': '#00e676',
  '--el-text-color-primary': 'rgba(255, 255, 255, 0.95)',
  '--el-text-color-regular': 'rgba(255, 255, 255, 0.65)',
  '--el-text-color-placeholder': 'rgba(255, 255, 255, 0.35)',
  '--el-text-color-disabled': 'rgba(255, 255, 255, 0.2)',
  '--el-border-color': 'rgba(0, 212, 255, 0.15)',
  '--el-border-color-light': 'rgba(0, 212, 255, 0.08)',
  '--el-border-color-lighter': 'rgba(0, 212, 255, 0.08)',
  '--el-border-color-extra-light': 'rgba(0, 212, 255, 0.05)',
  '--el-border-color-dark': 'rgba(0, 212, 255, 0.2)',
  '--el-border-color-hover': '#00d4ff',
  '--el-border-color-focus': '#00d4ff',
  '--el-bg-color': '#111820',
  '--el-bg-color-page': '#0a0e14',
  '--el-bg-color-overlay': '#161d26',

  // AI 自定义变量 - 科技感深色
  '--ai-color-primary': '#00d4ff',
  '--ai-color-primary-hover': '#33ddff',
  '--ai-color-primary-bg': 'rgba(0, 212, 255, 0.1)',
  '--ai-color-success': '#00e676',
  '--ai-color-success-bg': 'rgba(0, 230, 118, 0.1)',
  '--ai-color-info': '#00d4ff',
  '--ai-color-info-bg': 'rgba(0, 212, 255, 0.08)',
  '--ai-color-danger': '#ff5252',
  '--ai-text-primary': 'rgba(255, 255, 255, 0.95)',
  '--ai-text-secondary': 'rgba(255, 255, 255, 0.65)',
  '--ai-text-hint': 'rgba(255, 255, 255, 0.4)',
  '--ai-text-disabled': 'rgba(255, 255, 255, 0.2)',
  '--ai-text-inverse': '#0a0e14',
  '--ai-border-base': 'rgba(0, 212, 255, 0.15)',
  '--ai-border-light': 'rgba(0, 212, 255, 0.08)',
  '--ai-bg-white': '#111820',
  '--ai-bg-page': '#0a0e14',
  '--ai-bg-gray': '#161d26',
  '--ai-bg-gray-light': '#1a2230',
  '--ai-bg-hover': 'rgba(0, 212, 255, 0.06)',
  '--ai-radius-sm': '6px',
  '--ai-radius-md': '8px',
  '--ai-radius-lg': '12px',
  '--ai-radius-xl': '16px',
  '--ai-radius-2xl': '20px',
  '--ai-color-primary-light': 'rgba(0, 212, 255, 0.08)',
  '--ai-color-danger-bg': 'rgba(255, 82, 82, 0.1)',
  '--ai-color-purple': '#bb86fc',
  '--ai-color-purple-bg': 'rgba(187, 134, 252, 0.1)',
  '--ai-color-warning': '#ffab40',
  '--ai-color-warning-bg': 'rgba(255, 171, 64, 0.1)',
  '--ai-spacing-xs': '6px',
  '--ai-spacing-sm': '10px',
  '--ai-spacing-md': '16px',
  '--ai-spacing-lg': '24px',
  '--ai-spacing-xl': '32px',
  '--ai-shadow-sm': '0 0 8px rgba(0, 212, 255, 0.08)',
  '--ai-shadow-md': '0 0 15px rgba(0, 212, 255, 0.12), 0 0 30px rgba(0, 212, 255, 0.06)',
  '--ai-shadow-lg': '0 0 20px rgba(0, 212, 255, 0.18), 0 0 40px rgba(0, 212, 255, 0.08)',
  '--ai-shadow-card': '0 0 12px rgba(0, 212, 255, 0.1), 0 0 1px rgba(0, 212, 255, 0.15)',
  '--ai-shadow-float': '0 0 30px rgba(0, 212, 255, 0.15), 0 0 60px rgba(0, 212, 255, 0.08)',
  '--ai-glass-bg': 'rgba(17, 24, 32, 0.85)',
  '--ai-glass-blur': 'blur(20px)',
  '--ai-glass-border': 'rgba(0, 212, 255, 0.1)',
  '--ai-gradient-primary': 'linear-gradient(135deg, #00d4ff 0%, #009fcc 100%)',
  '--ai-gradient-user': 'linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(0, 212, 255, 0.1) 100%)',
  '--ai-gradient-subtle': 'linear-gradient(135deg, rgba(0, 212, 255, 0.04) 0%, rgba(0, 212, 255, 0.02) 100%)',
  '--ai-gradient-card-header': 'linear-gradient(180deg, rgba(22, 29, 38, 0.8) 0%, rgba(22, 29, 38, 0.4) 100%)',
}

/**
 * 将主题变量写入 document.documentElement.style（inline style）
 * 幂等——重复调用不会产生副作用
 *
 * @param vars - CSS 变量键值对
 */
export function applyThemeInline(vars: ThemeVars): void {
  const root = document.documentElement
  for (const [prop, value] of Object.entries(vars)) {
    root.style.setProperty(prop, value)
  }
}

/** 已安装看门狗的变量表集合（防止重复安装） */
const installedWatchdogs = new WeakSet<ThemeVars>()

/**
 * 安装主题看门狗
 *
 * 监听 document.documentElement 的 style 属性变化，
 * 一旦被外部修改就立即恢复子应用主题变量。
 * 幂等——对同一 vars 对象多次调用只安装一次。
 *
 * @param vars - CSS 变量键值对
 */
export function installThemeWatchdog(vars: ThemeVars): void {
  if (installedWatchdogs.has(vars)) return
  installedWatchdogs.add(vars)

  const observer = new MutationObserver(() => {
    const root = document.documentElement
    for (const [prop, value] of Object.entries(vars)) {
      if (root.style.getPropertyValue(prop) !== value) {
        root.style.setProperty(prop, value)
      }
    }
  })
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })
}
