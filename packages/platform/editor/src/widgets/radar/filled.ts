import { filledRadarConfig } from './config-filled'
import { FgFilledRadar, createRadarWidget } from './index'

export { FgFilledRadar }

export function createFilledRadarWidget(id: string) {
  return createRadarWidget(id, filledRadarConfig)
}

export { filledRadarConfig }
