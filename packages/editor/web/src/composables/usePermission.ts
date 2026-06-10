/**
 * 权限控制 Composable
 *
 * 从 useAppStore.userContext.permissions 获取当前用户的权限码列表，
 * 提供 hasPermission / hasAnyPermission / hasAllPermission 方法。
 *
 * @example
 * ```ts
 * const { hasPermission, hasAnyPermission } = usePermission()
 * if (hasPermission('flow:design')) { ... }
 * if (hasAnyPermission(['flow:design', 'flow:approve'])) { ... }
 * ```
 */
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'

export function usePermission() {
  const appStore = useAppStore()

  /** 当前用户的权限码列表（响应式） */
  const permissions = computed(() => appStore.userContext.permissions ?? [])

  /**
   * 判断当前用户是否拥有指定权限码
   *
   * @param code - 权限码，如 'flow:design'
   * @returns 是否拥有该权限
   */
  function hasPermission(code: string): boolean {
    return permissions.value.includes(code)
  }

  /**
   * 判断当前用户是否拥有任意一个权限码（OR 逻辑）
   *
   * @param codes - 权限码数组
   * @returns 是否拥有至少一个权限
   */
  function hasAnyPermission(codes: string[]): boolean {
    const userPerms = permissions.value
    return codes.some((code) => userPerms.includes(code))
  }

  /**
   * 判断当前用户是否拥有全部权限码（AND 逻辑）
   *
   * @param codes - 权限码数组
   * @returns 是否拥有全部权限
   */
  function hasAllPermission(codes: string[]): boolean {
    const userPerms = permissions.value
    return codes.every((code) => userPerms.includes(code))
  }

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermission,
  }
}
