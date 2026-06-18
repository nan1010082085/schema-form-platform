/**
 * useAutoSave — 自动保存 composable
 *
 * 当编辑器有未保存的更改时，自动定时保存。
 * 使用防抖机制：检测到脏数据后启动倒计时，倒计时内再次变脏则重置计时器。
 * 仅在编辑模式下生效。
 */
import { watch, onUnmounted, ref, type Ref } from 'vue'
import { useEditorStore } from '@/stores/editor'

export interface AutoSaveOptions {
  /** 自动保存间隔（毫秒），默认 60000（60 秒） */
  delayMs?: number
  /** 是否启用自动保存（支持响应式 Ref） */
  enabled?: boolean | Ref<boolean>
  /** 实际执行保存的回调函数 */
  onSave: () => Promise<void>
}

export function useAutoSave(options: AutoSaveOptions) {
  const { delayMs = 60_000, onSave } = options
  const editorStore = useEditorStore()

  // 支持响应式 enabled
  const enabledRef = typeof options.enabled === 'object' && 'value' in options.enabled
    ? options.enabled
    : ref(options.enabled ?? true)

  const isAutoSaving = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null

  function clearTimer() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  function scheduleSave() {
    clearTimer()
    if (!enabledRef.value) return

    timer = setTimeout(async () => {
      if (!editorStore.isDirty) return

      isAutoSaving.value = true
      try {
        await onSave()
      } finally {
        isAutoSaving.value = false
      }
    }, delayMs)
  }

  // 监听脏标记：变脏时启动自动保存倒计时，变干净时取消
  const stopDirtyWatch = watch(
    () => editorStore.isDirty,
    (dirty) => {
      if (dirty && enabledRef.value) {
        scheduleSave()
      } else {
        clearTimer()
      }
    },
    { immediate: true },
  )

  // 监听 enabled 变化：关闭时取消定时器，开启时如果脏则重新调度
  const stopEnabledWatch = watch(enabledRef, (val) => {
    if (!val) {
      clearTimer()
    } else if (editorStore.isDirty) {
      scheduleSave()
    }
  })

  function stop() {
    clearTimer()
    stopDirtyWatch()
    stopEnabledWatch()
  }

  onUnmounted(() => {
    clearTimer()
  })

  return {
    isAutoSaving,
    enabled: enabledRef,
    stop,
  }
}
