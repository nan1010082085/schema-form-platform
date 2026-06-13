import { ref } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { flowApi } from '../api/flowApi.js'

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function useFlowExport() {
  const exporting = ref(false)

  async function exportInstance(instanceId: string) {
    exporting.value = true
    try {
      const blob = await flowApi.exportInstanceCsv(instanceId)
      triggerDownload(blob, `approval-logs-${instanceId}.csv`)
      MessagePlugin.success('导出成功')
    } catch {
      MessagePlugin.error('导出失败')
    } finally {
      exporting.value = false
    }
  }

  async function exportBatch(instanceIds: string[]) {
    if (instanceIds.length === 0) {
      MessagePlugin.warning('请选择要导出的实例')
      return
    }
    exporting.value = true
    try {
      // Export each instance as a separate CSV file
      for (const id of instanceIds) {
        const blob = await flowApi.exportInstanceCsv(id)
        triggerDownload(blob, `approval-logs-${id}.csv`)
      }
      MessagePlugin.success(`已导出 ${instanceIds.length} 个实例`)
    } catch {
      MessagePlugin.error('批量导出失败')
    } finally {
      exporting.value = false
    }
  }

  async function exportFiltered(params: { flowId?: string; startDate?: string; endDate?: string; format?: 'csv' | 'json' }) {
    exporting.value = true
    try {
      const blob = await flowApi.exportApprovalLogs(params)
      const ext = params.format === 'json' ? 'json' : 'csv'
      triggerDownload(blob, `approval-logs.${ext}`)
      MessagePlugin.success('导出成功')
    } catch {
      MessagePlugin.error('导出失败')
    } finally {
      exporting.value = false
    }
  }

  return { exporting, exportInstance, exportBatch, exportFiltered }
}
