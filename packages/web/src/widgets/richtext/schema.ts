import { publicSchema } from '../base/publicSchema'
import { richtextConfig } from './config'
import type { Widget } from '../base/types'

export function createRichtextWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'richtext'),
    name: richtextConfig.name,
    label: richtextConfig.displayName,
    position: { x: 0, y: 0, w: 240, h: 200, zIndex: 1 },
    style: { ...richtextConfig.defaultStyle },
    props: { ...richtextConfig.defaultProps },
  }
}
