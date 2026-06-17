/**
 * v-permission 指令
 *
 * 根据当前用户的权限码列表控制 DOM 元素的显示/隐藏。
 * 无权限时直接移除元素（v-if 语义）。
 *
 * @example
 * ```vue
 * <el-button v-permission="'user:create'">新建用户</el-button>
 * <el-button v-permission="['user:edit', 'user:delete']">操作</el-button>
 * ```
 */
import type { Directive, DirectiveBinding } from 'vue'
import { useAuthStore } from '../stores/auth'

function checkPermission(value: string | string[]): boolean {
  const authStore = useAuthStore()
  if (typeof value === 'string') {
    return authStore.hasPermission(value)
  }
  if (Array.isArray(value)) {
    return authStore.hasAnyPermission(value)
  }
  return false
}

export const permissionDirective: Directive<HTMLElement, string | string[]> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
    if (!checkPermission(binding.value)) {
      el.parentNode?.removeChild(el)
    }
  },
  updated(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
    const newValue = binding.value
    const oldValue = binding.oldValue
    // 值未变化时跳过
    if (JSON.stringify(newValue) === JSON.stringify(oldValue)) return
    if (!checkPermission(newValue)) {
      el.parentNode?.removeChild(el)
    }
  },
}
