/**
 * CSV / Excel export utilities for search-list data.
 *
 * CSV: pure string generation, zero dependencies.
 * Excel: HTML table wrapped in XLS MIME — Excel opens these natively.
 */

export interface ExportColumn {
  prop: string
  label: string
  /** Render mode — used to decide export strategy */
  render?: string
}

export interface ExportOptions {
  filename?: string
  /** Columns to include (default: all) */
  columns?: ExportColumn[]
}

/**
 * Escape a CSV field value.
 * Wraps in double quotes if the value contains commas, quotes, or newlines.
 */
function csvEscape(value: unknown): string {
  const str = String(value ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Convert rows to CSV string.
 * First row is the header (column labels).
 */
export function rowsToCsv(rows: Record<string, unknown>[], columns: ExportColumn[]): string {
  const header = columns.map((c) => csvEscape(c.label)).join(',')
  const body = rows
    .map((row) => columns.map((c) => csvEscape(getExportValue(row, c))).join(','))
    .join('\n')
  return `﻿${header}\n${body}` // BOM for Excel UTF-8 support
}

/**
 * Convert rows to Excel-compatible HTML table.
 * Uses the `application/vnd.ms-excel` MIME type.
 */
export function rowsToExcelHtml(rows: Record<string, unknown>[], columns: ExportColumn[]): string {
  const thead = columns
    .map((c) => `<th>${escapeHtml(c.label)}</th>`)
    .join('')
  const tbody = rows
    .map(
      (row) =>
        `<tr>${columns.map((c) => `<td>${escapeHtml(String(getExportValue(row, c)))}</td>`).join('')}</tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
<table border="1">
<thead><tr>${thead}</tr></thead>
<tbody>${tbody}</tbody>
</table>
</body>
</html>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Get the exportable value for a cell.
 * Special render modes are converted to plain text.
 */
function getExportValue(row: Record<string, unknown>, col: ExportColumn): unknown {
  const raw = row[col.prop] ?? ''
  // All render modes export as plain text
  return raw
}

/**
 * Trigger a browser download with the given content.
 */
export function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export rows as CSV file.
 */
export function exportCsv(rows: Record<string, unknown>[], options: ExportOptions = {}) {
  const columns = options.columns ?? []
  const csv = rowsToCsv(rows, columns)
  triggerDownload(csv, options.filename ?? 'export.csv', 'text/csv')
}

/**
 * Export rows as Excel file (HTML table format, .xls extension).
 * Excel opens HTML tables natively with full formatting support.
 */
export function exportExcel(rows: Record<string, unknown>[], options: ExportOptions = {}) {
  const columns = options.columns ?? []
  const html = rowsToExcelHtml(rows, columns)
  triggerDownload(html, options.filename ?? 'export.xls', 'application/vnd.ms-excel')
}
