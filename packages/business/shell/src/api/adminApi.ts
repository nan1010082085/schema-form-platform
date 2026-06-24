/**
 * Shell 系统管理 API
 *
 * 菜单管理、用户管理、角色管理、部门管理、岗位管理、字典管理、参数管理、日志管理等后台接口。
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
  routeType: 'schema' | 'micro-app' | 'link' | 'route'
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

export interface RoleSimple {
  id: string
  name: string
}

export interface Role {
  id: string
  name: string
  description: string | null
  permissions: string[]
  data_scope: string
  dept_ids: string[]
  createdAt: string
}

export interface Permission {
  id: string
  name: string
  code: string
  module: string
}

export interface Dept {
  id: string
  name: string
  parentId: string | null
  sort: number
  status: string
  leader: string | null
  children?: Dept[]
}

export interface Post {
  id: string
  postCode: string
  postName: string
  sort: number
  status: string
  remark: string | null
}

export interface DictType {
  id: string
  name: string
  code: string
  status: string
  remark: string | null
}

export interface DictData {
  id: string
  dictTypeId: string
  label: string
  value: string
  sort: number
  status: string
  remark: string | null
}

export interface Config {
  id: string
  name: string
  key: string
  value: string
  type: string
  status: string
  remark: string | null
}

export interface AuditLog {
  id: string
  module: string
  action: string
  username: string
  method: string
  url: string
  ip: string
  status: string
  duration: number
  createdAt: string
}

export interface LoginLog {
  id: string
  username: string
  ip: string
  browser: string
  os: string
  status: string
  message: string
  createdAt: string
}

export interface OnlineUser {
  id: string
  sessionId: string
  username: string
  ip: string
  browser: string
  os: string
  loginTime: string
}

export interface Tenant {
  id: string
  name: string
  code: string
  status: string
  remark: string | null
  createdAt: string
}

// ---- Menu ----

export function loadMenuTree() {
  return apiClient.get<MenuItem[]>('/menus?tree=true')
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

// ---- Role ----

export function loadRolesSimple() {
  return apiClient.get<{ items: RoleSimple[] }>('/roles')
}

export function loadRoles(query?: string) {
  return apiClient.get<{ items: Role[]; total: number }>(`/roles${query ? `?${query}` : ''}`)
}

export function loadPermissions() {
  return apiClient.get<Permission[]>('/roles/permissions')
}

export function createRole(data: Partial<Role>) {
  return apiClient.post('/roles', data)
}

export function updateRole(id: string, data: Partial<Role>) {
  return apiClient.put(`/roles/${id}`, data)
}

export function deleteRole(id: string) {
  return apiClient.delete(`/roles/${id}`)
}

// ---- Dept ----

export function loadDeptTree() {
  return apiClient.get<Dept[]>('/depts?tree=true')
}

export function createDept(data: Partial<Dept>) {
  return apiClient.post('/depts', data)
}

export function updateDept(id: string, data: Partial<Dept>) {
  return apiClient.put(`/depts/${id}`, data)
}

export function deleteDept(id: string) {
  return apiClient.delete(`/depts/${id}`)
}

// ---- Post ----

export function loadPosts() {
  return apiClient.get<{ items: Post[]; total: number }>('/posts')
}

export function createPost(data: Partial<Post>) {
  return apiClient.post('/posts', data)
}

export function updatePost(id: string, data: Partial<Post>) {
  return apiClient.put(`/posts/${id}`, data)
}

export function deletePost(id: string) {
  return apiClient.delete(`/posts/${id}`)
}

// ---- Dict ----

export function loadDictTypes(query?: string) {
  return apiClient.get<{ items: DictType[]; total: number }>(`/dict/types${query ? `?${query}` : ''}`)
}

export function createDictType(data: Partial<DictType>) {
  return apiClient.post('/dict/types', data)
}

export function updateDictType(id: string, data: Partial<DictType>) {
  return apiClient.put(`/dict/types/${id}`, data)
}

export function deleteDictType(id: string) {
  return apiClient.delete(`/dict/types/${id}`)
}

export function loadDictData(typeCode: string) {
  return apiClient.get<{ items: DictData[]; total: number }>(`/dict/data?dictTypeId=${typeCode}`)
}

export function createDictData(data: Partial<DictData>) {
  return apiClient.post('/dict/data', data)
}

export function updateDictData(id: string, data: Partial<DictData>) {
  return apiClient.put(`/dict/data/${id}`, data)
}

export function deleteDictData(id: string) {
  return apiClient.delete(`/dict/data/${id}`)
}

// ---- Config ----

export function loadConfigs(query?: string) {
  return apiClient.get<{ items: Config[]; total: number }>(`/config${query ? `?${query}` : ''}`)
}

export function createConfig(data: Partial<Config>) {
  return apiClient.post('/config', data)
}

export function updateConfig(id: string, data: Partial<Config>) {
  return apiClient.put(`/config/${id}`, data)
}

export function deleteConfig(id: string) {
  return apiClient.delete(`/config/${id}`)
}

// ---- Audit Log ----

export function loadAuditLogs(query: string) {
  return apiClient.get<{ items: AuditLog[]; total: number }>(`/audit-logs?${query}`)
}

// ---- Login Log ----

export function loadLoginLogs(query: string) {
  return apiClient.get<{ items: LoginLog[]; total: number }>(`/login-logs?${query}`)
}

export function clearLoginLogs() {
  return apiClient.delete('/login-logs')
}

// ---- Online Users ----

export function loadOnlineUsers(page?: number) {
  return apiClient.get<{ items: OnlineUser[]; total: number }>(`/online-users${page ? `?page=${page}` : ''}`)
}

export function kickOnlineUser(sessionId: string) {
  return apiClient.delete(`/online-users/${sessionId}`)
}

// ---- Tenant ----

export function loadTenants() {
  return apiClient.get<{ items: Tenant[]; total: number }>('/tenant')
}

export function createTenant(data: Partial<Tenant>) {
  return apiClient.post('/tenant', data)
}

export function updateTenant(id: string, data: Partial<Tenant>) {
  return apiClient.put(`/tenant/${id}`, data)
}

export function deleteTenant(id: string) {
  return apiClient.delete(`/tenant/${id}`)
}
