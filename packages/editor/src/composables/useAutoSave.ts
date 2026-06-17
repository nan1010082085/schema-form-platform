/**
 * useAutoSave — 自动保存 composable
 *
 * 当编辑器有未保存的更改时，自动定时保存。
 * 使用防抖机制：检测到脏数据后启动倒计时，倒计时内再次变脏则重置计时器。
 * 仅在编辑模式下生效。
 */
import { watch, onUnmounted, ref, toRef } from 'vue'
import { useEditorStore } from '@/stores/editor'

export interface AutoSaveOptions {
  /** 自动保存间隔（毫秒），默认 60000（60 秒） */
  delayMs?: number
  /** 是否启用自动保存（支持 ref） */
  enabled?: boolean | import('vue').Ref<boolean>
  /** 实际执行保存的回调函数 */
  onSave: () => Promise<void>
}

export function useAutoSave(options: AutoSaveOptions) {
  const { delayMs = 60_000, onSave } = options
  const enabledRef = toRef(options.enabled ?? true)
  const editorStore = useEditorStore()

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
      // 仅在脏状态下保存
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
      if (dirty) {
        scheduleSave()
      } else {
        clearTimer()
      }
    },
    { immediate: true },
  )

  // 监听启用状态变化
  const stopEnabledWatch = watch(enabledRef, (val) => {
    if (val && editorStore.isDirty) {
      scheduleSave()
    } else {
      clearTimer()
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
    stop,
  }
}
