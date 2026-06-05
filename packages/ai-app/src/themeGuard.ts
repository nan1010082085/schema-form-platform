/**
 * AI 子应用主题守卫
 *
 * micro-app 沙箱会修改 document.documentElement.style，注入宿主的 CSS 变量。
 * 此模块将 AI 应用的主题变量写入 inline style（最高优先级），
 * 并监听变化自动恢复，防止被宿主覆盖。
 */

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
  '--el-text-color-placeholder': '#999999',
  '--el-text-color-disabled': '#C0C4CC',

  // 边框
  '--el-border-color': '#D5DDE3',
  '--el-border-color-light': '#EBEDF3',
  '--el-border-color-lighter': '#EBEDF3',
  '--el-border-color-extra-light': '#EBEDF3',
  '--el-border-color-dark': '#D5DDE3',

  // 字体
  '--el-font-family': "'Microsoft YaHei', '微软雅黑', 'PingFang SC', sans-serif",
  '--el-font-size-base': '14px',
  '--el-font-size-small': '12px',

  // 圆角
  '--el-border-radius-base': '2px',
  '--el-border-radius-small': '2px',

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

  // 缺失的功能色
  '--ai-color-primary-light': 'rgba(0, 96, 162, 0.08)',
  '--ai-color-danger-bg': 'rgba(229, 1, 19, 0.08)',
  '--ai-color-purple': '#7C3AED',
  '--ai-color-purple-bg': 'rgba(124, 58, 237, 0.08)',
  '--ai-color-warning': '#E6A23C',
  '--ai-color-warning-bg': 'rgba(230, 162, 60, 0.1)',

  // 间距
  '--ai-spacing-xs': '6px',
  '--ai-spacing-sm': '10px',
  '--ai-spacing-md': '16px',
  '--ai-spacing-lg': '24px',
  '--ai-spacing-xl': '32px',

  // 阴影
  '--ai-shadow-sm': '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
  '--ai-shadow-md': '0 4px 12px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04)',
  '--ai-shadow-lg': '0 8px 24px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.04)',
  '--ai-shadow-card': '0 2px 8px rgba(0, 0, 0, 0.04), 0 0 1px rgba(0, 0, 0, 0.06)',
  '--ai-shadow-float': '0 12px 32px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06)',

  // 毛玻璃
  '--ai-glass-bg': 'rgba(255, 255, 255, 0.72)',
  '--ai-glass-blur': 'blur(16px)',
  '--ai-glass-border': 'rgba(255, 255, 255, 0.18)',

  // 渐变
  '--ai-gradient-primary': 'linear-gradient(135deg, #0060A2 0%, #0078D4 100%)',
  '--ai-gradient-user': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  '--ai-gradient-subtle': 'linear-gradient(135deg, rgba(0, 96, 162, 0.04) 0%, rgba(0, 120, 212, 0.02) 100%)',
  '--ai-gradient-card-header': 'linear-gradient(180deg, rgba(245, 247, 250, 0.8) 0%, rgba(245, 247, 250, 0.4) 100%)',
}

export function applyThemeInline(): void {
  const root = document.documentElement
  for (const [prop, value] of Object.entries(THEME_VARS)) {
    root.style.setProperty(prop, value)
  }
}

let watchdogInstalled = false

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
