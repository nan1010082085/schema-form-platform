import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFlowExport } from '../composables/useFlowExport.js'

vi.mock('../api/flowApi.js', () => ({
  flowApi: {
    exportInstanceCsv: vi.fn(),
    exportApprovalLogs: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

import { flowApi } from '../api/flowApi.js'
import { ElMessage } from 'element-plus'

// Mock URL.createObjectURL / revokeObjectURL
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
const mockRevokeObjectURL = vi.fn()
Object.defineProperty(globalThis, 'URL', {
  value: { createObjectURL: mockCreateObjectURL, revokeObjectURL: mockRevokeObjectURL },
})

// Mock anchor click
const mockClick = vi.fn()
vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
  if (tag === 'a') return { click: mockClick, href: '', download: '' } as unknown as HTMLAnchorElement
  return document.createElement(tag)
})

describe('useFlowExport', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('exports a single instance as CSV', async () => {
    const mockBlob = new Blob(['csv-data'], { type: 'text/csv' })
    vi.mocked(flowApi.exportInstanceCsv).mockResolvedValue(mockBlob)

    const { exporting, exportInstance } = useFlowExport()
    expect(exporting.value).toBe(false)

    await exportInstance('inst-001')

    expect(flowApi.exportInstanceCsv).toHaveBeenCalledWith('inst-001')
    expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob)
    expect(mockClick).toHaveBeenCalled()
    expect(ElMessage.success).toHaveBeenCalledWith('导出成功')
    expect(exporting.value).toBe(false)
  })

  it('shows error message when single export fails', async () => {
    vi.mocked(flowApi.exportInstanceCsv).mockRejectedValue(new Error('Network error'))

    const { exportInstance } = useFlowExport()
    await exportInstance('inst-001')

    expect(ElMessage.error).toHaveBeenCalledWith('导出失败')
  })

  it('exports multiple instances in batch', async () => {
    const mockBlob = new Blob(['csv-data'], { type: 'text/csv' })
    vi.mocked(flowApi.exportInstanceCsv).mockResolvedValue(mockBlob)

    const { exportBatch } = useFlowExport()
    await exportBatch(['inst-001', 'inst-002', 'inst-003'])

    expect(flowApi.exportInstanceCsv).toHaveBeenCalledTimes(3)
    expect(ElMessage.success).toHaveBeenCalledWith('已导出 3 个实例')
  })

  it('shows warning when batch export has no selection', async () => {
    const { exportBatch } = useFlowExport()
    await exportBatch([])

    expect(ElMessage.warning).toHaveBeenCalledWith('请选择要导出的实例')
    expect(flowApi.exportInstanceCsv).not.toHaveBeenCalled()
  })

  it('shows error when batch export fails', async () => {
    vi.mocked(flowApi.exportInstanceCsv).mockRejectedValue(new Error('fail'))

    const { exportBatch } = useFlowExport()
    await exportBatch(['inst-001'])

    expect(ElMessage.error).toHaveBeenCalledWith('批量导出失败')
  })

  it('exports filtered approval logs', async () => {
    const mockBlob = new Blob(['csv-data'], { type: 'text/csv' })
    vi.mocked(flowApi.exportApprovalLogs).mockResolvedValue(mockBlob)

    const { exportFiltered } = useFlowExport()
    await exportFiltered({ flowId: 'flow-1', format: 'csv' })

    expect(flowApi.exportApprovalLogs).toHaveBeenCalledWith({ flowId: 'flow-1', format: 'csv' })
    expect(ElMessage.success).toHaveBeenCalledWith('导出成功')
  })

  it('exports filtered logs as JSON', async () => {
    const mockBlob = new Blob(['{}'], { type: 'application/json' })
    vi.mocked(flowApi.exportApprovalLogs).mockResolvedValue(mockBlob)

    const { exportFiltered } = useFlowExport()
    await exportFiltered({ format: 'json' })

    expect(flowApi.exportApprovalLogs).toHaveBeenCalledWith({ format: 'json' })
    expect(ElMessage.success).toHaveBeenCalledWith('导出成功')
  })
})
