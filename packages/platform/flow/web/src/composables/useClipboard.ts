import type { Node } from '@vue-flow/core'

const OFFSET_STEP = 20
// Use a plain array type to avoid TS2589 from VueFlow's deep generic inference on ref<Node[]>
const copiedNodes: { value: Record<string, unknown>[] } = { value: [] }
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

    return copiedNodes.value.map((node): Node => ({
      ...node,
      id: `node-${crypto.randomUUID()}`,
      position: {
        x: (node.position as { x: number; y: number }).x + offset,
        y: (node.position as { x: number; y: number }).y + offset,
      },
      selected: false,
    } as unknown as Node))
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
