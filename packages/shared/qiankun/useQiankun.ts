/**
 * useQiankun - Qiankun 状态管理组合函数
 *
 * 提供全局状态管理能力
 */
import { ref } from 'vue'

interface QiankunState {
  [key: string]: unknown
}

const globalState = ref<QiankunState>({})
let stateChangeHandler: ((state: QiankunState, prev: QiankunState) => void) | null = null

/**
 * 使用 Qiankun 全局状态
 */
export function useQiankun() {
  /**
   * 设置全局状态
   */
  function setGlobalState(state: QiankunState): boolean {
    if (window.__POWERED_BY_QIANKUN__) {
      // 在 qiankun 环境中，通过 props 传递的 setGlobalState 更新
      return false
    }
    // 独立运行时，直接更新本地状态
    const prev = { ...globalState.value }
    globalState.value = { ...globalState.value, ...state }
    stateChangeHandler?.(globalState.value, prev)
    return true
  }

  /**
   * 监听全局状态变化
   */
  function onGlobalStateChange(
    callback: (state: QiankunState, prev: QiankunState) => void,
  ): void {
    stateChangeHandler = callback
  }

  /**
   * 获取当前全局状态
   */
  function getGlobalState(): QiankunState {
    return { ...globalState.value }
  }

  return {
    globalState,
    setGlobalState,
    onGlobalStateChange,
    getGlobalState,
  }
}
