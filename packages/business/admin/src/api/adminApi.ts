/**
 * Admin API -- centralized API layer
 *
 * All admin backend calls go through this file.
 * View components should import functions from here instead of using apiClient directly.
 */
import { apiClient } from '@schema-form/platform-shared/utils/apiClient'

// ---- Types ----

export interface MenuItem {
  id: string
  parentId: string | null
  name: string
  path: string
  icon: string
  type: 'menu' | 'button'
  permission: string
  sort: number
  status: string
  component: string
  microAppId: string | null
  target: '_self' | '_blank'
  routeType: 'schema' | 'micro-app' | 'link'
  schemaId: string | null
  url: string
  app: string
  children?: MenuItem[]
}

export interface User {
  id: string
  username: string
  displayName: string
  email: string | null
  phone: string | null
  avatar: string
  status: string
  roles: string[]
  deptId: string | null
  createdAt: string
}

export interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
  data_scope: string
  dept_ids: string[]
  createdAt: string
}

export interface RoleSimple {
  id: string
  name: string
}

export interface Permission {
  id: string
  code: string
  name: string
  module: string
}

export interface Dept {
  id: string
  name: string
  parentId: string | null
  sort: number
  status: string
  leader: string
  children?: Dept[]
  createdAt: string
}

export interface DictType {
  id: string
  name: string
  code: string
  status: string
  remark: string
}

export interface DictData {
  id: string
  dictTypeCode: string
  label: string
  value: string
  sort: number
  status: string
}

// ---- Menu ----

export function loadAdminMenuRoute() {
  return apiClient.get<MenuItem[]>('/menus/route?app=admin')
}

export function loadMenuTree() {
  return apiClient.get<any>('/menus?tree=true')
}

export function createMenu(data: Partial<MenuItem>) {
  return apiClient.post('/menus', data)
}

export function updateMenu(id: string, data: Partial<MenuItem>) {
  return apiClient.put(`/menus/${id}`, data)
}

export function deleteMenu(id: string) {
  return apiClient.delete(`/menus/${id}`)
}

// ---- Role ----

export function loadRoles() {
  return apiClient.get<{ items: Role[] }>('/roles')
}

export function loadRolesSimple() {
  return apiClient.get<{ items: RoleSimple[] }>('/roles')
}

export function loadPermissions() {
  return apiClient.get<Permission[]>('/roles/permissions')
}

export function createRole(data: { name: string; description: string; data_scope: string; dept_ids: string[] }) {
  return apiClient.post('/roles', data)
}

export function updateRole(id: string, data: Record<string, unknown>) {
  return apiClient.put(`/roles/${id}`, data)
}

export function deleteRole(id: string) {
  return apiClient.delete(`/roles/${id}`)
}

// ---- User ----

export function loadUsers(query: string) {
  return apiClient.get<{ items: User[]; total: number }>(`/users?${query}`)
}

export function createUser(data: Record<string, unknown>) {
  return apiClient.post('/users', data)
}

export function updateUser(id: string, data: Record<string, unknown>) {
  return apiClient.put(`/users/${id}`, data)
}

export function deleteUser(id: string) {
  return apiClient.delete(`/users/${id}`)
}

export function resetUserPassword(id: string, password: string) {
  return apiClient.put(`/users/${id}/password`, { password })
}

// ---- Dept ----

export function loadDeptTree() {
  return apiClient.get<Dept[]>('/depts?tree=true')
}

export function createDept(data: { name: string; parentId: string | null; sort: number; status: string; leader: string }) {
  return apiClient.post('/depts', data)
}

export function updateDept(id: string, data: { name: string; parentId: string | null; sort: number; status: string; leader: string }) {
  return apiClient.put(`/depts/${id}`, data)
}

export function deleteDept(id: string) {
  return apiClient.delete(`/depts/${id}`)
}

// ---- Post ----

export function loadPosts() {
  return apiClient.get<{ items: any[] }>('/posts')
}

export function createPost(data: { name: string; code: string; sort: number; status: string }) {
  return apiClient.post('/posts', data)
}

export function updatePost(id: string, data: { name: string; code: string; sort: number; status: string }) {
  return apiClient.put(`/posts/${id}`, data)
}

export function deletePost(id: string) {
  return apiClient.delete(`/posts/${id}`)
}

// ---- Tenant ----

export function loadTenants() {
  return apiClient.get<{ items: any[] }>('/tenants')
}

export function createTenant(data: Record<string, unknown>) {
  return apiClient.post('/tenants', data)
}

export function updateTenant(id: string, data: Record<string, unknown>) {
  return apiClient.put(`/tenants/${id}`, data)
}

export function deleteTenant(id: string) {
  return apiClient.delete(`/tenants/${id}`)
}

// ---- Dict ----

export function loadDictTypes() {
  return apiClient.get<{ items: DictType[] }>('/dict/types')
}

export function loadDictData(typeCode: string) {
  return apiClient.get<{ items: DictData[] }>(`/dict/data?dictTypeCode=${typeCode}`)
}

export function createDictType(data: { name: string; code: string; remark: string }) {
  return apiClient.post('/dict/types', data)
}

export function updateDictType(id: string, data: { name: string; code: string; remark: string }) {
  return apiClient.put(`/dict/types/${id}`, data)
}

export function deleteDictType(id: string) {
  return apiClient.delete(`/dict/types/${id}`)
}

export function createDictData(data: Record<string, unknown>) {
  return apiClient.post('/dict/data', data)
}

export function updateDictData(id: string, data: Record<string, unknown>) {
  return apiClient.put(`/dict/data/${id}`, data)
}

export function deleteDictData(id: string) {
  return apiClient.delete(`/dict/data/${id}`)
}

// ---- Config ----

export function loadConfigs() {
  return apiClient.get<{ items: any[] }>('/config')
}

export function createConfig(data: { name: string; key: string; value: string; remark: string; isSystem: boolean }) {
  return apiClient.post('/config', data)
}

export function updateConfig(id: string, data: { name: string; key: string; value: string; remark: string; isSystem: boolean }) {
  return apiClient.put(`/config/${id}`, data)
}

export function deleteConfig(id: string) {
  return apiClient.delete(`/config/${id}`)
}

// ---- Online Users ----

export function loadOnlineUsers(page: number) {
  return apiClient.get(`/online-users?page=${page}&pageSize=20`)
}

export function kickOnlineUser(id: string) {
  return apiClient.delete(`/online-users/${id}`)
}

// ---- Login Logs ----

export function loadLoginLogs(query: string) {
  return apiClient.get(`/login-logs?${query}`)
}

export function clearLoginLogs() {
  return apiClient.delete('/login-logs')
}

// ---- Audit Logs ----

export function loadAuditLogs(query: string) {
  return apiClient.get(`/audit-logs?${query}`)
}
