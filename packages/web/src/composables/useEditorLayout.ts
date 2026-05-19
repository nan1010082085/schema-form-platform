/**
 * useEditorLayout — Panel visibility and left-panel tab state
 *
 * Controls the three-panel editor layout: left panel (components/structure),
 * right panel (properties), and the active tab within the left panel.
 */
import { ref } from 'vue'
import type { Ref } from 'vue'

export interface UseEditorLayoutReturn {
  leftPanelVisible: Ref<boolean>
  rightPanelVisible: Ref<boolean>
  leftTab: Ref<'components' | 'structure'>
}

export function useEditorLayout(): UseEditorLayoutReturn {
  const leftPanelVisible = ref(true)
  const rightPanelVisible = ref(true)
  const leftTab = ref<'components' | 'structure'>('components')

  return { leftPanelVisible, rightPanelVisible, leftTab }
}
