// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { importFromBpmnXml } from '../BpmnXmlImporter.js'
import { BpmnElementType } from '../../types/bpmn.js'

const MINIMAL_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" name="Test" isExecutable="true">
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`

describe('importFromBpmnXml', () => {
  it('parses a minimal BPMN with no elements', () => {
    const graph = importFromBpmnXml(MINIMAL_BPMN)
    expect(graph.nodes).toEqual([])
    expect(graph.edges).toEqual([])
  })

  it('throws on invalid XML', () => {
    expect(() => importFromBpmnXml('<invalid')).toThrow('Invalid XML')
  })

  it('throws when no bpmn:process is found', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
</bpmn:definitions>`
    expect(() => importFromBpmnXml(xml)).toThrow('No bpmn:process found')
  })

  it('parses a startEvent', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="start1" name="Begin" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="Shape_start1" bpmnElement="start1">
        <dc:Bounds x="100" y="200" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`
    const graph = importFromBpmnXml(xml)
    expect(graph.nodes).toHaveLength(1)
    expect(graph.nodes[0].id).toBe('start1')
    expect(graph.nodes[0].data.bpmnType).toBe(BpmnElementType.StartEvent)
    expect(graph.nodes[0].data.label).toBe('Begin')
    expect(graph.nodes[0].x).toBe(100)
    expect(graph.nodes[0].y).toBe(200)
    expect(graph.nodes[0].width).toBe(36)
    expect(graph.nodes[0].height).toBe(36)
  })

  it('parses userTask', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:userTask id="task1" name="Review" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="Shape_task1" bpmnElement="task1">
        <dc:Bounds x="200" y="100" width="160" height="80" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`
    const graph = importFromBpmnXml(xml)
    expect(graph.nodes).toHaveLength(1)
    expect(graph.nodes[0].data.bpmnType).toBe(BpmnElementType.UserTask)
    expect(graph.nodes[0].data.label).toBe('Review')
  })

  it('parses timerEvent with timeDuration', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:intermediateCatchEvent id="timer1" name="Wait">
      <bpmn:timerEventDefinition id="TimerDef_timer1">
        <bpmn:timeDuration xsi:type="bpmn:tFormalExpression">PT5M</bpmn:timeDuration>
      </bpmn:timerEventDefinition>
    </bpmn:intermediateCatchEvent>
  </bpmn:process>
</bpmn:definitions>`
    const graph = importFromBpmnXml(xml)
    expect(graph.nodes).toHaveLength(1)
    expect(graph.nodes[0].data.bpmnType).toBe(BpmnElementType.TimerEvent)
    expect(graph.nodes[0].data.label).toBe('Wait')
    expect(graph.nodes[0].data.timerType).toBe('duration')
    expect(graph.nodes[0].data.timerValue).toBe('PT5M')
  })

  it('parses timerEvent with timeDate', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:intermediateCatchEvent id="timer1" name="Deadline">
      <bpmn:timerEventDefinition id="TimerDef_timer1">
        <bpmn:timeDate>2026-06-01T00:00:00Z</bpmn:timeDate>
      </bpmn:timerEventDefinition>
    </bpmn:intermediateCatchEvent>
  </bpmn:process>
</bpmn:definitions>`
    const graph = importFromBpmnXml(xml)
    expect(graph.nodes[0].data.timerType).toBe('date')
    expect(graph.nodes[0].data.timerValue).toBe('2026-06-01T00:00:00Z')
  })

  it('parses timerEvent with timeCycle', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:intermediateCatchEvent id="timer1" name="Repeat">
      <bpmn:timerEventDefinition id="TimerDef_timer1">
        <bpmn:timeCycle>R3/PT1H</bpmn:timeCycle>
      </bpmn:timerEventDefinition>
    </bpmn:intermediateCatchEvent>
  </bpmn:process>
</bpmn:definitions>`
    const graph = importFromBpmnXml(xml)
    expect(graph.nodes[0].data.timerType).toBe('cycle')
    expect(graph.nodes[0].data.timerValue).toBe('R3/PT1H')
  })

  it('parses sequenceFlow', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="start1" />
    <bpmn:endEvent id="end1" />
    <bpmn:sequenceFlow id="flow1" sourceRef="start1" targetRef="end1" />
  </bpmn:process>
</bpmn:definitions>`
    const graph = importFromBpmnXml(xml)
    expect(graph.edges).toHaveLength(1)
    expect(graph.edges[0].id).toBe('flow1')
    expect(graph.edges[0].source.cell).toBe('start1')
    expect(graph.edges[0].target.cell).toBe('end1')
  })

  it('parses sequenceFlow with conditionExpression', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:exclusiveGateway id="gw1" />
    <bpmn:endEvent id="end1" />
    <bpmn:sequenceFlow id="flow1" sourceRef="gw1" targetRef="end1">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">\${approved}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
  </bpmn:process>
</bpmn:definitions>`
    const graph = importFromBpmnXml(xml)
    expect(graph.edges).toHaveLength(1)
    expect(graph.edges[0].data.conditionExpression).toBe('${approved}')
  })

  it('parses sequenceFlow with name as label', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:sequenceFlow id="flow1" name="Yes" sourceRef="a" targetRef="b" />
  </bpmn:process>
</bpmn:definitions>`
    const graph = importFromBpmnXml(xml)
    expect(graph.edges[0].data.label).toBe('Yes')
  })

  it('skips unknown element types', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="start1" />
    <bpmn:callActivity id="call1" name="External" />
    <bpmn:endEvent id="end1" />
  </bpmn:process>
</bpmn:definitions>`
    const graph = importFromBpmnXml(xml)
    expect(graph.nodes).toHaveLength(2)
    expect(graph.nodes.map((n) => n.id)).toEqual(['start1', 'end1'])
  })

  it('uses default size when DI shape is missing', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:userTask id="task1" name="Task" />
  </bpmn:process>
</bpmn:definitions>`
    const graph = importFromBpmnXml(xml)
    expect(graph.nodes[0].x).toBe(0)
    expect(graph.nodes[0].y).toBe(0)
    expect(graph.nodes[0].width).toBe(160)
    expect(graph.nodes[0].height).toBe(80)
  })

  it('parses all 12 supported BPMN element types', () => {
    const elements = [
      { tag: 'bpmn:startEvent', type: BpmnElementType.StartEvent },
      { tag: 'bpmn:endEvent', type: BpmnElementType.EndEvent },
      { tag: 'bpmn:userTask', type: BpmnElementType.UserTask },
      { tag: 'bpmn:serviceTask', type: BpmnElementType.ServiceTask },
      { tag: 'bpmn:scriptTask', type: BpmnElementType.ScriptTask },
      { tag: 'bpmn:sendTask', type: BpmnElementType.SendTask },
      { tag: 'bpmn:receiveTask', type: BpmnElementType.ReceiveTask },
      { tag: 'bpmn:exclusiveGateway', type: BpmnElementType.ExclusiveGateway },
      { tag: 'bpmn:parallelGateway', type: BpmnElementType.ParallelGateway },
      { tag: 'bpmn:inclusiveGateway', type: BpmnElementType.InclusiveGateway },
      { tag: 'bpmn:intermediateCatchEvent', type: BpmnElementType.TimerEvent },
      { tag: 'bpmn:subProcess', type: BpmnElementType.SubProcess },
    ]

    const xmlElements = elements
      .map((el, i) => `    <${el.tag} id="n${i}" name="Node${i}" />`)
      .join('\n')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
${xmlElements}
  </bpmn:process>
</bpmn:definitions>`

    const graph = importFromBpmnXml(xml)
    expect(graph.nodes).toHaveLength(12)
    for (let i = 0; i < 12; i++) {
      expect(graph.nodes[i].data.bpmnType).toBe(elements[i].type)
    }
  })
})
