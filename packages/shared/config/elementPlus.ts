/**
 * Element Plus 统一配置
 *
 * 所有前端项目共享，确保 Element Plus 行为一致。
 */
import type { ConfigProviderProps } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

export const elementPlusConfig: Partial<ConfigProviderProps> = {
  locale: zhCn,
}

export const elementPlusSize = 'default' as const
