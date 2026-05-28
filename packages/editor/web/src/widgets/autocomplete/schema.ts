import { publicSchema } from '../base/publicSchema'
import { autocompleteConfig } from './config'
import type { Widget } from '../base/types'

export function createAutocompleteWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'autocomplete'),
    name: autocompleteConfig.name,
    label: autocompleteConfig.displayName,
    position: { x: 0, y: 0, w: 280, h: 44, zIndex: 1 },
    style: { ...autocompleteConfig.defaultStyle },
    props: { ...autocompleteConfig.defaultProps },
  }
}
