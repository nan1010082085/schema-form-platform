/**
 * LLM Instance Cache — ChatOpenAI singleton per model.
 *
 * Avoids creating duplicate ChatOpenAI instances for the same model
 * configuration. Each unique (model, temperature, maxTokens) key maps
 * to a single cached instance.
 *
 * Usage:
 *   import { getLLM } from '../services/llmCache.js'
 *   const model = getLLM()           // default: deepseek-v4-pro
 *   const fast = getLLM({ temperature: 0 })  // cached separately
 */

import { ChatOpenAI } from '@langchain/openai'

interface LLMOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  /** Enable JSON response format (for structured output). */
  jsonMode?: boolean
}

const llmCache = new Map<string, ChatOpenAI>()

function cacheKey(opts: LLMOptions): string {
  const model = opts.model ?? 'deepseek-v4-pro'
  const temp = opts.temperature ?? 0.7
  const max = opts.maxTokens ?? 8192
  const json = opts.jsonMode ? 'json' : 'text'
  return `${model}|${temp}|${max}|${json}`
}

/**
 * Get or create a cached ChatOpenAI instance for DeepSeek.
 *
 * All instances share the same API key (from DEEPSEEK_API_KEY env var)
 * and base URL (https://api.deepseek.com). The cache key is derived
 * from (model, temperature, maxTokens, jsonMode).
 */
export function getLLM(opts: LLMOptions = {}): ChatOpenAI {
  const key = cacheKey(opts)

  if (!llmCache.has(key)) {
    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY environment variable is required.')
    }

    const model = new ChatOpenAI({
      model: opts.model ?? 'deepseek-v4-pro',
      apiKey,
      configuration: { baseURL: 'https://api.deepseek.com' },
      temperature: opts.temperature ?? 0.7,
      maxTokens: opts.maxTokens ?? 8192,
      streaming: true,
      timeout: 120_000,  // 2 分钟单次 LLM 调用超时
      ...(opts.jsonMode ? { modelKwargs: { response_format: { type: 'json_object' } } } : {}),
    })

    llmCache.set(key, model)
  }

  return llmCache.get(key)!
}

/**
 * Clear the LLM cache. Useful for testing or config changes.
 */
export function clearLLMCache(): void {
  llmCache.clear()
}
