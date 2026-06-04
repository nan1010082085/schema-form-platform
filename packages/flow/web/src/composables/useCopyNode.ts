import { onMounted, onUnmounted } from 'vue'
import type { Node } from '@vue-flow/core'
import { useFlowGraphStore } from '../stores/flowGraph.js'
import { useClipboard } from './useClipboard.js'

export interface UseCopyNodeOptions {
  /** Function returning currently selected VueFlow nodes */
  getSelectedNodes: () => Node[]
  /** Whether copy/paste is enabled (e.g. disabled in read-only mode) */
  enabled?: () => boolean
}

const OFFSET_STEP = 30

export function useCopyNode(options: UseCopyNodeOptions) {
  const graphStore = useFlowGraphStore()
  const { copy, paste, hasClipboardContent } = useClipboard()

  function handleKeyDown(e: KeyboardEvent) {
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
    if (options.enabled && !options.enabled()) return

    const isMod = e.ctrlKey || e.metaKey

    // Ctrl+C: copy selected nodes
    if (isMod && e.key === 'c') {
      const selected = options.getSelectedNodes()
      if (selected.length > 0) {
        copy(selected)
      }
    }

    // Ctrl+V: paste copied nodes
    if (isMod && e.key === 'v') {
      if (!hasClipboardContent()) return

      const newNodes = paste()
      if (newNodes.length === 0) return

      // Build old-id -> new-id map for edge remapping
      const idMap = new Map<string, string>()

      // The paste() from useClipboard already generates new IDs and offsets positions.
      // We need to capture the mapping before adding to store.
      // Re-read clipboard to build the mapping by matching positions.
      const clipboardNodes = options.getSelectedNodes() // not available here
      // Instead, use the returned nodes which have new IDs already

      for (const node of newNodes) {
        graphStore.addNode(node)
      }
    }

    // Ctrl+D: duplicate selected nodes (copy + paste in one action)
    if (isMod && e.key === 'd') {
      e.preventDefault()
      const selected = options.getSelectedNodes()
      if (selected.length === 0) return

      copy(selected)
      const newNodes = paste()
      for (const node of newNodes) {
        graphStore.addNode(node)
      }
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  return {
    copySelected: () => {
      const selected = options.getSelectedNodes()
      if (selected.length > 0) copy(selected)
    },
    pasteNodes: () => {
      if (!hasClipboardContent()) return
      const newNodes = paste()
      for (const node of newNodes) {
        graphStore.addNode(node)
      }
      return newNodes
    },
    hasClipboardContent,
  }
}
