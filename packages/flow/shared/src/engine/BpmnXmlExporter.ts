import type { FlowGraph } from '../types/graph.js'
import { BpmnElementType } from '../types/bpmn.js'

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
  lines.push('  id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">')

  lines.push(`  <bpmn:process id="${processId}" name="${processName}" isExecutable="true">`)

  for (const node of graph.nodes) {
    const tag = BPMN_TYPE_MAP[node.data.bpmnType]
    if (!tag) continue

    const indent = '    '
    const attrs = `id="${node.id}" name="${escapeXml(node.data.label)}"`

    if (node.data.bpmnType === BpmnElementType.TimerEvent) {
      lines.push(`${indent}<${tag} ${attrs}>`)
      lines.push(`${indent}  <bpmn:timerEventDefinition id="TimerDef_${node.id}">`)
      if (node.data.timerType === 'duration') {
        lines.push(`${indent}    <bpmn:timeDuration xsi:type="bpmn:tFormalExpression">${escapeXml(node.data.timerValue ?? '')}</bpmn:timeDuration>`)
      } else if (node.data.timerType === 'date') {
        lines.push(`${indent}    <bpmn:timeDate xsi:type="bpmn:tFormalExpression">${escapeXml(node.data.timerValue ?? '')}</bpmn:timeDate>`)
      } else if (node.data.timerType === 'cycle') {
        lines.push(`${indent}    <bpmn:timeCycle xsi:type="bpmn:tFormalExpression">${escapeXml(node.data.timerValue ?? '')}</bpmn:timeCycle>`)
      }
      lines.push(`${indent}  </bpmn:timerEventDefinition>`)
      lines.push(`${indent}</${tag}>`)
    } else if (node.data.bpmnType === BpmnElementType.SubProcess) {
      lines.push(`${indent}<${tag} ${attrs}>`)
      lines.push(`${indent}</${tag}>`)
    } else {
      lines.push(`${indent}<${tag} ${attrs} />`)
    }
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
