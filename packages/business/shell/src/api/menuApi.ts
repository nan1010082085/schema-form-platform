/**
 * Menu API -- centralized menu API layer
 *
 * All menu backend calls go through this file.
 */
import { apiClient } from '@schema-form/platform-shared/utils/apiClient'
import type { MenuTreeNode } from '@/types/menu'

export function fetchMenuRoute() {
  return apiClient.get<MenuTreeNode[]>('/menus/route')
}
