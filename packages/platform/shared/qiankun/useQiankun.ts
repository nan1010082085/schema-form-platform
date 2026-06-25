/**
 * useQiankun - Qiankun 状态管理组合函数
 *
 * 提供全局状态管理能力。
 * qiankun 环境下委托给 props 注入的 setGlobalState；独立运行时使用本地状态。
 */
import { ref } from 'vue'
import { initQiankunLifecycle } from './useQiankunEvent'
import type { QiankunProps } from './types'

interface QiankunState {
  [key: string]: unknown
}

const globalState = ref<QiankunState>({})
let stateChangeHandler: ((state: QiankunState, prev: QiankunState) => void) | null = null

/** 存储 qiankun props 的 setGlobalState 引用 */
let qiankunSetGlobalState: QiankunProps['setGlobalState'] | undefined

/**
 * 子应用 mount 生命周期调用，注入 qiankun props。
 * 同时初始化事件通道（委托给 useQiankunEvent）。
 */
export function initQiankunProps(props: QiankunProps): void {
  qiankunSetGlobalState = props.setGlobalState
  initQiankunLifecycle(props)
}

/**
 * 使用 Qiankun 全局状态
 */
export function useQiankun() {
  /**
   * 设置全局状态
   */
  function setGlobalState(state: QiankunState): boolean {
    if (qiankunSetGlobalState) {
      return qiankunSetGlobalState(state)
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
