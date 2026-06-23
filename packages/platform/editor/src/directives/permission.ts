/**
 * v-permission 指令
 *
 * 根据当前用户的权限码列表控制 DOM 元素的显示/隐藏。
 * 无权限时直接移除元素（v-if 语义），而非隐藏（v-show 语义）。
 *
 * @example
 * ```vue
 * <!-- 单个权限码 -->
 * <el-button v-permission="'flow:design'">设计</el-button>
 *
 * <!-- 多个权限码（OR 逻辑：拥有任一权限即显示） -->
 * <el-button v-permission="['flow:design', 'flow:approve']">操作</el-button>
 * ```
 */
import type { Directive, DirectiveBinding } from 'vue'
import { useAppStore } from '@/stores/app'

/**
 * 检查用户是否拥有指定权限
 *
 * @param value - 单个权限码字符串或权限码数组（OR 逻辑）
 * @returns 是否拥有权限
 */
function checkPermission(value: string | string[]): boolean {
  const appStore = useAppStore()
  const userPerms = appStore.userContext.permissions ?? []

  if (typeof value === 'string') {
    return userPerms.includes(value)
  }

  if (Array.isArray(value)) {
    return value.some((code) => userPerms.includes(code))
  }

  return false
}

/**
 * 将原始值标准化为权限码数组
 */
function normalizeValue(value: string | string[]): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value
  return []
}

export const permissionDirective: Directive<HTMLElement, string | string[]> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
    if (!checkPermission(binding.value)) {
      el.parentNode?.removeChild(el)
    }
  },
  updated(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
    const oldValue = normalizeValue(binding.oldValue ?? [])
    const newValue = normalizeValue(binding.value)

    // 值未变化时跳过
    if (
      oldValue.length === newValue.length &&
      oldValue.every((v, i) => v === newValue[i])
    ) {
      return
    }

    if (!checkPermission(binding.value)) {
      el.parentNode?.removeChild(el)
    }
  },
}
