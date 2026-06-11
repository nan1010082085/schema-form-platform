/**
 * Tools Index — 统一注册所有工作流工具
 *
 * 导出工具注册函数，供应用启动时调用。
 */

import { registerEditorTools } from './editor.js'
import { registerFlowTools } from './flow.js'
import { registerAITools } from './ai.js'

export { registerEditorTools } from './editor.js'
export { registerFlowTools } from './flow.js'
export { registerAITools } from './ai.js'

/**
 * Register all built-in tools.
 * Call this once at application startup.
 */
export function registerAllTools(): void {
  registerEditorTools()
  registerFlowTools()
  registerAITools()
}
