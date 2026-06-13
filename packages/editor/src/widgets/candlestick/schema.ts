import { publicSchema } from '../base/publicSchema'
import { candlestickConfig } from './config'
import type { Widget } from '../base/types'

export function createCandlestickWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'candlestick'),
    name: candlestickConfig.name,
    label: candlestickConfig.displayName,
    position: { x: 0, y: 0, w: 600, h: 400, zIndex: 1 },
    style: { ...candlestickConfig.defaultStyle },
    props: { ...candlestickConfig.defaultProps },
  }
}
