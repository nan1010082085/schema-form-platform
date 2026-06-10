/**
 * usePermission — 用户权限管理
 *
 * 职责：
 * - 持有当前用户的权限集合
 * - 提供权限检查方法
 * - 从后端 /api/menus/route 获取用户可见路由
 *
 * 依赖：
 * - useAuthStore（用户信息）
 * - apiClient（HTTP 通信）
 *
 * 设计原则：
 * - 纯状态 + 查询逻辑，不涉及 UI
 * - 权限数据通过 /api/menus/route 接口获取（后端已根据角色过滤）
 * - 提供 hasPermission() 供路由守卫和组件使用
 */
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { apiClient } from '@/utils/apiClient'

/** 后端菜单路由节点 */
interface MenuRouteNode {
  id: string
  name: string
  path: string
  icon: string
  type: string
  permission: string
  sort: number
  status: string
  component: string
  parentId: string | null
  children: MenuRouteNode[]
}

/** 用户权限集合（全局单例） */
const permissions = ref<Set<string>>(new Set())

/** 用户可见的路由菜单树 */
const routeMenus = ref<MenuRouteNode[]>([])

/** 权限是否已加载 */
const permissionLoaded = ref(false)

export function usePermission() {
  const authStore = useAuthStore()

  /**
   * 从后端加载当前用户的权限集合
   * 通过 /api/menus/route 获取可见菜单，提取 permission 字段
   */
  async function loadPermissions(): Promise<void> {
    const token = authStore.token
    if (!token) {
      permissions.value = new Set()
      permissionLoaded.value = false
      return
    }

    try {
      const menus = await apiClient.get<MenuRouteNode[]>('/menus/route')
      routeMenus.value = menus

      // 从菜单树中提取所有 permission 编码
      const permSet = new Set<string>()
      function collectPermissions(nodes: MenuRouteNode[]): void {
        for (const node of nodes) {
          if (node.permission) {
            permSet.add(node.permission)
          }
          if (node.children?.length) {
            collectPermissions(node.children)
          }
        }
      }
      collectPermissions(menus)

      permissions.value = permSet
      permissionLoaded.value = true
    } catch {
      // 请求失败（如 token 过期），清空权限
      permissions.value = new Set()
      permissionLoaded.value = false
    }
  }

  /**
   * 检查是否拥有指定权限
   * @param code 权限编码，如 'user:view', 'role:edit'
   */
  function hasPermission(code: string): boolean {
    return permissions.value.has(code)
  }

  /**
   * 检查是否拥有任一权限
   * @param codes 权限编码数组
   */
  function hasAnyPermission(codes: string[]): boolean {
    return codes.some((code) => permissions.value.has(code))
  }

  /**
   * 清空权限状态（退出登录时调用）
   */
  function clearPermissions(): void {
    permissions.value = new Set()
    routeMenus.value = []
    permissionLoaded.value = false
  }

  return {
    // 状态
    permissions: computed(() => permissions.value),
    routeMenus: computed(() => routeMenus.value),
    permissionLoaded: computed(() => permissionLoaded.value),
    // 方法
    loadPermissions,
    hasPermission,
    hasAnyPermission,
    clearPermissions,
  }
}
