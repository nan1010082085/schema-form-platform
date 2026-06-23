import { multiGaugeConfig } from './config-multi'
import { FgMultiGauge, createGaugeWidget } from './index'

export { FgMultiGauge }

export function createMultiGaugeWidget(id: string) {
  return createGaugeWidget(id, multiGaugeConfig)
}

export { multiGaugeConfig }
