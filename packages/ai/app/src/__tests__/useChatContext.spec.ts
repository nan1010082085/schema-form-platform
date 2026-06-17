/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { useChatContext } from '@/composables/useChatContext'
import type { Widget, FlowGraph, SelectedWidgetInfo, ChatSettings } from '@/types'

// ---- Test fixtures ----

const mockWidget: SelectedWidgetInfo = { id: 'w1', type: 'input', field: 'name', label: 'Name' }

const mockSchema: Widget[] = [
  { id: '1', type: 'grid', children: [{ id: '2', type: 'input', field: 'email', label: 'Email' }] },
]

const mockFlow: FlowGraph = {
  nodes: [
    { id: 'n1', data: { bpmnType: 'startEvent', label: 'Start' }, position: { x: 0, y: 0 } },
    { id: 'n2', data: { bpmnType: 'userTask', label: 'Review' }, position: { x: 200, y: 0 } },
  ],
  edges: [
    { id: 'e1', source: { cell: 'n1' }, target: { cell: 'n2' } },
  ],
}

const defaultChatSettings: ChatSettings = {
  preferences: {
    replyLanguage: 'zh-CN',
    replyStyle: 'detailed',
    codeComment: 'yes',
  },
  historySummary: { mode: 'auto' },
}

// ---- Tests ----

describe('useChatContext', () => {
  // ================================================================
  // 1. Initialization
  // ================================================================
  describe('initialization', () => {
    it('defaults to standalone source', () => {
      const { context } = useChatContext()
      expect(context.value.source).toBe('standalone')
      expect(context.value.schemaId).toBeUndefined()
      expect(context.value.flowId).toBeUndefined()
      expect(context.value.nodeId).toBeUndefined()
      expect(context.value.version).toBeUndefined()
      expect(context.value.selectedWidget).toBeUndefined()
      expect(context.value.editorMode).toBeUndefined()
      expect(context.value.currentSchema).toBeUndefined()
      expect(context.value.currentFlow).toBeUndefined()
      expect(context.value.preferences).toBeUndefined()
      expect(context.value.historySummary).toBeUndefined()
    })

    it('accepts initial options for all fields', () => {
      const { context } = useChatContext({
        initial: {
          source: 'editor',
          schemaId: 's1',
          flowId: 'f1',
          nodeId: 'n1',
          version: 'v2',
          selectedWidget: mockWidget,
          editorMode: 'edit',
          currentSchema: mockSchema,
          currentFlow: mockFlow,
          preferences: { layoutStyle: 'grid' },
          historySummary: 'previous summary',
        },
      })
      expect(context.value.source).toBe('editor')
      expect(context.value.schemaId).toBe('s1')
      expect(context.value.flowId).toBe('f1')
      expect(context.value.nodeId).toBe('n1')
      expect(context.value.version).toBe('v2')
      expect(context.value.selectedWidget).toEqual(mockWidget)
      expect(context.value.editorMode).toBe('edit')
      expect(context.value.currentSchema).toEqual(mockSchema)
      expect(context.value.currentFlow).toEqual(mockFlow)
      expect(context.value.preferences).toEqual({ layoutStyle: 'grid' })
      expect(context.value.historySummary).toBe('previous summary')
    })

    it('accepts partial initial options', () => {
      const { context } = useChatContext({
        initial: { source: 'flow', flowId: 'f1' },
      })
      expect(context.value.source).toBe('flow')
      expect(context.value.flowId).toBe('f1')
      expect(context.value.schemaId).toBeUndefined()
    })
  })

  // ================================================================
  // 2. Field-level setters
  // ================================================================
  describe('field-level updates', () => {
    describe('setSource', () => {
      it('updates source to editor', () => {
        const { context, setSource } = useChatContext()
        setSource('editor')
        expect(context.value.source).toBe('editor')
      })

      it('updates source to flow', () => {
        const { context, setSource } = useChatContext()
        setSource('flow')
        expect(context.value.source).toBe('flow')
      })

      it('updates source to page', () => {
        const { context, setSource } = useChatContext()
        setSource('page')
        expect(context.value.source).toBe('page')
      })

      it('updates source to standalone', () => {
        const { context, setSource } = useChatContext({ initial: { source: 'editor' } })
        setSource('standalone')
        expect(context.value.source).toBe('standalone')
      })
    })

    describe('setSchemaId', () => {
      it('updates schemaId', () => {
        const { context, setSchemaId } = useChatContext()
        setSchemaId('schema-123')
        expect(context.value.schemaId).toBe('schema-123')
      })

      it('clears schemaId with undefined', () => {
        const { context, setSchemaId } = useChatContext({ initial: { schemaId: 's1' } })
        setSchemaId(undefined)
        expect(context.value.schemaId).toBeUndefined()
      })
    })

    describe('setFlowId', () => {
      it('updates flowId', () => {
        const { context, setFlowId } = useChatContext()
        setFlowId('flow-456')
        expect(context.value.flowId).toBe('flow-456')
      })

      it('clears flowId with undefined', () => {
        const { context, setFlowId } = useChatContext({ initial: { flowId: 'f1' } })
        setFlowId(undefined)
        expect(context.value.flowId).toBeUndefined()
      })
    })

    describe('setNodeId', () => {
      it('updates nodeId', () => {
        const { context, setNodeId } = useChatContext()
        setNodeId('node-789')
        expect(context.value.nodeId).toBe('node-789')
      })

      it('clears nodeId with undefined', () => {
        const { context, setNodeId } = useChatContext({ initial: { nodeId: 'n1' } })
        setNodeId(undefined)
        expect(context.value.nodeId).toBeUndefined()
      })
    })

    describe('setVersion', () => {
      it('updates version', () => {
        const { context, setVersion } = useChatContext()
        setVersion('v2')
        expect(context.value.version).toBe('v2')
      })

      it('clears version with undefined', () => {
        const { context, setVersion } = useChatContext({ initial: { version: 'v1' } })
        setVersion(undefined)
        expect(context.value.version).toBeUndefined()
      })
    })

    describe('setSelectedWidget', () => {
      it('updates selectedWidget', () => {
        const { context, setSelectedWidget } = useChatContext()
        setSelectedWidget(mockWidget)
        expect(context.value.selectedWidget).toEqual(mockWidget)
      })

      it('clears selectedWidget with null', () => {
        const { context, setSelectedWidget } = useChatContext()
        setSelectedWidget(mockWidget)
        setSelectedWidget(null)
        expect(context.value.selectedWidget).toBeUndefined()
      })

      it('handles minimal SelectedWidgetInfo', () => {
        const { context, setSelectedWidget } = useChatContext()
        const minimal = { id: 'w2', type: 'button' }
        setSelectedWidget(minimal)
        expect(context.value.selectedWidget).toEqual(minimal)
      })
    })

    describe('setEditorMode', () => {
      it('updates to edit mode', () => {
        const { context, setEditorMode } = useChatContext()
        setEditorMode('edit')
        expect(context.value.editorMode).toBe('edit')
      })

      it('updates to preview mode', () => {
        const { context, setEditorMode } = useChatContext()
        setEditorMode('preview')
        expect(context.value.editorMode).toBe('preview')
      })

      it('clears editorMode with undefined', () => {
        const { context, setEditorMode } = useChatContext()
        setEditorMode('edit')
        setEditorMode(undefined)
        expect(context.value.editorMode).toBeUndefined()
      })
    })

    describe('setCurrentSchema', () => {
      it('updates currentSchema', () => {
        const { context, setCurrentSchema } = useChatContext()
        setCurrentSchema(mockSchema)
        expect(context.value.currentSchema).toEqual(mockSchema)
      })

      it('clears currentSchema with null', () => {
        const { context, setCurrentSchema } = useChatContext()
        setCurrentSchema(mockSchema)
        setCurrentSchema(null)
        expect(context.value.currentSchema).toBeUndefined()
      })
    })

    describe('setCurrentFlow', () => {
      it('updates currentFlow', () => {
        const { context, setCurrentFlow } = useChatContext()
        setCurrentFlow(mockFlow)
        expect(context.value.currentFlow).toEqual(mockFlow)
      })

      it('clears currentFlow with null', () => {
        const { context, setCurrentFlow } = useChatContext()
        setCurrentFlow(mockFlow)
        setCurrentFlow(null)
        expect(context.value.currentFlow).toBeUndefined()
      })
    })

    describe('setPreferences', () => {
      it('updates preferences', () => {
        const { context, setPreferences } = useChatContext()
        setPreferences({ layoutStyle: 'grid' })
        expect(context.value.preferences).toEqual({ layoutStyle: 'grid' })
      })

      it('clears preferences with undefined', () => {
        const { context, setPreferences } = useChatContext()
        setPreferences({ layoutStyle: 'grid' })
        setPreferences(undefined)
        expect(context.value.preferences).toBeUndefined()
      })

      it('handles complex preferences object', () => {
        const { context, setPreferences } = useChatContext()
        const prefs = { layout: 'flex', columns: 3, spacing: 'md' }
        setPreferences(prefs)
        expect(context.value.preferences).toEqual(prefs)
      })
    })

    describe('setHistorySummary', () => {
      it('updates historySummary', () => {
        const { context, setHistorySummary } = useChatContext()
        setHistorySummary('summary text')
        expect(context.value.historySummary).toBe('summary text')
      })

      it('clears historySummary with undefined', () => {
        const { context, setHistorySummary } = useChatContext()
        setHistorySummary('summary')
        setHistorySummary(undefined)
        expect(context.value.historySummary).toBeUndefined()
      })
    })
  })

  // ================================================================
  // 3. mergeContext
  // ================================================================
  describe('mergeContext', () => {
    it('merges multiple fields at once', () => {
      const { context, mergeContext } = useChatContext()
      mergeContext({
        source: 'editor',
        schemaId: 's1',
        selectedWidget: mockWidget,
        editorMode: 'edit',
      })
      expect(context.value.source).toBe('editor')
      expect(context.value.schemaId).toBe('s1')
      expect(context.value.selectedWidget).toEqual(mockWidget)
      expect(context.value.editorMode).toBe('edit')
    })

    it('preserves existing fields not in partial', () => {
      const { context, mergeContext } = useChatContext({
        initial: { source: 'editor', schemaId: 's1', version: 'v1' },
      })
      mergeContext({ flowId: 'f1' })
      expect(context.value.source).toBe('editor')
      expect(context.value.schemaId).toBe('s1')
      expect(context.value.version).toBe('v1')
      expect(context.value.flowId).toBe('f1')
    })

    it('overwrites only specified fields', () => {
      const { context, mergeContext } = useChatContext({
        initial: { source: 'editor', schemaId: 's1', version: 'v1' },
      })
      mergeContext({ schemaId: 's2' })
      expect(context.value.source).toBe('editor')
      expect(context.value.schemaId).toBe('s2')
      expect(context.value.version).toBe('v1')
    })

    it('handles empty partial', () => {
      const { context, mergeContext } = useChatContext({
        initial: { source: 'editor', schemaId: 's1' },
      })
      mergeContext({})
      expect(context.value.source).toBe('editor')
      expect(context.value.schemaId).toBe('s1')
    })

    it('can set all fields at once', () => {
      const { context, mergeContext } = useChatContext()
      mergeContext({
        source: 'flow',
        schemaId: 's1',
        flowId: 'f1',
        nodeId: 'n1',
        version: 'v2',
        selectedWidget: mockWidget,
        editorMode: 'preview',
        currentSchema: mockSchema,
        currentFlow: mockFlow,
        preferences: { theme: 'dark' },
        historySummary: 'summary',
      })
      expect(context.value.source).toBe('flow')
      expect(context.value.schemaId).toBe('s1')
      expect(context.value.flowId).toBe('f1')
      expect(context.value.nodeId).toBe('n1')
      expect(context.value.version).toBe('v2')
      expect(context.value.selectedWidget).toEqual(mockWidget)
      expect(context.value.editorMode).toBe('preview')
      expect(context.value.currentSchema).toEqual(mockSchema)
      expect(context.value.currentFlow).toEqual(mockFlow)
      expect(context.value.preferences).toEqual({ theme: 'dark' })
      expect(context.value.historySummary).toBe('summary')
    })
  })

  // ================================================================
  // 4. buildRequestContext
  // ================================================================
  describe('buildRequestContext', () => {
    it('returns base context without chatSettings', () => {
      const { buildRequestContext, mergeContext } = useChatContext()
      mergeContext({ source: 'editor', schemaId: 's1' })
      const result = buildRequestContext()
      expect(result.source).toBe('editor')
      expect(result.schemaId).toBe('s1')
    })

    it('returns a copy, not a reference to internal context', () => {
      const { context, buildRequestContext, setSchemaId } = useChatContext()
      setSchemaId('s1')
      const result = buildRequestContext()
      result.schemaId = 'mutated'
      expect(context.value.schemaId).toBe('s1')
    })

    it('does not mutate internal context', () => {
      const { context, buildRequestContext, setPreferences } = useChatContext({ initial: { source: 'editor' } })
      setPreferences({ layout: 'grid' })
      const _result = buildRequestContext(defaultChatSettings)
      // internal preferences should still be the original
      expect(context.value.preferences).toEqual({ layout: 'grid' })
    })

    describe('preferences merging', () => {
      it('merges chatSettings preferences into context preferences', () => {
        const { buildRequestContext, setPreferences } = useChatContext({ initial: { source: 'editor' } })
        setPreferences({ layoutStyle: 'grid' })

        const result = buildRequestContext({
          preferences: {
            replyLanguage: 'en-US',
            replyStyle: 'concise',
            codeComment: 'no',
          },
          historySummary: { mode: 'auto' },
        })

        expect(result.preferences).toEqual({
          layoutStyle: 'grid',
          replyLanguage: 'en-US',
          replyStyle: 'concise',
          codeComment: 'no',
        })
      })

      it('works without existing context preferences', () => {
        const { buildRequestContext } = useChatContext({ initial: { source: 'editor' } })

        const result = buildRequestContext({
          preferences: {
            replyLanguage: 'zh-CN',
            replyStyle: 'detailed',
            codeComment: 'yes',
          },
          historySummary: { mode: 'auto' },
        })

        expect(result.preferences).toEqual({
          replyLanguage: 'zh-CN',
          replyStyle: 'detailed',
          codeComment: 'yes',
        })
      })

      it('chatSettings preferences override same-key context preferences', () => {
        const { buildRequestContext, setPreferences } = useChatContext({ initial: { source: 'editor' } })
        setPreferences({ replyLanguage: 'zh-CN', layoutStyle: 'grid' })

        const result = buildRequestContext({
          preferences: {
            replyLanguage: 'en-US',
            replyStyle: 'concise',
            codeComment: 'no',
          },
          historySummary: { mode: 'auto' },
        })

        expect(result.preferences!.replyLanguage).toBe('en-US')
        expect(result.preferences!.layoutStyle).toBe('grid')
      })
    })

    describe('historySummary handling', () => {
      it('uses manual historySummary from chatSettings when mode is manual', () => {
        const { buildRequestContext, setHistorySummary } = useChatContext({ initial: { source: 'editor' } })
        setHistorySummary('original summary')

        const result = buildRequestContext({
          preferences: { replyLanguage: 'zh-CN', replyStyle: 'detailed', codeComment: 'yes' },
          historySummary: { mode: 'manual', manualSummary: 'manual override' },
        })

        expect(result.historySummary).toBe('manual override')
      })

      it('keeps context historySummary when chatSettings mode is auto', () => {
        const { buildRequestContext, setHistorySummary } = useChatContext({ initial: { source: 'editor' } })
        setHistorySummary('original summary')

        const result = buildRequestContext({
          preferences: { replyLanguage: 'zh-CN', replyStyle: 'detailed', codeComment: 'yes' },
          historySummary: { mode: 'auto' },
        })

        expect(result.historySummary).toBe('original summary')
      })

      it('sets historySummary to undefined when manual mode has no manualSummary', () => {
        const { buildRequestContext } = useChatContext({ initial: { source: 'editor' } })

        const result = buildRequestContext({
          preferences: { replyLanguage: 'zh-CN', replyStyle: 'detailed', codeComment: 'yes' },
          historySummary: { mode: 'manual' },
        })

        expect(result.historySummary).toBeUndefined()
      })

      it('overwrites context historySummary with undefined when manual mode has no manualSummary', () => {
        const { buildRequestContext, setHistorySummary } = useChatContext({ initial: { source: 'editor' } })
        setHistorySummary('original')

        const result = buildRequestContext({
          preferences: { replyLanguage: 'zh-CN', replyStyle: 'detailed', codeComment: 'yes' },
          historySummary: { mode: 'manual' },
        })

        expect(result.historySummary).toBeUndefined()
      })
    })

    describe('selectedWidget and editorMode in request context', () => {
      it('includes selectedWidget', () => {
        const { buildRequestContext, setSelectedWidget } = useChatContext()
        setSelectedWidget(mockWidget)
        const result = buildRequestContext()
        expect(result.selectedWidget).toEqual(mockWidget)
      })

      it('includes editorMode', () => {
        const { buildRequestContext, setEditorMode } = useChatContext()
        setEditorMode('edit')
        const result = buildRequestContext()
        expect(result.editorMode).toBe('edit')
      })

      it('includes both selectedWidget and editorMode', () => {
        const { buildRequestContext, mergeContext } = useChatContext()
        mergeContext({
          source: 'editor',
          selectedWidget: mockWidget,
          editorMode: 'preview',
        })
        const result = buildRequestContext()
        expect(result.selectedWidget).toEqual(mockWidget)
        expect(result.editorMode).toBe('preview')
      })
    })

    describe('full integration', () => {
      it('builds complete context with all fields and chatSettings', () => {
        const { buildRequestContext, mergeContext } = useChatContext()
        mergeContext({
          source: 'editor',
          schemaId: 's1',
          flowId: 'f1',
          nodeId: 'n1',
          version: 'v2',
          selectedWidget: mockWidget,
          editorMode: 'edit',
          preferences: { layout: 'grid', custom: 'value' },
          historySummary: 'auto-generated summary',
        })

        const result = buildRequestContext({
          preferences: {
            replyLanguage: 'en-US',
            replyStyle: 'concise',
            codeComment: 'no',
          },
          historySummary: { mode: 'manual', manualSummary: 'manual summary' },
        })

        expect(result.source).toBe('editor')
        expect(result.schemaId).toBe('s1')
        expect(result.flowId).toBe('f1')
        expect(result.nodeId).toBe('n1')
        expect(result.version).toBe('v2')
        expect(result.selectedWidget).toEqual(mockWidget)
        expect(result.editorMode).toBe('edit')
        expect(result.preferences).toEqual({
          layout: 'grid',
          custom: 'value',
          replyLanguage: 'en-US',
          replyStyle: 'concise',
          codeComment: 'no',
        })
        expect(result.historySummary).toBe('manual summary')
      })
    })
  })

  // ================================================================
  // 5. reset
  // ================================================================
  describe('reset', () => {
    it('clears all context fields back to defaults', () => {
      const { context, mergeContext, reset } = useChatContext()
      mergeContext({
        source: 'editor',
        schemaId: 's1',
        flowId: 'f1',
        nodeId: 'n1',
        version: 'v1',
        selectedWidget: mockWidget,
        editorMode: 'preview',
        currentSchema: mockSchema,
        currentFlow: mockFlow,
        preferences: { theme: 'dark' },
        historySummary: 'summary',
      })

      reset()

      expect(context.value.source).toBe('standalone')
      expect(context.value.schemaId).toBeUndefined()
      expect(context.value.flowId).toBeUndefined()
      expect(context.value.nodeId).toBeUndefined()
      expect(context.value.version).toBeUndefined()
      expect(context.value.selectedWidget).toBeUndefined()
      expect(context.value.editorMode).toBeUndefined()
      expect(context.value.currentSchema).toBeUndefined()
      expect(context.value.currentFlow).toBeUndefined()
      expect(context.value.preferences).toBeUndefined()
      expect(context.value.historySummary).toBeUndefined()
    })

    it('can set fields again after reset', () => {
      const { context, mergeContext, reset, setSource } = useChatContext()
      mergeContext({ source: 'editor', schemaId: 's1' })
      reset()
      setSource('flow')
      expect(context.value.source).toBe('flow')
    })
  })

  // ================================================================
  // 6. Instance independence
  // ================================================================
  describe('instance independence', () => {
    it('multiple instances maintain independent state', () => {
      const ctx1 = useChatContext()
      const ctx2 = useChatContext()

      ctx1.setSource('editor')
      ctx2.setSource('flow')

      expect(ctx1.context.value.source).toBe('editor')
      expect(ctx2.context.value.source).toBe('flow')
    })

    it('resetting one instance does not affect another', () => {
      const ctx1 = useChatContext({ initial: { source: 'editor', schemaId: 's1' } })
      const ctx2 = useChatContext({ initial: { source: 'flow', flowId: 'f1' } })

      ctx1.reset()

      expect(ctx1.context.value.source).toBe('standalone')
      expect(ctx1.context.value.schemaId).toBeUndefined()
      expect(ctx2.context.value.source).toBe('flow')
      expect(ctx2.context.value.flowId).toBe('f1')
    })
  })

  // ================================================================
  // 7. Reactivity
  // ================================================================
  describe('reactivity', () => {
    it('context ref updates reactively when setter is called', () => {
      const { context, setSchemaId } = useChatContext()
      expect(context.value.schemaId).toBeUndefined()
      setSchemaId('s1')
      expect(context.value.schemaId).toBe('s1')
      setSchemaId('s2')
      expect(context.value.schemaId).toBe('s2')
    })

    it('mergeContext triggers single reactive update', () => {
      const { context, mergeContext } = useChatContext()
      mergeContext({ source: 'editor', schemaId: 's1', flowId: 'f1' })
      // All fields should be set in the same tick
      expect(context.value.source).toBe('editor')
      expect(context.value.schemaId).toBe('s1')
      expect(context.value.flowId).toBe('f1')
    })
  })
})
