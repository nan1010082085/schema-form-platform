/**
 * Widget API — 组件/数据源相关接口
 *
 * 聚合字典查询、远程选项加载、组件数据源加载等接口。
 * 底层委托 utils/apiClient。
 */
import { apiClient } from '@/utils/apiClient'

export { fetchDictByCode } from '@/utils/apiClient'
export type { DictItem } from '@/utils/apiClient'

/**
 * 通用组件数据源加载
 *
 * @param url - 接口路径（如 /api/xxx）
 * @returns 响应中的 data 字段（若存在），否则返回完整响应体
 */
export async function fetchWidgetDataSource<T = Record<string, unknown>>(url: string): Promise<T> {
  const resp = await apiClient.get<{ data?: T } & T>(url)
  return ((resp as { data?: T }).data ?? resp) as T
}

/** 远程下拉选项项 */
export interface RemoteOption {
  label: string
  value: string | number | boolean
}

/**
 * 获取远程下拉选项
 *
 * @param url - 接口路径（如 /api/options/xxx）
 * @param labelField - 标签字段名，默认 'name'
 * @param valueField - 值字段名，默认 'id'
 */
export async function fetchRemoteOptions(
  url: string,
  labelField = 'name',
  valueField = 'id',
): Promise<RemoteOption[]> {
  const data = await apiClient.get<{ items: Record<string, unknown>[] }>(url)
  const items = data?.items ?? []
  return items.map(item => ({
    label: String(item[labelField] ?? ''),
    value: String(item[valueField] ?? ''),
  }))
}
