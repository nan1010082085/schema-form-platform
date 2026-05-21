import { publicSchema } from '../base/publicSchema'
import { searchListConfig } from './config'
import type { Widget } from '../base/types'

export function createSearchListWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'search-list'),
    name: searchListConfig.name,
    label: searchListConfig.displayName,
    position: { x: 0, y: 0, w: 800, h: 500, zIndex: 1 },
    style: { ...searchListConfig.defaultStyle },
    props: { ...searchListConfig.defaultProps },
  }
}
