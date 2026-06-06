/**
 * MCP Server tests — verifies tool registration and basic invocation via in-memory transport.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createSchemaServer } from '../mcp/schemaServer.js'
import { createFlowServer } from '../mcp/flowServer.js'
import { createWidgetServer } from '../mcp/widgetServer.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

// ── Helpers ──

async function setupClientServer(serverFactory: () => McpServer) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const server = serverFactory()
  const client = new Client({ name: 'test-client', version: '1.0.0' })

  await server.connect(serverTransport)
  await client.connect(clientTransport)

  return { client, server, clientTransport, serverTransport }
}

async function cleanup(opts: {
  client: Client
  server: McpServer
  clientTransport: InMemoryTransport
  serverTransport: InMemoryTransport
}) {
  await opts.client.close()
  await opts.server.close()
}

// ── Schema MCP Server ──

describe('Schema MCP Server', () => {
  let client: Client
  let server: McpServer
  let clientTransport: InMemoryTransport
  let serverTransport: InMemoryTransport

  beforeEach(async () => {
    ;({ client, server, clientTransport, serverTransport } = await setupClientServer(createSchemaServer))
  })

  afterEach(async () => {
    await cleanup({ client, server, clientTransport, serverTransport })
  })

  it('should register all schema tools', async () => {
    const { tools } = await client.listTools()
    const names = tools.map((t) => t.name).sort()

    expect(names).toEqual([
      'get_schema_detail',
      'search_published_schemas',
      'search_schemas',
      'validate_schema',
    ])
  })

  it('search_schemas tool should have correct parameters', async () => {
    const { tools } = await client.listTools()
    const tool = tools.find((t) => t.name === 'search_schemas')
    expect(tool).toBeDefined()
    expect(tool!.inputSchema.required).toContain('keyword')
    expect(tool!.inputSchema.properties).toHaveProperty('keyword')
    expect(tool!.inputSchema.properties).toHaveProperty('type')
    expect(tool!.inputSchema.properties).toHaveProperty('limit')
  })

  it('validate_schema should pass for valid schema object', async () => {
    const result = await client.callTool({
      name: 'validate_schema',
      arguments: {
        schema: { name: 'Test', type: 'form', json: [] },
      },
    })

    expect(result.content).toHaveLength(1)
    const text = (result.content as Array<{ type: string; text: string }>)[0].text
    const parsed = JSON.parse(text)
    expect(parsed.success).toBe(true)
    expect(parsed.errors).toHaveLength(0)
  })

  it('validate_schema should fail for missing fields', async () => {
    const result = await client.callTool({
      name: 'validate_schema',
      arguments: {
        schema: {},
      },
    })

    const text = (result.content as Array<{ type: string; text: string }>)[0].text
    const parsed = JSON.parse(text)
    expect(parsed.success).toBe(false)
    expect(parsed.errors.length).toBeGreaterThan(0)
  })

  it('validate_schema should reject invalid type', async () => {
    const result = await client.callTool({
      name: 'validate_schema',
      arguments: {
        schema: { name: 'Test', type: 'invalid', json: [] },
      },
    })

    const text = (result.content as Array<{ type: string; text: string }>)[0].text
    const parsed = JSON.parse(text)
    expect(parsed.success).toBe(false)
    expect(parsed.errors.some((e: string) => e.includes('type'))).toBe(true)
  })
})

// ── Flow MCP Server ──

describe('Flow MCP Server', () => {
  let client: Client
  let server: McpServer
  let clientTransport: InMemoryTransport
  let serverTransport: InMemoryTransport

  beforeEach(async () => {
    ;({ client, server, clientTransport, serverTransport } = await setupClientServer(createFlowServer))
  })

  afterEach(async () => {
    await cleanup({ client, server, clientTransport, serverTransport })
  })

  it('should register all flow tools', async () => {
    const { tools } = await client.listTools()
    const names = tools.map((t) => t.name).sort()

    expect(names).toEqual([
      'get_flow_detail',
      'search_flows',
      'validate_flow',
    ])
  })

  it('search_flows tool should have correct parameters', async () => {
    const { tools } = await client.listTools()
    const tool = tools.find((t) => t.name === 'search_flows')
    expect(tool).toBeDefined()
    expect(tool!.inputSchema.properties).toHaveProperty('keyword')
    expect(tool!.inputSchema.properties).toHaveProperty('status')
    expect(tool!.inputSchema.properties).toHaveProperty('category')
    expect(tool!.inputSchema.properties).toHaveProperty('limit')
  })

  it('validate_flow should pass for valid flow', async () => {
    const result = await client.callTool({
      name: 'validate_flow',
      arguments: {
        flow: {
          nodes: [
            { id: 'start', data: { bpmnType: 'startEvent' } },
            { id: 'task', data: { bpmnType: 'userTask', assignee: 'user1' } },
            { id: 'end', data: { bpmnType: 'endEvent' } },
          ],
          edges: [
            { id: 'e1', source: { cell: 'start' }, target: { cell: 'task' } },
            { id: 'e2', source: { cell: 'task' }, target: { cell: 'end' } },
          ],
        },
      },
    })

    const text = (result.content as Array<{ type: string; text: string }>)[0].text
    const parsed = JSON.parse(text)
    expect(parsed.success).toBe(true)
    expect(parsed.data.valid).toBe(true)
    expect(parsed.data.errors).toHaveLength(0)
  })

  it('validate_flow should fail when missing startEvent', async () => {
    const result = await client.callTool({
      name: 'validate_flow',
      arguments: {
        flow: {
          nodes: [
            { id: 'end', data: { bpmnType: 'endEvent' } },
          ],
          edges: [],
        },
      },
    })

    const text = (result.content as Array<{ type: string; text: string }>)[0].text
    const parsed = JSON.parse(text)
    expect(parsed.data.valid).toBe(false)
    expect(parsed.data.errors.some((e: string) => e.includes('startEvent'))).toBe(true)
  })

  it('validate_flow should fail when userTask has no assignee', async () => {
    const result = await client.callTool({
      name: 'validate_flow',
      arguments: {
        flow: {
          nodes: [
            { id: 'start', data: { bpmnType: 'startEvent' } },
            { id: 'task', data: { bpmnType: 'userTask', label: '审批' } },
            { id: 'end', data: { bpmnType: 'endEvent' } },
          ],
          edges: [
            { id: 'e1', source: { cell: 'start' }, target: { cell: 'task' } },
            { id: 'e2', source: { cell: 'task' }, target: { cell: 'end' } },
          ],
        },
      },
    })

    const text = (result.content as Array<{ type: string; text: string }>)[0].text
    const parsed = JSON.parse(text)
    expect(parsed.data.valid).toBe(false)
    expect(parsed.data.errors.some((e: string) => e.includes('指派人'))).toBe(true)
  })
})

// ── Widget MCP Server ──

describe('Widget MCP Server', () => {
  let client: Client
  let server: McpServer
  let clientTransport: InMemoryTransport
  let serverTransport: InMemoryTransport

  beforeEach(async () => {
    ;({ client, server, clientTransport, serverTransport } = await setupClientServer(createWidgetServer))
  })

  afterEach(async () => {
    await cleanup({ client, server, clientTransport, serverTransport })
  })

  it('should register all widget tools', async () => {
    const { tools } = await client.listTools()
    const names = tools.map((t) => t.name).sort()

    expect(names).toEqual([
      'query_widgets',
      'validate_widget_schema',
    ])
  })

  it('query_widgets should return widget catalogue', async () => {
    const result = await client.callTool({
      name: 'query_widgets',
      arguments: {},
    })

    const text = (result.content as Array<{ type: string; text: string }>)[0].text
    const parsed = JSON.parse(text)
    expect(parsed.success).toBe(true)
    expect(parsed.data.total).toBeGreaterThan(0)
    expect(Array.isArray(parsed.data.widgets)).toBe(true)
    // Each widget should have type, group, displayName
    const widget = parsed.data.widgets[0]
    expect(widget).toHaveProperty('type')
    expect(widget).toHaveProperty('group')
    expect(widget).toHaveProperty('displayName')
  })

  it('query_widgets should filter by category', async () => {
    const result = await client.callTool({
      name: 'query_widgets',
      arguments: { category: 'form' },
    })

    const text = (result.content as Array<{ type: string; text: string }>)[0].text
    const parsed = JSON.parse(text)
    expect(parsed.success).toBe(true)
    for (const widget of parsed.data.widgets) {
      expect(widget.group).toBe('form')
    }
  })

  it('validate_widget_schema should pass for valid widgets', async () => {
    const result = await client.callTool({
      name: 'validate_widget_schema',
      arguments: {
        widgets: [
          {
            id: 'layout-1',
            type: 'card',
            position: { x: 0, y: 0, w: 12, h: 100 },
            children: [
              {
                id: 'input-1',
                type: 'input',
                position: { x: 0, y: 0, w: 6, h: 40 },
              },
            ],
          },
        ],
      },
    })

    const text = (result.content as Array<{ type: string; text: string }>)[0].text
    const parsed = JSON.parse(text)
    expect(parsed.data.valid).toBe(true)
    expect(parsed.data.errors).toHaveLength(0)
  })

  it('validate_widget_schema should detect missing type', async () => {
    const result = await client.callTool({
      name: 'validate_widget_schema',
      arguments: {
        widgets: [
          { id: 'bad-1', position: { x: 0, y: 0, w: 10, h: 10 } },
        ],
      },
    })

    const text = (result.content as Array<{ type: string; text: string }>)[0].text
    const parsed = JSON.parse(text)
    expect(parsed.data.valid).toBe(false)
    expect(parsed.data.errors.some((e: { message: string }) => e.message.includes('type'))).toBe(true)
  })

  it('validate_widget_schema should reject top-level non-container widgets', async () => {
    const result = await client.callTool({
      name: 'validate_widget_schema',
      arguments: {
        widgets: [
          { id: 'input-1', type: 'input', position: { x: 0, y: 0, w: 6, h: 40 } },
        ],
      },
    })

    const text = (result.content as Array<{ type: string; text: string }>)[0].text
    const parsed = JSON.parse(text)
    expect(parsed.data.valid).toBe(false)
    expect(parsed.data.errors.some((e: { message: string }) => e.message.includes('嵌套'))).toBe(true)
  })
})
