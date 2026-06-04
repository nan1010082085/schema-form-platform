/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { usePreviewInteraction } from '@/composables/usePreviewInteraction'
import type { Widget, FlowNodeData } from '@/types'

describe('usePreviewInteraction', () => {
  let interaction: ReturnType<typeof usePreviewInteraction>

  beforeEach(() => {
    interaction = usePreviewInteraction()
  })

  const mockWidget: Widget = {
    id: 'w1',
    type: 'input',
    field: 'username',
    label: '用户名',
    props: { placeholder: '请输入用户名', required: true },
  }

  const mockNodeData: FlowNodeData = {
    bpmnType: 'userTask',
    label: '审批任务',
    description: '处理审批请求',
  }

  describe('Field selection', () => {
    it('selects a field', () => {
      interaction.selectField(mockWidget)

      expect(interaction.selectedFieldId.value).toBe('w1')
      expect(interaction.selectedFieldDetail.value).toEqual({
        id: 'w1',
        type: 'input',
        label: '用户名',
        field: 'username',
        props: { placeholder: '请输入用户名', required: true },
      })
    })

    it('clears field selection', () => {
      interaction.selectField(mockWidget)
      interaction.clearFieldSelection()

      expect(interaction.selectedFieldId.value).toBeNull()
      expect(interaction.selectedFieldDetail.value).toBeNull()
    })
  })

  describe('Node selection', () => {
    it('selects a node', () => {
      interaction.selectNode('n1', mockNodeData)

      expect(interaction.selectedNodeId.value).toBe('n1')
      expect(interaction.selectedNodeDetail.value).toEqual({
        id: 'n1',
        data: mockNodeData,
      })
    })

    it('clears node selection', () => {
      interaction.selectNode('n1', mockNodeData)
      interaction.clearNodeSelection()

      expect(interaction.selectedNodeId.value).toBeNull()
      expect(interaction.selectedNodeDetail.value).toBeNull()
    })
  })

  describe('Field highlighting', () => {
    it('sets highlighted fields', () => {
      interaction.setHighlightedFields(['w1', 'w2'])

      expect(interaction.highlightedFieldIds.value.has('w1')).toBe(true)
      expect(interaction.highlightedFieldIds.value.has('w2')).toBe(true)
      expect(interaction.highlightedFieldIds.value.has('w3')).toBe(false)
    })

    it('adds a highlighted field', () => {
      interaction.setHighlightedFields(['w1'])
      interaction.addHighlightedField('w2')

      expect(interaction.highlightedFieldIds.value.has('w1')).toBe(true)
      expect(interaction.highlightedFieldIds.value.has('w2')).toBe(true)
    })

    it('clears highlights', () => {
      interaction.setHighlightedFields(['w1', 'w2'])
      interaction.clearHighlights()

      expect(interaction.highlightedFieldIds.value.size).toBe(0)
    })

    it('checks if field is highlighted', () => {
      interaction.setHighlightedFields(['w1'])

      expect(interaction.isFieldHighlighted.value('w1')).toBe(true)
      expect(interaction.isFieldHighlighted.value('w2')).toBe(false)
    })
  })

  describe('Edit dialog', () => {
    it('opens field edit dialog', () => {
      interaction.openFieldEdit(mockWidget)

      expect(interaction.isEditDialogVisible.value).toBe(true)
      expect(interaction.editContext.value).toEqual({
        type: 'field',
        id: 'w1',
        data: {
          type: 'input',
          label: '用户名',
          field: 'username',
          placeholder: '请输入用户名',
          required: true,
        },
      })
    })

    it('opens node edit dialog', () => {
      interaction.openNodeEdit('n1', mockNodeData)

      expect(interaction.isEditDialogVisible.value).toBe(true)
      expect(interaction.editContext.value).toEqual({
        type: 'node',
        id: 'n1',
        data: mockNodeData,
      })
    })

    it('closes edit dialog', () => {
      interaction.openFieldEdit(mockWidget)
      interaction.closeEditDialog()

      expect(interaction.isEditDialogVisible.value).toBe(false)
      expect(interaction.editContext.value).toBeNull()
    })
  })

  describe('Widget selection (partial apply)', () => {
    it('toggles widget selection', () => {
      interaction.toggleWidgetSelection('w1')
      expect(interaction.selectedWidgetIds.value.has('w1')).toBe(true)

      interaction.toggleWidgetSelection('w1')
      expect(interaction.selectedWidgetIds.value.has('w1')).toBe(false)
    })

    it('selects all widgets', () => {
      const widgets: Widget[] = [
        { id: 'w1', type: 'input', field: 'name', label: '姓名' },
        { id: 'w2', type: 'input', field: 'email', label: '邮箱' },
      ]

      interaction.selectAllWidgets(widgets)

      expect(interaction.selectedWidgetIds.value.has('w1')).toBe(true)
      expect(interaction.selectedWidgetIds.value.has('w2')).toBe(true)
    })

    it('clears widget selection', () => {
      interaction.toggleWidgetSelection('w1')
      interaction.toggleWidgetSelection('w2')
      interaction.clearWidgetSelection()

      expect(interaction.selectedWidgetIds.value.size).toBe(0)
    })

    it('computes hasSelection', () => {
      expect(interaction.hasSelection.value).toBe(false)

      interaction.toggleWidgetSelection('w1')
      expect(interaction.hasSelection.value).toBe(true)
    })

    it('computes selectedCount', () => {
      expect(interaction.selectedCount.value).toBe(0)

      interaction.toggleWidgetSelection('w1')
      interaction.toggleWidgetSelection('w2')
      expect(interaction.selectedCount.value).toBe(2)
    })
  })

  describe('Node status', () => {
    it('sets and gets node status', () => {
      interaction.setNodeStatus('n1', 'added')
      expect(interaction.getNodeStatus('n1')).toBe('added')
    })

    it('returns undefined for unset node status', () => {
      expect(interaction.getNodeStatus('unknown')).toBeUndefined()
    })

    it('gets node status color', () => {
      expect(interaction.getNodeStatusColor('added')).toContain('success')
      expect(interaction.getNodeStatusColor('modified')).toContain('warning')
      expect(interaction.getNodeStatusColor('removed')).toContain('danger')
      expect(interaction.getNodeStatusColor('unchanged')).toContain('secondary')
    })
  })

  describe('Reset', () => {
    it('resets all state', () => {
      // Set up some state
      interaction.selectField(mockWidget)
      interaction.selectNode('n1', mockNodeData)
      interaction.setHighlightedFields(['w1'])
      interaction.toggleWidgetSelection('w1')
      interaction.openFieldEdit(mockWidget)
      interaction.setNodeStatus('n1', 'added')

      // Reset
      interaction.reset()

      // Verify all state is cleared
      expect(interaction.selectedFieldId.value).toBeNull()
      expect(interaction.selectedNodeId.value).toBeNull()
      expect(interaction.highlightedFieldIds.value.size).toBe(0)
      expect(interaction.selectedWidgetIds.value.size).toBe(0)
      expect(interaction.isEditDialogVisible.value).toBe(false)
      expect(interaction.editContext.value).toBeNull()
      expect(interaction.nodeStatusMap.value.size).toBe(0)
    })
  })
})
