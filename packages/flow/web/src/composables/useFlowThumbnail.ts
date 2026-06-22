/**
 * 从 FlowGraph 节点数据生成 SVG 缩略图 base64
 */
import type { FlowGraph } from '@schema-form/flow-shared'

const NODE_COLORS: Record<string, string> = {
  'bpmn-start-event': '#26a036',
  'bpmn-end-event': '#e50113',
  'bpmn-user-task': '#409eff',
  'bpmn-service-task': '#597ef7',
  'bpmn-script-task': '#597ef7',
  'bpmn-send-task': '#597ef7',
  'bpmn-receive-task': '#597ef7',
  'bpmn-exclusive-gateway': '#f759ab',
  'bpmn-parallel-gateway': '#ff85c0',
  'bpmn-inclusive-gateway': '#d3adf7',
  'bpmn-sub-process': '#ffc53d',
}

/**
 * 从 FlowGraph 数据生成 SVG 缩略图 base64
 */
export function generateThumbnail(graph: FlowGraph): string {
  if (!graph?.nodes?.length) return ''

  const nodes = graph.nodes
  const edges = graph.edges ?? []

  // 计算边界
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const n of nodes) {
    const w = n.width ?? 200
    const h = n.height ?? 48
    if (n.x < minX) minX = n.x
    if (n.y < minY) minY = n.y
    if (n.x + w > maxX) maxX = n.x + w
    if (n.y + h > maxY) maxY = n.y + h
  }

  const pad = 20
  const svgW = maxX - minX + pad * 2
  const svgH = maxY - minY + pad * 2
  const ox = -minX + pad
  const oy = -minY + pad

  const parts: string[] = []
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`)
  parts.push(`<rect width="${svgW}" height="${svgW}" fill="#f5f7fa" rx="4"/>`)

  // 画边（直线）
  for (const e of edges) {
    const src = nodes.find(n => n.id === e.source.cell)
    const tgt = nodes.find(n => n.id === e.target.cell)
    if (!src || !tgt) continue
    const sw = src.width ?? 200
    const sh = src.height ?? 48
    const tw = tgt.width ?? 200
    const th = tgt.height ?? 48
    const x1 = src.x + sw / 2 + ox
    const y1 = src.y + sh / 2 + oy
    const x2 = tgt.x + tw / 2 + ox
    const y2 = tgt.y + th / 2 + oy
    parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#aab2c0" stroke-width="1.5"/>`)
  }

  // 画节点
  for (const n of nodes) {
    const w = n.width ?? 200
    const h = n.height ?? 48
    const cx = n.x + ox
    const cy = n.y + oy
    const color = NODE_COLORS[n.shape] ?? '#409eff'

    if (n.shape?.includes('gateway')) {
      // 菱形
      const dx = cx + w / 2
      const dy = cy + h / 2
      const r = Math.min(w, h) / 2
      parts.push(`<polygon points="${dx},${dy - r} ${dx + r},${dy} ${dx},${dy + r} ${dx - r},${dy}" fill="${color}" opacity="0.85"/>`)
    } else if (n.shape?.includes('event')) {
      // 圆角矩形（事件）
      parts.push(`<rect x="${cx}" y="${cy}" width="${w}" height="${h}" rx="${h / 2}" fill="${color}" opacity="0.15" stroke="${color}" stroke-width="1.5"/>`)
    } else {
      // 矩形（任务）
      parts.push(`<rect x="${cx}" y="${cy}" width="${w}" height="${h}" rx="4" fill="${color}" opacity="0.15" stroke="${color}" stroke-width="1.5"/>`)
    }
  }

  parts.push('</svg>')

  const svg = parts.join('')
  // 转 base64（兼容 UTF-8）
  const encoded = typeof btoa === 'function'
    ? btoa(unescape(encodeURIComponent(svg)))
    : Buffer.from(svg).toString('base64')
  return `data:image/svg+xml;base64,${encoded}`
}
