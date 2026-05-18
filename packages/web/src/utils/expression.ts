/**
 * Lightweight expression engine for conditional schema properties
 *
 * Supports:
 * - Field references: ${field} → formData['field']
 * - Comparison: ===, !==, >, <, >=, <=
 * - Logical: &&, ||, !
 * - Ternary: condition ? trueVal : falseVal
 * - Nullish coalescing: value ?? default
 *
 * Security:
 * - Blocks global object access (window, document, globalThis, etc.)
 * - Blocks module imports (import, require)
 * - Blocks code injection (eval, Function, setTimeout, setInterval, new)
 * - Blocks loop constructs (while, for, do) to prevent infinite loops
 * - 100ms execution timeout (post-hoc check)
 * - 500 character expression length limit
 * - LRU compile cache with 1000 entry limit
 */
import type { FormData } from '@/components/FormGrid/types'

/** Expression evaluation context */
export interface ExpressionContext {
  formData: FormData
}

/** Validation result */
export interface ExpressionValidationResult {
  valid: boolean
  error?: string
}

// ---- Constants ----

const MAX_EXPRESSION_LENGTH = 500
const MAX_CACHE_SIZE = 1000
const EXECUTION_TIMEOUT_MS = 100

/** Security blocklist — patterns that must not appear in compiled expressions */
const BLOCKED_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  // Global objects
  { pattern: /\bwindow\b/, message: '禁止访问全局对象: window' },
  { pattern: /\bdocument\b/, message: '禁止访问全局对象: document' },
  { pattern: /\bglobalThis\b/, message: '禁止访问全局对象: globalThis' },
  { pattern: /\bself\s*[.[]/, message: '禁止访问全局对象: self' },
  { pattern: /\btop\s*[.[]/, message: '禁止访问全局对象: top' },
  { pattern: /\bparent\s*[.[]/, message: '禁止访问全局对象: parent' },
  { pattern: /\bframes\b/, message: '禁止访问全局对象: frames' },
  // Module imports
  { pattern: /\bimport\s*\(/, message: '禁止模块导入: import()' },
  { pattern: /\brequire\s*\(/, message: '禁止模块导入: require()' },
  // Code injection
  { pattern: /\beval\s*\(/, message: '禁止代码注入: eval()' },
  { pattern: /\bFunction\s*\(/, message: '禁止代码注入: Function()' },
  { pattern: /\bsetTimeout\s*\(/, message: '禁止代码注入: setTimeout()' },
  { pattern: /\bsetInterval\s*\(/, message: '禁止代码注入: setInterval()' },
  { pattern: /\bnew\s+/, message: '禁止使用 new 关键字' },
  // Loop constructs (prevent infinite loops)
  { pattern: /\bwhile\s*\(/, message: '禁止循环语句: while' },
  { pattern: /\bfor\s*\(/, message: '禁止循环语句: for' },
  { pattern: /\bdo\s*\{/, message: '禁止循环语句: do' },
]

// ---- LRU Compile Cache ----

/** Map maintains insertion order; oldest entry is evicted first */
const compileCache = new Map<string, (formData: FormData) => unknown>()

/**
 * Replace ${field} references with safe formData property access
 * Matches: ${word} where word is \w+ (letters, digits, underscore)
 */
function replaceFieldRefs(expression: string): string {
  return expression.replace(/\$\{(\w+)\}/g, (_match, field: string) => {
    return `formData['${field}']`
  })
}

/**
 * Check expression string against security blocklist
 * @returns error message if blocked, null if safe
 */
function checkSecurity(expression: string): string | null {
  for (const { pattern, message } of BLOCKED_PATTERNS) {
    if (pattern.test(expression)) {
      return message
    }
  }
  return null
}

/**
 * Get compiled function from cache, or compile and cache it
 */
function getOrCompile(expression: string): (formData: FormData) => unknown {
  // Cache hit
  const cached = compileCache.get(expression)
  if (cached) {
    // Move to end (most recently used) by delete + re-insert
    compileCache.delete(expression)
    compileCache.set(expression, cached)
    return cached
  }

  // Security check on the raw expression (before field replacement)
  // This catches patterns like `window.location` in raw expressions
  const securityError = checkSecurity(expression)
  if (securityError) {
    throw new Error(`表达式安全检查失败: ${securityError}`)
  }

  // Replace ${field} with formData['field']
  const replaced = replaceFieldRefs(expression)

  // Security check again on the replaced expression
  // This catches patterns injected via field names (unlikely but safe)
  const replacedSecurityError = checkSecurity(replaced)
  if (replacedSecurityError) {
    throw new Error(`表达式安全检查失败: ${replacedSecurityError}`)
  }

  // Compile
  try {
    const fn = new Function(
      'formData',
      `"use strict"; return (${replaced})`,
    ) as (formData: FormData) => unknown

    // LRU eviction: remove oldest entry when cache is full
    if (compileCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = compileCache.keys().next().value
      if (oldestKey !== undefined) {
        compileCache.delete(oldestKey)
      }
    }

    compileCache.set(expression, fn)
    return fn
  } catch (err) {
    throw new Error(`表达式编译失败: ${err instanceof Error ? err.message : String(err)}`)
  }
}

/**
 * Evaluate an expression against the given context
 *
 * @param expression - Expression string (e.g. "${age} > 18")
 * @param context - Evaluation context containing formData
 * @returns Evaluated result
 * @throws Error if expression is invalid, blocked, or exceeds timeout
 *
 * @example
 * ```ts
 * const result = evaluateExpression<boolean>('${age} >= 18', { formData: { age: 20 } })
 * // result === true
 * ```
 */
export function evaluateExpression<T = unknown>(
  expression: string,
  context: ExpressionContext,
): T {
  if (!expression || typeof expression !== 'string') {
    throw new Error('表达式必须是非空字符串')
  }

  if (expression.length > MAX_EXPRESSION_LENGTH) {
    throw new Error(
      `表达式长度超过限制 (${expression.length} > ${MAX_EXPRESSION_LENGTH} 字符)`,
    )
  }

  const fn = getOrCompile(expression)

  const start = performance.now()
  const result = fn(context.formData) as T
  const elapsed = performance.now() - start

  if (elapsed > EXECUTION_TIMEOUT_MS) {
    throw new Error(
      `表达式执行超时 (${elapsed.toFixed(1)}ms > ${EXECUTION_TIMEOUT_MS}ms)`,
    )
  }

  return result
}

/**
 * Validate an expression without executing it
 * Checks syntax and security without side effects
 *
 * @param expression - Expression string to validate
 * @returns Validation result with optional error message
 *
 * @example
 * ```ts
 * const result = validateExpression('${age} > 18')
 * // result.valid === true
 *
 * const bad = validateExpression('window.location')
 * // bad.valid === false, bad.error contains security message
 * ```
 */
export function validateExpression(expression: string): ExpressionValidationResult {
  if (!expression || typeof expression !== 'string') {
    return { valid: false, error: '表达式必须是非空字符串' }
  }

  if (expression.length > MAX_EXPRESSION_LENGTH) {
    return {
      valid: false,
      error: `表达式长度超过限制 (${expression.length} > ${MAX_EXPRESSION_LENGTH} 字符)`,
    }
  }

  // Security check
  const securityError = checkSecurity(expression)
  if (securityError) {
    return { valid: false, error: securityError }
  }

  // Syntax check: try to compile without executing
  try {
    const replaced = replaceFieldRefs(expression)
    new Function('formData', `"use strict"; return (${replaced})`)
    return { valid: true }
  } catch (err) {
    return {
      valid: false,
      error: `表达式语法错误: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

/**
 * Clear the expression compile cache
 * Useful for testing or memory management
 */
export function clearExpressionCache(): void {
  compileCache.clear()
}

/**
 * Get current cache size (for testing/monitoring)
 */
export function getExpressionCacheSize(): number {
  return compileCache.size
}
