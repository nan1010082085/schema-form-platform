import { compareFunnelConfig } from './config-compare'
import { FgCompareFunnel, createFunnelWidget } from './index'

export { FgCompareFunnel }

export function createCompareFunnelWidget(id: string) {
  return createFunnelWidget(id, compareFunnelConfig)
}

export { compareFunnelConfig }
