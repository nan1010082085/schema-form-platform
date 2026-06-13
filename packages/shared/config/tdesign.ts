/**
 * TDesign Vue Next 全局配置
 *
 * 替代原 elementPlus.ts，提供 TDesign 的全局配置
 */

import type { App } from 'vue'
import TDesign from 'tdesign-vue-next'
import zhCN from 'tdesign-vue-next/esm/locale/zh_CN'

/**
 * TDesign 配置选项
 */
export interface TDesignConfig {
  /** 语言包 */
  locale?: typeof zhCN
  /** 全局尺寸 */
  size?: 'small' | 'medium' | 'large'
}

/**
 * 默认配置
 */
const defaultConfig: TDesignConfig = {
  locale: zhCN,
  size: 'medium',
}

/**
 * 设置 TDesign
 */
export function setupTDesign(app: App, config: TDesignConfig = {}) {
  const mergedConfig = { ...defaultConfig, ...config }

  app.use(TDesign, {
    locale: mergedConfig.locale,
    globalConfig: {
      size: mergedConfig.size,
    },
  })
}

/**
 * 获取 Element Plus 兼容配置（用于渐进式迁移）
 */
export function getElementPlusCompatConfig() {
  return {
    size: 'default' as const,
    zIndex: 2000,
    locale: zhCN,
  }
}

export default setupTDesign
