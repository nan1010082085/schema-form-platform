/**
 * 子应用主题守卫（共享模块）
 *
 * micro-app 运行时可能通过 JS 直接修改 document.documentElement.style，
 * 注入宿主 EP 默认 CSS 变量（#409eff 等），覆盖子应用自定义主题。
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

/** AI 主题 CSS 变量（Element Plus 基础 + AI 自定义令牌） */
export const AI_THEME_VARS: ThemeVars = {
  ...EDITOR_THEME_VARS,
  '--el-text-color-placeholder': '#999999',
  '--el-text-color-disabled': '#C0C4CC',

  // AI 自定义变量
  '--ai-color-primary': '#0060A2',
  '--ai-color-primary-hover': '#035B9C',
  '--ai-color-primary-bg': '#EEF5FF',
  '--ai-color-success': '#26A036',
  '--ai-color-success-bg': 'rgba(82, 196, 26, 0.1)',
  '--ai-color-info': '#4581E9',
  '--ai-color-info-bg': 'rgba(22, 119, 255, 0.08)',
  '--ai-color-danger': '#E50113',
  '--ai-text-primary': '#1A1A1A',
  '--ai-text-secondary': '#666666',
  '--ai-text-hint': '#999999',
  '--ai-text-disabled': '#C0C4CC',
  '--ai-text-inverse': '#FFFFFF',
  '--ai-border-base': '#E0E4EA',
  '--ai-border-light': '#F0F2F5',
  '--ai-bg-white': '#FFFFFF',
  '--ai-bg-page': '#F5F6FA',
  '--ai-bg-gray': '#F7F8FA',
  '--ai-bg-gray-light': '#FAFAFA',
  '--ai-bg-hover': '#F0F5FF',
  '--ai-radius-sm': '6px',
  '--ai-radius-md': '8px',
  '--ai-radius-lg': '12px',
  '--ai-radius-xl': '16px',
  '--ai-radius-2xl': '20px',
  '--ai-color-primary-light': 'rgba(0, 96, 162, 0.08)',
  '--ai-color-danger-bg': 'rgba(229, 1, 19, 0.08)',
  '--ai-color-purple': '#7C3AED',
  '--ai-color-purple-bg': 'rgba(124, 58, 237, 0.08)',
  '--ai-color-warning': '#E6A23C',
  '--ai-color-warning-bg': 'rgba(230, 162, 60, 0.1)',
  '--ai-spacing-xs': '6px',
  '--ai-spacing-sm': '10px',
  '--ai-spacing-md': '16px',
  '--ai-spacing-lg': '24px',
  '--ai-spacing-xl': '32px',
  '--ai-shadow-sm': '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
  '--ai-shadow-md': '0 4px 12px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04)',
  '--ai-shadow-lg': '0 8px 24px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.04)',
  '--ai-shadow-card': '0 2px 8px rgba(0, 0, 0, 0.04), 0 0 1px rgba(0, 0, 0, 0.06)',
  '--ai-shadow-float': '0 12px 32px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06)',
  '--ai-glass-bg': 'rgba(255, 255, 255, 0.72)',
  '--ai-glass-blur': 'blur(16px)',
  '--ai-glass-border': 'rgba(255, 255, 255, 0.18)',
  '--ai-gradient-primary': 'linear-gradient(135deg, #0060A2 0%, #0078D4 100%)',
  '--ai-gradient-user': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  '--ai-gradient-subtle': 'linear-gradient(135deg, rgba(0, 96, 162, 0.04) 0%, rgba(0, 120, 212, 0.02) 100%)',
  '--ai-gradient-card-header': 'linear-gradient(180deg, rgba(245, 247, 250, 0.8) 0%, rgba(245, 247, 250, 0.4) 100%)',
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
