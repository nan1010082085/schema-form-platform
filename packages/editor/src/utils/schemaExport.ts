/**
 * Schema 导出/导入工具
 *
 * 导出：只含定义态（name, type, json），不含 id、createdAt 等业务标识
 * 导入：客户端基础校验后提交服务端严格校验
 */

import type { SchemaDetail } from '@/types/api'

export interface ExportedSchema {
  name: string
  type: string
  json: unknown
  exportedAt: string
  version: '1.0'
}

/**
 * 将 Schema 序列化为可导出的 JSON 字符串
 * 只包含定义态数据，去除 id、editId、version、createdAt 等
 */
export function exportSchemaJson(schema: SchemaDetail): string {
  const exported: ExportedSchema = {
    name: schema.name,
    type: schema.type,
    json: schema.json,
    exportedAt: new Date().toISOString(),
    version: '1.0',
  }
  return JSON.stringify(exported, null, 2)
}

/**
 * 触发浏览器下载 JSON 文件
 */
export function downloadSchemaJson(schema: SchemaDetail): void {
  const json = exportSchemaJson(schema)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${schema.name || 'schema'}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * 从文件解析导入的 Schema
 * 做客户端基础校验，详细校验由服务端完成
 */
export function parseImportFile(file: File): Promise<{ name: string; type: string; json: unknown[] }> {
  return new Promise((resolve, reject) => {
    if (!file.name.endsWith('.json')) {
      reject(new Error('请选择 .json 文件'))
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string)

        if (!parsed.name || typeof parsed.name !== 'string') {
          reject(new Error('无效的 Schema 文件：缺少 name 字段'))
          return
        }
        if (!parsed.json || !Array.isArray(parsed.json)) {
          reject(new Error('无效的 Schema 文件：json 字段必须是数组'))
          return
        }
        if (parsed.type && !['form', 'search-list', 'search_list'].includes(parsed.type)) {
          reject(new Error('无效的 Schema 文件：type 必须是 form 或 search-list'))
          return
        }

        resolve({
          name: parsed.name,
          type: parsed.type || 'form',
          json: parsed.json,
        })
      } catch {
        reject(new Error('无效的 JSON 文件'))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })
}
