import type { Node } from '@vue-flow/core'

/** Props that every node panel receives from the FlowPropertyPanel shell */
export interface NodePanelProps {
  /** The currently selected Vue Flow node */
  node: Node
}

/** Emits that every node panel can use to update node data */
export interface NodePanelEmits {
  (e: 'updateNodeData', key: string, value: unknown): void
}
