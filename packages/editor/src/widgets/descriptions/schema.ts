import { publicSchema } from '../base/publicSchema'
import { descriptionsConfig } from './config'
import type { Widget } from '../base/types'

export function createDescriptionsWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'descriptions'),
    name: descriptionsConfig.name,
    label: descriptionsConfig.displayName,
    position: { x: 0, y: 0, w: 600, h: 200, zIndex: 1 },
    style: { ...descriptionsConfig.defaultStyle },
    props: { ...descriptionsConfig.defaultProps },
  }
}
