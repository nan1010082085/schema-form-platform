import { publicSchema } from '../base/publicSchema'
import { uploadConfig } from './config'
import type { Widget } from '../base/types'

export function createUploadWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'upload'),
    name: uploadConfig.name,
    label: uploadConfig.displayName,
    position: { x: 0, y: 0, w: 240, h: 32, zIndex: 1 },
    style: { ...uploadConfig.defaultStyle },
    props: { ...uploadConfig.defaultProps },
  }
}
