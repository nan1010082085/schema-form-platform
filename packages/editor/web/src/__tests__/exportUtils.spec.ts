import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  rowsToCsv,
  rowsToExcelHtml,
  exportCsv,
  exportExcel,
  type ExportColumn,
} from '@/utils/exportUtils'

// jsdom does not support URL.createObjectURL / revokeObjectURL
beforeEach(() => {
  if (!globalThis.URL.createObjectURL) {
    vi.stubGlobal('URL', {
      ...globalThis.URL,
      createObjectURL: vi.fn(() => 'blob:mock'),
      revokeObjectURL: vi.fn(),
    })
  }
})

const sampleColumns: ExportColumn[] = [
  { prop: 'name', label: 'Name', render: 'text' },
  { prop: 'status', label: 'Status', render: 'badge' },
  { prop: 'avatar', label: 'Avatar', render: 'image' },
  { prop: 'count', label: 'Count' },
]

const sampleRows: Record<string, unknown>[] = [
  { name: 'Alice', status: 'Active', avatar: 'http://img/a.png', count: 42 },
  { name: 'Bob', status: 'Inactive', avatar: 'http://img/b.png', count: 7 },
  { name: 'Charlie, Jr.', status: 'Active', avatar: '', count: 0 },
]

describe('rowsToCsv', () => {
  it('generates CSV with header row', () => {
    const csv = rowsToCsv(sampleRows, sampleColumns)
    const lines = csv.split('\n')
    expect(lines[0]).toContain('Name')
    expect(lines[0]).toContain('Status')
    expect(lines[0]).toContain('Avatar')
    expect(lines[0]).toContain('Count')
  })

  it('includes all data rows', () => {
    const csv = rowsToCsv(sampleRows, sampleColumns)
    const lines = csv.trim().split('\n')
    // header + 3 data rows
    expect(lines).toHaveLength(4)
  })

  it('escapes values containing commas', () => {
    const csv = rowsToCsv(sampleRows, sampleColumns)
    expect(csv).toContain('"Charlie, Jr."')
  })

  it('includes BOM for Excel UTF-8 support', () => {
    const csv = rowsToCsv(sampleRows, sampleColumns)
    expect(csv.charCodeAt(0)).toBe(0xfeff)
  })

  it('badge/image columns export as plain text values', () => {
    const csv = rowsToCsv(sampleRows, sampleColumns)
    expect(csv).toContain('Active')
    expect(csv).toContain('http://img/a.png')
  })

  it('handles empty rows', () => {
    const csv = rowsToCsv([], sampleColumns)
    const lines = csv.trim().split('\n')
    expect(lines).toHaveLength(1) // header only
  })

  it('handles null/undefined values', () => {
    const rows = [{ name: null, status: undefined, avatar: '', count: 0 }]
    const csv = rowsToCsv(rows, sampleColumns)
    expect(csv).toContain(',,')
  })
})

describe('rowsToExcelHtml', () => {
  it('generates valid HTML with table', () => {
    const html = rowsToExcelHtml(sampleRows, sampleColumns)
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<table border="1">')
    expect(html).toContain('<thead>')
    expect(html).toContain('<tbody>')
  })

  it('includes all column headers', () => {
    const html = rowsToExcelHtml(sampleRows, sampleColumns)
    expect(html).toContain('>Name<')
    expect(html).toContain('>Status<')
  })

  it('includes all data rows', () => {
    const html = rowsToExcelHtml(sampleRows, sampleColumns)
    expect(html).toContain('>Alice<')
    expect(html).toContain('>Bob<')
  })

  it('escapes HTML entities', () => {
    const rows = [{ name: '<script>alert(1)</script>', status: 'A&B', avatar: '', count: 0 }]
    const html = rowsToExcelHtml(rows, sampleColumns)
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('A&amp;B')
  })

  it('badge columns export as plain text', () => {
    const html = rowsToExcelHtml(sampleRows, sampleColumns)
    expect(html).toContain('>Active<')
  })
})

describe('exportCsv and exportExcel', () => {
  beforeEach(() => {
    vi.mocked(URL.createObjectURL).mockClear()
    vi.mocked(URL.revokeObjectURL).mockClear()
  })

  it('exportCsv creates blob with CSV MIME type', () => {
    exportCsv(sampleRows, { columns: sampleColumns, filename: 'test.csv' })

    expect(URL.createObjectURL).toHaveBeenCalled()
    const blobArg = vi.mocked(URL.createObjectURL).mock.calls[0]?.[0] as Blob
    expect(blobArg.type).toContain('text/csv')
  })

  it('exportExcel creates blob with Excel MIME type', () => {
    exportExcel(sampleRows, { columns: sampleColumns, filename: 'test.xls' })

    expect(URL.createObjectURL).toHaveBeenCalled()
    const blobArg = vi.mocked(URL.createObjectURL).mock.calls[0]?.[0] as Blob
    expect(blobArg.type).toContain('vnd.ms-excel')
  })
})
