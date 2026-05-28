/**
 * micro-app 子应用生命周期
 *
 * micro-app 框架加载时自动执行。
 * 导出 bootstrap/mount/unmount 三个生命周期函数。
 * 通过 window.__MICRO_APP_EXPOSE_METHODS__ 暴露表单操作方法给主应用。
 */
import type { MicroappApi } from './index'

let formApi: MicroappApi | null = null

/** 生命周期：应用初始化（只执行一次） */
export async function bootstrap(): Promise<void> {
  console.log('[SchemaForm] micro-app bootstrap')
}

/** 生命周期：应用挂载 */
export async function mount(props: Record<string, unknown>): Promise<void> {
  console.log('[SchemaForm] micro-app mount', props)

  // 动态导入避免主包体积膨胀
  const { createMicroappVueApp } = await import('./index')
  const container = props.container as HTMLElement
  const config = props.data as Record<string, unknown> | undefined

  if (!container) {
    console.error('[SchemaForm] micro-app: container not found')
    return
  }

  formApi = await createMicroappVueApp({
    container,
    publishId: config?.publishId as string,
    baseUrl: config?.baseUrl as string,
    token: config?.token as string,
  })
}

/** 生命周期：应用卸载 */
export async function unmount(): Promise<void> {
  console.log('[SchemaForm] micro-app unmount')
  if (formApi) {
    formApi.destroy()
    formApi = null
  }
}
