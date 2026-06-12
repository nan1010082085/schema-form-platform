/**
 * useDialog - 公共弹框管理
 */
import { ref } from 'vue'

export function useDialog() {
  const visible = ref(false)
  const loading = ref(false)

  function open() {
    visible.value = true
  }

  function close() {
    visible.value = false
  }

  function setLoading(value: boolean) {
    loading.value = value
  }

  return {
    visible,
    loading,
    open,
    close,
    setLoading,
  }
}
