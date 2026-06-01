import { describe, it, expect } from 'vitest'
import { evaluateExpression, evaluateScript, ExpressionEvaluationError } from '../ExpressionEvaluator.js'

describe('evaluateExpression', () => {
  describe('basic boolean values', () => {
    it('evaluates literal true', () => {
      expect(evaluateExpression('true', {})).toBe(true)
    })

    it('evaluates literal false', () => {
      expect(evaluateExpression('false', {})).toBe(false)
    })
  })

  describe('empty / null expression', () => {
    it('returns true for empty string', () => {
      expect(evaluateExpression('', {})).toBe(true)
    })

    it('returns true for whitespace-only string', () => {
      expect(evaluateExpression('   ', {})).toBe(true)
    })
  })

  describe('variable comparison', () => {
    it('evaluates numeric greater-than', () => {
      expect(evaluateExpression('amount > 1000', { amount: 1500 })).toBe(true)
      expect(evaluateExpression('amount > 1000', { amount: 500 })).toBe(false)
    })

    it('evaluates string strict equality', () => {
      expect(evaluateExpression("status === 'approved'", { status: 'approved' })).toBe(true)
      expect(evaluateExpression("status === 'approved'", { status: 'rejected' })).toBe(false)
    })

    it('evaluates less-than-or-equal', () => {
      expect(evaluateExpression('count <= 10', { count: 10 })).toBe(true)
      expect(evaluateExpression('count <= 10', { count: 11 })).toBe(false)
    })
  })

  describe('logical operators', () => {
    it('evaluates && (AND)', () => {
      const expr = "amount > 100 && status === 'pending'"
      expect(evaluateExpression(expr, { amount: 150, status: 'pending' })).toBe(true)
      expect(evaluateExpression(expr, { amount: 150, status: 'approved' })).toBe(false)
      expect(evaluateExpression(expr, { amount: 50, status: 'pending' })).toBe(false)
    })

    it('evaluates || (OR)', () => {
      const expr = "role === 'admin' || role === 'manager'"
      expect(evaluateExpression(expr, { role: 'admin' })).toBe(true)
      expect(evaluateExpression(expr, { role: 'manager' })).toBe(true)
      expect(evaluateExpression(expr, { role: 'user' })).toBe(false)
    })

    it('evaluates negation', () => {
      expect(evaluateExpression('!disabled', { disabled: false })).toBe(true)
      expect(evaluateExpression('!disabled', { disabled: true })).toBe(false)
    })
  })

  describe('nested property access', () => {
    it('accesses nested object properties', () => {
      expect(evaluateExpression("user.role === 'admin'", { user: { role: 'admin' } })).toBe(true)
      expect(evaluateExpression("user.role === 'admin'", { user: { role: 'viewer' } })).toBe(false)
    })

    it('accesses deeply nested properties', () => {
      const vars = { a: { b: { c: 42 } } }
      expect(evaluateExpression('a.b.c === 42', vars)).toBe(true)
    })
  })

  describe('blocked patterns', () => {
    it.each([
      'import("fs")',
      'require("fs")',
      'eval("1+1")',
      'new Function("return 1")',
      'fetch("http://evil.com")',
      'process.exit()',
      'window.location',
      'document.cookie',
    ] as const)('blocks dangerous pattern: %s', (expr) => {
      expect(() => evaluateExpression(expr, {})).toThrow(ExpressionEvaluationError)
    })

    it('blocks XMLHttpRequest', () => {
      expect(() => evaluateExpression('new XMLHttpRequest()', {})).toThrow(ExpressionEvaluationError)
    })

    it('blocks WebSocket', () => {
      expect(() => evaluateExpression('new WebSocket("ws://x")', {})).toThrow(ExpressionEvaluationError)
    })

    it('blocks globalThis access', () => {
      expect(() => evaluateExpression('globalThis.x', {})).toThrow(ExpressionEvaluationError)
    })

    it('blocks navigator access', () => {
      expect(() => evaluateExpression('navigator.userAgent', {})).toThrow(ExpressionEvaluationError)
    })

    it('blocks location access', () => {
      expect(() => evaluateExpression('location.href', {})).toThrow(ExpressionEvaluationError)
    })
  })

  describe('expression length limit', () => {
    it('throws when expression exceeds 500 characters', () => {
      const longExpr = 'a'.repeat(501)
      expect(() => evaluateExpression(longExpr, {})).toThrow(ExpressionEvaluationError)
      expect(() => evaluateExpression(longExpr, {})).toThrow(/超过最大长度限制/)
    })

    it('accepts expression at exactly 500 characters', () => {
      // 500 chars of a valid expression
      const expr = 'x > 0' + ' '.repeat(495)
      expect(evaluateExpression(expr, { x: 1 })).toBe(true)
    })
  })

  describe('invalid syntax', () => {
    it('throws ExpressionEvaluationError for malformed expression', () => {
      expect(() => evaluateExpression('=== !!!', {})).toThrow(ExpressionEvaluationError)
    })

    it('throws ExpressionEvaluationError referencing undefined variable behavior', () => {
      // The expression references a variable not passed — new Function will throw ReferenceError
      expect(() => evaluateExpression('undeclaredVar > 0', {})).toThrow(ExpressionEvaluationError)
    })
  })

  describe('error type', () => {
    it('throws ExpressionEvaluationError (not generic Error)', () => {
      try {
        evaluateExpression('import("x")', {})
        expect.fail('should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(ExpressionEvaluationError)
        expect(err).toBeInstanceOf(Error)
        expect((err as Error).name).toBe('ExpressionEvaluationError')
      }
    })
  })
})

describe('evaluateScript', () => {
  describe('return values', () => {
    it('returns the computed value, not a boolean', () => {
      expect(evaluateScript('1 + 2', {})).toBe(3)
    })

    it('returns a string value', () => {
      expect(evaluateScript("'hello' + ' ' + 'world'", {})).toBe('hello world')
    })

    it('returns an object value', () => {
      const result = evaluateScript('({ key: "value", count: 42 })', {})
      expect(result).toEqual({ key: 'value', count: 42 })
    })

    it('returns an array value', () => {
      const result = evaluateScript('[1, 2, 3]', {})
      expect(result).toEqual([1, 2, 3])
    })

    it('returns undefined for empty script', () => {
      expect(evaluateScript('', {})).toBeUndefined()
    })

    it('returns undefined for whitespace-only script', () => {
      expect(evaluateScript('   ', {})).toBeUndefined()
    })
  })

  describe('variable access', () => {
    it('accesses injected variables', () => {
      expect(evaluateScript('amount + 10', { amount: 100 })).toBe(110)
    })

    it('accesses nested object properties', () => {
      const vars = { user: { name: 'Alice', age: 30 } }
      expect(evaluateScript('user.name', vars)).toBe('Alice')
    })

    it('supports template-style concatenation', () => {
      const vars = { firstName: 'John', lastName: 'Doe' }
      expect(evaluateScript('firstName + " " + lastName', vars)).toBe('John Doe')
    })
  })

  describe('blocked patterns', () => {
    it.each([
      'import("fs")',
      'require("fs")',
      'eval("1+1")',
      'fetch("http://evil.com")',
      'process.exit()',
      'window.location',
    ] as const)('blocks dangerous pattern: %s', (expr) => {
      expect(() => evaluateScript(expr, {})).toThrow(ExpressionEvaluationError)
    })
  })

  describe('length limit', () => {
    it('throws when script exceeds 10000 characters', () => {
      const longScript = '"x"'.repeat(3334) // ~10002 chars
      expect(() => evaluateScript(longScript, {})).toThrow(ExpressionEvaluationError)
      expect(() => evaluateScript(longScript, {})).toThrow(/超过最大长度限制/)
    })
  })

  describe('invalid syntax', () => {
    it('throws for malformed script', () => {
      expect(() => evaluateScript('=== !!!', {})).toThrow(ExpressionEvaluationError)
    })
  })
})
