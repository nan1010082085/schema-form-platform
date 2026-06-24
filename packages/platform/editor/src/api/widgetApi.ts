/**
 * Widget API — 组件/数据源相关接口
 *
 * 聚合字典查询、远程选项加载等接口。
 * 底层委托 utils/apiClient。
 */
import { apiClient } from '@/utils/apiClient'

export { fetchDictByCode } from '@/utils/apiClient'
export type { DictItem } from '@/utils/apiClient'

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
