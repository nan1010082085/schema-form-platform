/**
 * useIdGenerate — 组件 ID 与 VID 生成
 *
 * 组件 ID 格式: 组件Key + 5位随机 Hash（如 input-A3xK9）
 * 生成时机: 拖拽入画布瞬间，永久不变
 */
import type { SchemaType } from '@/components/FormGrid/types'
import { ID_HASH_LENGTH } from './useConstant'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

/**
 * 生成组件唯一 ID
 * @example generateComponentId('input') // 'input-A3xK9'
 */
export function generateComponentId(componentKey: SchemaType): string {
  const hash = Array.from(
    { length: ID_HASH_LENGTH },
    () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)],
  ).join('')
  return `${componentKey}-${hash}`
}

/**
 * 生成发布版本 VID
 * @example generateVid() // 'vid-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
 */
export function generateVid(): string {
  return `vid-${crypto.randomUUID()}`
}
