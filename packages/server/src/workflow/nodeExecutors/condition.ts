/**
 * ConditionNodeExecutor — 条件节点执行器
 *
 * 功能：
 * - 评估条件表达式
 * - 支持多种比较运算符：==, !=, >, <, >=, <=, contains, not_contains
 * - 支持逻辑运算符：&& (AND), || (OR)
 * - 支持括号分组
 * - 返回分支路径（true/false）
 *
 * 设计原则：
 * - 表达式中使用 {{nodeId.output.field}} 引用变量
 * - 表达式评估结果为 boolean
 * - 输出 branch 字段表示走哪个分支
 */

import { NodeExecutor } from './base.js'
import type { NodeExecutionContext, NodeExecutionResult } from './base.js'

// ─── Condition Node Config ────────────────────────────────────────

interface ConditionNodeInputs {
  /** 条件表达式，如 "{{node1.output.amount}} > 100" */
  condition: string
  /** true 分支的节点 ID */
  trueBranch?: string
  /** false 分支的节点 ID */
  falseBranch?: string
}

// ─── Expression Parser ────────────────────────────────────────────

type TokenType = 'number' | 'string' | 'boolean' | 'null' | 'undefined' | 'identifier' | 'operator' | 'paren'

interface Token {
  type: TokenType
  value: string
}

class ExpressionTokenizer {
  private pos = 0

  constructor(private readonly input: string) {}

  tokenize(): Token[] {
    const tokens: Token[] = []
    this.pos = 0

    while (this.pos < this.input.length) {
      this.skipWhitespace()
      if (this.pos >= this.input.length) break

      const char = this.input[this.pos]

      // 括号
      if (char === '(' || char === ')') {
        tokens.push({ type: 'paren', value: char })
        this.pos++
        continue
      }

      // 字符串字面量
      if (char === "'" || char === '"') {
        tokens.push(this.readString(char))
        continue
      }

      // 数字
      if (this.isDigit(char) || (char === '-' && this.isDigit(this.peek()))) {
        tokens.push(this.readNumber())
        continue
      }

      // 标识符或关键字
      if (this.isAlpha(char) || char === '{') {
        tokens.push(this.readIdentifierOrKeyword())
        continue
      }

      // 运算符
      const op = this.readOperator()
      if (op) {
        tokens.push({ type: 'operator', value: op })
        continue
      }

      // 跳过未知字符
      this.pos++
    }

    return tokens
  }

  private skipWhitespace(): void {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
      this.pos++
    }
  }

  private readString(quote: string): Token {
    const start = this.pos + 1
    this.pos++ // skip opening quote
    while (this.pos < this.input.length && this.input[this.pos] !== quote) {
      this.pos++
    }
    this.pos++ // skip closing quote
    return { type: 'string', value: this.input.slice(start, this.pos - 1) }
  }

  private readNumber(): Token {
    const start = this.pos
    if (this.input[this.pos] === '-') this.pos++
    while (this.pos < this.input.length && this.isDigit(this.input[this.pos])) {
      this.pos++
    }
    if (this.pos < this.input.length && this.input[this.pos] === '.') {
      this.pos++
      while (this.pos < this.input.length && this.isDigit(this.input[this.pos])) {
        this.pos++
      }
    }
    return { type: 'number', value: this.input.slice(start, this.pos) }
  }

  private readIdentifierOrKeyword(): Token {
    const start = this.pos

    // 模板变量 {{...}}
    if (this.input[this.pos] === '{' && this.input[this.pos + 1] === '{') {
      this.pos += 2
      while (this.pos < this.input.length - 1 && !(this.input[this.pos] === '}' && this.input[this.pos + 1] === '}')) {
        this.pos++
      }
      this.pos += 2
      return { type: 'identifier', value: this.input.slice(start, this.pos) }
    }

    while (this.pos < this.input.length && (this.isAlphaNumeric(this.input[this.pos]) || this.input[this.pos] === '_')) {
      this.pos++
    }

    const value = this.input.slice(start, this.pos)

    if (value === 'true' || value === 'false') {
      return { type: 'boolean', value }
    }
    if (value === 'null') {
      return { type: 'null', value }
    }
    if (value === 'undefined') {
      return { type: 'undefined', value }
    }

    return { type: 'identifier', value }
  }

  private readOperator(): string | null {
    const twoChar = this.input.slice(this.pos, this.pos + 2)
    if (['==', '!=', '>=', '<=', '&&', '||'].includes(twoChar)) {
      this.pos += 2
      return twoChar
    }
    const oneChar = this.input[this.pos]
    if (['>', '<', '!'].includes(oneChar)) {
      this.pos++
      return oneChar
    }
    return null
  }

  private peek(): string {
    return this.pos + 1 < this.input.length ? this.input[this.pos + 1] : ''
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9'
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_'
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char)
  }
}

// ─── Expression Evaluator ──────────────────────────────────────────

class ExpressionEvaluator {
  private pos = 0

  constructor(
    private readonly tokens: Token[],
    private readonly resolver: (key: string) => unknown,
  ) {}

  evaluate(): unknown {
    const result = this.parseOr()
    return result
  }

  private parseOr(): unknown {
    let left = this.parseAnd()
    while (this.match('||')) {
      const right = this.parseAnd()
      left = left || right
    }
    return left
  }

  private parseAnd(): unknown {
    let left = this.parseComparison()
    while (this.match('&&')) {
      const right = this.parseComparison()
      left = left && right
    }
    return left
  }

  private parseComparison(): unknown {
    let left = this.parseUnary()

    while (this.pos < this.tokens.length) {
      const op = this.tokens[this.pos]
      if (op.type === 'operator' && ['==', '!=', '>=', '<=', '>', '<'].includes(op.value)) {
        this.pos++
        const right = this.parseUnary()
        left = this.compare(left, op.value, right)
      } else {
        break
      }
    }

    return left
  }

  private parseUnary(): unknown {
    if (this.match('!')) {
      const value = this.parsePrimary()
      return !value
    }
    return this.parsePrimary()
  }

  private parsePrimary(): unknown {
    if (this.pos >= this.tokens.length) {
      return undefined
    }

    const token = this.tokens[this.pos]

    // 括号分组
    if (token.type === 'paren' && token.value === '(') {
      this.pos++
      const result = this.parseOr()
      this.expect(')')
      return result
    }

    // 字面量
    if (token.type === 'number') {
      this.pos++
      return Number(token.value)
    }
    if (token.type === 'string') {
      this.pos++
      return token.value
    }
    if (token.type === 'boolean') {
      this.pos++
      return token.value === 'true'
    }
    if (token.type === 'null') {
      this.pos++
      return null
    }
    if (token.type === 'undefined') {
      this.pos++
      return undefined
    }

    // 标识符（变量引用）
    if (token.type === 'identifier') {
      this.pos++
      return this.resolveVariable(token.value)
    }

    return undefined
  }

  private resolveVariable(key: string): unknown {
    // 处理模板变量 {{...}}
    if (key.startsWith('{{') && key.endsWith('}}')) {
      const varPath = key.slice(2, -2).trim()
      return this.resolver(varPath)
    }
    return this.resolver(key)
  }

  private compare(left: unknown, op: string, right: unknown): boolean {
    // null/undefined 比较
    if (left === null || left === undefined || right === null || right === undefined) {
      if (op === '==') return left === right
      if (op === '!=') return left !== right
      return false
    }

    // 字符串比较
    if (typeof left === 'string' || typeof right === 'string') {
      const l = String(left)
      const r = String(right)
      switch (op) {
        case '==': return l === r
        case '!=': return l !== r
        case '>': return l > r
        case '<': return l < r
        case '>=': return l >= r
        case '<=': return l <= r
      }
    }

    // 数值比较
    const l = Number(left)
    const r = Number(right)
    if (Number.isNaN(l) || Number.isNaN(r)) return false

    switch (op) {
      case '==': return l === r
      case '!=': return l !== r
      case '>': return l > r
      case '<': return l < r
      case '>=': return l >= r
      case '<=': return l <= r
      default: return false
    }
  }

  private match(value: string): boolean {
    if (this.pos < this.tokens.length && this.tokens[this.pos].value === value) {
      this.pos++
      return true
    }
    return false
  }

  private expect(value: string): void {
    if (!this.match(value)) {
      throw new Error(`Expected "${value}" but got "${this.tokens[this.pos]?.value ?? 'EOF'}"`)
    }
  }
}

// ─── Condition Executor ────────────────────────────────────────────

/**
 * 条件节点执行器
 *
 * 支持的表达式语法：
 * - 比较：==, !=, >, <, >=, <=
 * - 逻辑：&&, ||, !
 * - 括号分组：(expr)
 * - 字面量：数字、字符串、boolean、null
 * - 变量引用：{{nodeId.output.field}}
 *
 * 输出：
 * - branch: 'true' | 'false' — 表示走哪个分支
 * - result: boolean — 条件评估结果
 */
export class ConditionNodeExecutor extends NodeExecutor {
  async execute(
    inputs: Record<string, unknown>,
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = inputs as unknown as ConditionNodeInputs
    const { condition, trueBranch, falseBranch } = config

    if (!condition) {
      return {
        success: false,
        error: 'Condition expression is required',
      }
    }

    context.log('info', `Evaluating condition: ${condition}`)

    try {
      // 评估条件表达式
      const result = this.evaluateExpression(condition, context.bus.resolveTemplate.bind(context.bus))

      // 确定分支
      const branch = result ? 'true' : 'false'
      const nextNodeId = result ? trueBranch : falseBranch

      context.log('info', `Condition result: ${result}, branch: ${branch}`)

      return {
        success: true,
        output: {
          branch,
          result: Boolean(result),
          nextNodeId: nextNodeId ?? null,
        },
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      context.log('error', `Condition evaluation failed: ${message}`)
      return {
        success: false,
        error: `Condition evaluation failed: ${message}`,
      }
    }
  }

  /**
   * 评估条件表达式
   */
  private evaluateExpression(expression: string, resolver: (key: string) => unknown): unknown {
    const tokenizer = new ExpressionTokenizer(expression)
    const tokens = tokenizer.tokenize()

    if (tokens.length === 0) {
      throw new Error('Empty expression')
    }

    const evaluator = new ExpressionEvaluator(tokens, resolver)
    return evaluator.evaluate()
  }
}
