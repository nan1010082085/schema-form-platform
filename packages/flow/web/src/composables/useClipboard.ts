import { ref } from 'vue'
import type { Node } from '@vue-flow/core'

const OFFSET_STEP = 20
const copiedNodes = ref<Node[]>([])
let pasteCount = 0

export function useClipboard() {
  function copy(nodes: Node[]) {
    if (nodes.length === 0) return
    // Deep clone to decouple from live store refs
    copiedNodes.value = JSON.parse(JSON.stringify(nodes))
    pasteCount = 0
  }

  function paste(): Node[] {
    if (copiedNodes.value.length === 0) return []

    pasteCount++
    const offset = OFFSET_STEP * pasteCount

    return copiedNodes.value.map((node) => ({
      ...node,
      id: `node-${crypto.randomUUID()}`,
      position: {
        x: node.position.x + offset,
        y: node.position.y + offset,
      },
      selected: false,
    }))
  }

  function hasClipboardContent(): boolean {
    return copiedNodes.value.length > 0
  }

  return {
    copy,
    paste,
    hasClipboardContent,
  }
}
