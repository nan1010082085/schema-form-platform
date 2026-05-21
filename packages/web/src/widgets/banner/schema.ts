import { publicSchema } from '../base/publicSchema'
import { bannerConfig } from './config'
import type { Widget } from '../base/types'

export function createBannerWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'banner'),
    name: bannerConfig.name,
    label: bannerConfig.displayName,
    position: { x: 0, y: 0, w: 600, h: 40, zIndex: 1 },
    style: { ...bannerConfig.defaultStyle },
    props: { ...bannerConfig.defaultProps },
  }
}
