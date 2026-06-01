import type { FlowGraph, FlowNodeData } from '../types/graph.js'
import { BpmnElementType } from '../types/bpmn.js'
import type { BpmnNodeConfig } from '../types/bpmn.js'

const BPMN_TYPE_MAP: Record<string, string> = {
  [BpmnElementType.StartEvent]: 'bpmn:startEvent',
  [BpmnElementType.EndEvent]: 'bpmn:endEvent',
  [BpmnElementType.UserTask]: 'bpmn:userTask',
  [BpmnElementType.ServiceTask]: 'bpmn:serviceTask',
  [BpmnElementType.ScriptTask]: 'bpmn:scriptTask',
  [BpmnElementType.SendTask]: 'bpmn:sendTask',
  [BpmnElementType.ReceiveTask]: 'bpmn:receiveTask',
  [BpmnElementType.ExclusiveGateway]: 'bpmn:exclusiveGateway',
  [BpmnElementType.ParallelGateway]: 'bpmn:parallelGateway',
  [BpmnElementType.InclusiveGateway]: 'bpmn:inclusiveGateway',
  [BpmnElementType.TimerEvent]: 'bpmn:intermediateCatchEvent',
  [BpmnElementType.SubProcess]: 'bpmn:subProcess',
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Fields already represented as XML attributes or child elements — skip in extension blob. */
const SKIP_KEYS = new Set<string>(['bpmnType', 'label', 'timerType', 'timerValue'])

function buildNodeConfigJson(node: FlowNodeData): string {
  const config: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(node.data as BpmnNodeConfig)) {
    if (SKIP_KEYS.has(key)) continue
    if (value === undefined || value === null) continue
    config[key] = value
  }
  if (Object.keys(config).length === 0) return ''
  return JSON.stringify(config)
}

function renderExtensionElements(node: FlowNodeData, indent: string): string[] {
  const json = buildNodeConfigJson(node)
  if (!json) return []
  return [
    `${indent}<bpmn:extensionElements>`,
    `${indent}  <sf:nodeConfig>${escapeXml(json)}</sf:nodeConfig>`,
    `${indent}</bpmn:extensionElements>`,
  ]
}

export function exportToBpmnXml(
  graph: FlowGraph,
  processId = 'Process_1',
  processName = 'Process',
): string {
  const lines: string[] = []

  lines.push('<?xml version="1.0" encoding="UTF-8"?>')
  lines.push('<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"')
  lines.push('  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"')
  lines.push('  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"')
  lines.push('  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"')
  lines.push('  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"')
  lines.push('  xmlns:sf="http://schema-form.io/schema/bpmn"')
  lines.push('  id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">')

  lines.push(`  <bpmn:process id="${processId}" name="${processName}" isExecutable="true">`)

  for (const node of graph.nodes) {
    const tag = BPMN_TYPE_MAP[node.data.bpmnType]
    if (!tag) continue

    const indent = '    '
    const attrs = `id="${node.id}" name="${escapeXml(node.data.label)}"`

    const childIndent = `${indent}  `
    const extensions = renderExtensionElements(node, childIndent)
    const hasChildren = node.data.bpmnType === BpmnElementType.TimerEvent
      || node.data.bpmnType === BpmnElementType.SubProcess
      || extensions.length > 0

    if (!hasChildren) {
      lines.push(`${indent}<${tag} ${attrs} />`)
      continue
    }

    lines.push(`${indent}<${tag} ${attrs}>`)

    if (node.data.bpmnType === BpmnElementType.TimerEvent) {
      lines.push(`${childIndent}<bpmn:timerEventDefinition id="TimerDef_${node.id}">`)
      if (node.data.timerType === 'duration') {
        lines.push(`${childIndent}  <bpmn:timeDuration xsi:type="bpmn:tFormalExpression">${escapeXml(node.data.timerValue ?? '')}</bpmn:timeDuration>`)
      } else if (node.data.timerType === 'date') {
        lines.push(`${childIndent}  <bpmn:timeDate xsi:type="bpmn:tFormalExpression">${escapeXml(node.data.timerValue ?? '')}</bpmn:timeDate>`)
      } else if (node.data.timerType === 'cycle') {
        lines.push(`${childIndent}  <bpmn:timeCycle xsi:type="bpmn:tFormalExpression">${escapeXml(node.data.timerValue ?? '')}</bpmn:timeCycle>`)
      }
      lines.push(`${childIndent}</bpmn:timerEventDefinition>`)
    }

    for (const extLine of extensions) {
      lines.push(extLine)
    }

    lines.push(`${indent}</${tag}>`)
  }

  for (const edge of graph.edges) {
    const attrs = `id="${edge.id}" sourceRef="${edge.source.cell}" targetRef="${edge.target.cell}"`
    if (edge.data?.label || edge.data?.conditionExpression) {
      lines.push(`    <bpmn:sequenceFlow ${attrs}>`)
      if (edge.data.conditionExpression) {
        lines.push(`      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">${escapeXml(edge.data.conditionExpression)}</bpmn:conditionExpression>`)
      }
      lines.push(`    </bpmn:sequenceFlow>`)
    } else {
      lines.push(`    <bpmn:sequenceFlow ${attrs} />`)
    }
  }

  lines.push('  </bpmn:process>')

  lines.push('  <bpmndi:BPMNDiagram id="BPMNDiagram_1">')
  lines.push('    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="' + processId + '">')

  for (const node of graph.nodes) {
    const bounds = `x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}"`
    lines.push(`      <bpmndi:BPMNShape id="Shape_${node.id}" bpmnElement="${node.id}">`)
    lines.push(`        <dc:Bounds ${bounds} />`)
    lines.push(`      </bpmndi:BPMNShape>`)
  }

  for (const edge of graph.edges) {
    lines.push(`      <bpmndi:BPMNEdge id="Edge_${edge.id}" bpmnElement="${edge.id}">`)
    lines.push(`      </bpmndi:BPMNEdge>`)
  }

  lines.push('    </bpmndi:BPMNPlane>')
  lines.push('  </bpmndi:BPMNDiagram>')
  lines.push('</bpmn:definitions>')

  return lines.join('\n')
}
