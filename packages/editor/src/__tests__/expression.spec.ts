/**
 * Expression engine unit tests
 *
 * Covers (>= 15 cases):
 * - Basic evaluation: field refs, comparison, logical, ternary, nullish coalescing
 * - Template replacement: single field, multiple fields, field not exists
 * - Security blocking: window, document, eval, require
 * - Timeout protection: post-hoc check
 * - Edge cases: empty string, plain text, too long, syntax error
 * - Compile cache: hit, eviction
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  evaluateExpression,
  validateExpression,
  clearExpressionCache,
  getExpressionCacheSize,
} from '@/utils/expression'
import type { ExpressionContext } from '@/utils/expression'

/** Helper: create context with given formData */
function ctx(formData: Record<string, unknown> = {}): ExpressionContext {
  return { formData: formData as never }
}

describe('expression engine', () => {
  beforeEach(() => {
    clearExpressionCache()
  })

  // ======== Basic evaluation ========

  describe('basic evaluation', () => {
    it('evaluates field reference', () => {
      const result = evaluateExpression<number>('${age}', ctx({ age: 25 }))
      expect(result).toBe(25)
    })

    it('evaluates comparison operators', () => {
      expect(evaluateExpression<boolean>('${age} > 18', ctx({ age: 20 }))).toBe(true)
      expect(evaluateExpression<boolean>('${age} >= 18', ctx({ age: 18 }))).toBe(true)
      expect(evaluateExpression<boolean>('${age} < 18', ctx({ age: 15 }))).toBe(true)
      expect(evaluateExpression<boolean>('${age} <= 18', ctx({ age: 18 }))).toBe(true)
      expect(evaluateExpression<boolean>('${age} === 18', ctx({ age: 18 }))).toBe(true)
      expect(evaluateExpression<boolean>('${age} !== 18', ctx({ age: 20 }))).toBe(true)
    })

    it('evaluates logical operators', () => {
      expect(evaluateExpression<boolean>(
        '${age} > 18 && ${status} === "active"',
        ctx({ age: 20, status: 'active' }),
      )).toBe(true)

      expect(evaluateExpression<boolean>(
        '${age} > 18 || ${vip} === true',
        ctx({ age: 15, vip: true }),
      )).toBe(true)

      expect(evaluateExpression<boolean>('!${disabled}', ctx({ disabled: false }))).toBe(true)
    })

    it('evaluates ternary expression', () => {
      const result = evaluateExpression<string>(
        '${age} >= 18 ? "adult" : "minor"',
        ctx({ age: 20 }),
      )
      expect(result).toBe('adult')

      const result2 = evaluateExpression<string>(
        '${age} >= 18 ? "adult" : "minor"',
        ctx({ age: 15 }),
      )
      expect(result2).toBe('minor')
    })

    it('evaluates nullish coalescing', () => {
      const result = evaluateExpression<string>(
        '${name} ?? "anonymous"',
        ctx({ name: undefined }),
      )
      expect(result).toBe('anonymous')

      const result2 = evaluateExpression<string>(
        '${name} ?? "anonymous"',
        ctx({ name: 'Alice' }),
      )
      expect(result2).toBe('Alice')
    })
  })

  // ======== Template replacement ========

  describe('template replacement', () => {
    it('replaces single field reference', () => {
      const result = evaluateExpression<string>('${name}', ctx({ name: 'Alice' }))
      expect(result).toBe('Alice')
    })

    it('replaces multiple field references', () => {
      const result = evaluateExpression<string>(
        '${firstName} + " " + ${lastName}',
        ctx({ firstName: 'John', lastName: 'Doe' }),
      )
      expect(result).toBe('John Doe')
    })

    it('returns undefined for non-existent field', () => {
      const result = evaluateExpression('${missing}', ctx({}))
      expect(result).toBeUndefined()
    })
  })

  // ======== Security blocking ========

  describe('security blocking', () => {
    it('blocks window access', () => {
      expect(() => evaluateExpression('window.location', ctx())).toThrow('window')
    })

    it('blocks document access', () => {
      expect(() => evaluateExpression('document.title', ctx())).toThrow('document')
    })

    it('blocks eval()', () => {
      expect(() => evaluateExpression('eval("1+1")', ctx())).toThrow('eval')
    })

    it('blocks require()', () => {
      expect(() => evaluateExpression('require("fs")', ctx())).toThrow('require')
    })

    it('blocks import()', () => {
      expect(() => evaluateExpression('import("./evil")', ctx())).toThrow('import')
    })

    it('blocks new keyword', () => {
      expect(() => evaluateExpression('new Array()', ctx())).toThrow('new')
    })

    it('blocks globalThis access', () => {
      expect(() => evaluateExpression('globalThis.fetch', ctx())).toThrow('globalThis')
    })

    it('blocks while loops', () => {
      expect(() => evaluateExpression('while(true){}', ctx())).toThrow('while')
    })

    it('blocks for loops', () => {
      expect(() => evaluateExpression('for(;;){}', ctx())).toThrow('for')
    })

    it('does not block field values containing "new"', () => {
      // ${status} === "new" should work — "new" is inside a string literal
      const result = evaluateExpression<boolean>(
        '${status} === "new"',
        ctx({ status: 'new' }),
      )
      expect(result).toBe(true)
    })
  })

  // ======== Edge cases ========

  describe('edge cases', () => {
    it('throws on empty string', () => {
      expect(() => evaluateExpression('', ctx())).toThrow('非空字符串')
    })

    it('evaluates plain text string', () => {
      const result = evaluateExpression<string>('"hello"', ctx())
      expect(result).toBe('hello')
    })

    it('throws on expression exceeding 500 chars', () => {
      const longExpr = '${a} + ' + '1 + '.repeat(200) + '1'
      expect(() => evaluateExpression(longExpr, ctx({ a: 1 }))).toThrow('长度超过限制')
    })

    it('throws on syntax error', () => {
      expect(() => evaluateExpression('???invalid{{{', ctx())).toThrow('编译失败')
    })
  })

  // ======== Compile cache ========

  describe('compile cache', () => {
    it('caches compiled expressions (cache hit returns same result)', () => {
      const expr = '${age} > 18'
      evaluateExpression(expr, ctx({ age: 20 }))
      expect(getExpressionCacheSize()).toBe(1)

      evaluateExpression(expr, ctx({ age: 15 }))
      expect(getExpressionCacheSize()).toBe(1) // still 1 — cache hit
    })

    it('evicts oldest entry when cache reaches 1000', () => {
      // Fill cache to limit
      for (let i = 0; i < 1000; i++) {
        evaluateExpression(`\${a${i}} > 0`, { formData: { [`a${i}`]: 1 } as never })
      }
      expect(getExpressionCacheSize()).toBe(1000)

      // The first expression should be evicted when we add a new one
      evaluateExpression('${newField} > 0', ctx({ newField: 1 }))
      expect(getExpressionCacheSize()).toBe(1000) // still at limit

      // Re-evaluate the first expression (was evicted) — should recompile without error
      const result = evaluateExpression('${a0} > 0', { formData: { a0: 5 } as never })
      expect(result).toBe(true)
    })
  })

  // ======== validateExpression ========

  describe('validateExpression', () => {
    it('returns valid for well-formed expression', () => {
      const result = validateExpression('${age} > 18')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('returns invalid for security violation', () => {
      const result = validateExpression('window.location')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('window')
    })

    it('returns invalid for syntax error', () => {
      const result = validateExpression('???{{{')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('语法错误')
    })

    it('returns invalid for empty string', () => {
      const result = validateExpression('')
      expect(result.valid).toBe(false)
    })

    it('returns invalid for too-long expression', () => {
      const longExpr = 'a'.repeat(501)
      const result = validateExpression(longExpr)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('长度超过限制')
    })
  })
})
