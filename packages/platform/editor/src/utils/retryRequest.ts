/**
 * 重试请求工具
 *
 * 根据 SchemaApiConfig.enableRetry 配置决定是否重试
 * 默认重试 3 次，最高 5 次
 */

const DEFAULT_RETRY_COUNT = 3
const MAX_RETRY_COUNT = 5
const RETRY_DELAY_MS = 1000

export interface RetryOptions {
  enableRetry?: boolean
  maxRetries?: number
  delayMs?: number
}

/**
 * 带重试的请求执行器
 * enableRetry 为 false 时直接执行，失败直接抛出
 * enableRetry 为 true 时重试最多 maxRetries 次，全部失败后抛出最后一个错误
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  if (!options.enableRetry) {
    return fn()
  }

  const maxRetries = Math.min(
    options.maxRetries ?? DEFAULT_RETRY_COUNT,
    MAX_RETRY_COUNT,
  )
  const delayMs = options.delayMs ?? RETRY_DELAY_MS

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
  }

  throw lastError
}
