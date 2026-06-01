import type { FlowGraph, FlowNodeData, FlowEdgeData } from '../types/graph.js'
import { BpmnElementType } from '../types/bpmn.js'
import type { TimerType } from '../types/bpmn.js'
import { DEFAULT_NODE_SIZES } from './constants.js'

const TAG_TO_BPMN_TYPE: Record<string, BpmnElementType> = {
  'bpmn:startevent': BpmnElementType.StartEvent,
  'bpmn:endevent': BpmnElementType.EndEvent,
  'bpmn:usertask': BpmnElementType.UserTask,
  'bpmn:servicetask': BpmnElementType.ServiceTask,
  'bpmn:scripttask': BpmnElementType.ScriptTask,
  'bpmn:sendtask': BpmnElementType.SendTask,
  'bpmn:receivetask': BpmnElementType.ReceiveTask,
  'bpmn:exclusivegateway': BpmnElementType.ExclusiveGateway,
  'bpmn:parallelgateway': BpmnElementType.ParallelGateway,
  'bpmn:inclusivegateway': BpmnElementType.InclusiveGateway,
  'bpmn:intermediatecatchevent': BpmnElementType.TimerEvent,
  'bpmn:subprocess': BpmnElementType.SubProcess,
}

function parseNodeConfig(element: Element): Record<string, unknown> {
  const extElements = element.querySelector('bpmn\\:extensionElements, extensionElements')
  if (!extElements) return {}

  const configEl = extElements.querySelector('sf\\:nodeConfig, nodeConfig')
  if (!configEl?.textContent) return {}

  try {
    return JSON.parse(configEl.textContent)
  } catch {
    return {}
  }
}

function parseTimerConfig(element: Element): { timerType?: TimerType; timerValue?: string } {
  const timerDef = element.querySelector('bpmn\\:timerEventDefinition, timerEventDefinition')
  if (!timerDef) return {}

  const duration = timerDef.querySelector('bpmn\\:timeDuration, timeDuration')
  if (duration?.textContent) return { timerType: 'duration', timerValue: duration.textContent }

  const date = timerDef.querySelector('bpmn\\:timeDate, timeDate')
  if (date?.textContent) return { timerType: 'date', timerValue: date.textContent }

  const cycle = timerDef.querySelector('bpmn\\:timeCycle, timeCycle')
  if (cycle?.textContent) return { timerType: 'cycle', timerValue: cycle.textContent }

  return {}
}

export function importFromBpmnXml(xml: string): FlowGraph {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'text/xml')

  const errors = doc.getElementsByTagName('parsererror')
  if (errors.length > 0) {
    throw new Error('Invalid XML: ' + (errors[0].textContent ?? 'parse error'))
  }

  const process = doc.querySelector('bpmn\\:process, process')
  if (!process) throw new Error('No bpmn:process found')

  const nodes: FlowNodeData[] = []
  const edges: FlowEdgeData[] = []

  // Parse shapes from DI for positions
  const shapeMap = new Map<string, { x: number; y: number; width: number; height: number }>()
  const shapes = doc.querySelectorAll('bpmndi\\:BPMNShape, BPMNShape')
  for (const shape of shapes) {
    const bpmnElement = shape.getAttribute('bpmnElement')
    const bounds = shape.querySelector('dc\\:Bounds, Bounds')
    if (bpmnElement && bounds) {
      shapeMap.set(bpmnElement, {
        x: parseFloat(bounds.getAttribute('x') ?? '0'),
        y: parseFloat(bounds.getAttribute('y') ?? '0'),
        width: parseFloat(bounds.getAttribute('width') ?? '100'),
        height: parseFloat(bounds.getAttribute('height') ?? '80'),
      })
    }
  }

  // Parse elements
  for (const child of Array.from(process.children)) {
    const tagName = child.tagName.toLowerCase()
    const bpmnType = TAG_TO_BPMN_TYPE[tagName]
    if (!bpmnType) continue

    const id = child.getAttribute('id') ?? `node-${Date.now()}`
    const name = child.getAttribute('name') ?? ''
    const pos = shapeMap.get(id)
    const defaultSize = DEFAULT_NODE_SIZES[bpmnType]

    const timerConfig = bpmnType === BpmnElementType.TimerEvent
      ? parseTimerConfig(child as Element)
      : {}

    const extensionConfig = parseNodeConfig(child as Element)

    const nodeData: FlowNodeData = {
      id,
      shape: `bpmn-${bpmnType}`,
      x: pos?.x ?? 0,
      y: pos?.y ?? 0,
      width: pos?.width || defaultSize.width,
      height: pos?.height || defaultSize.height,
      data: {
        bpmnType,
        label: name,
        ...extensionConfig,
        ...timerConfig,
      },
    }

    nodes.push(nodeData)
  }

  // Parse sequence flows
  const flows = process.querySelectorAll('bpmn\\:sequenceFlow, sequenceFlow')
  for (const flow of flows) {
    const id = flow.getAttribute('id') ?? `edge-${Date.now()}`
    const source = flow.getAttribute('sourceRef') ?? ''
    const target = flow.getAttribute('targetRef') ?? ''

    const condition = flow.querySelector('bpmn\\:conditionExpression, conditionExpression')

    const edgeData: FlowEdgeData = {
      id,
      shape: 'smoothstep',
      source: { cell: source },
      target: { cell: target },
      data: {
        label: flow.getAttribute('name') ?? undefined,
        conditionExpression: condition?.textContent ?? undefined,
      },
    }

    edges.push(edgeData)
  }

  return { nodes, edges }
}
