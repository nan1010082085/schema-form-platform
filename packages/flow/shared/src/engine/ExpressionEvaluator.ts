const BLOCKED_PATTERNS = [
  /\bimport\b/, /\brequire\b/, /\beval\b/, /\bFunction\b/,
  /\bexec\b/, /\bexecFile\b/, /\bspawn\b/, /\bfetch\b/,
  /\bXMLHttpRequest\b/, /\bWebSocket\b/, /\bprocess\b/,
  /\bglobalThis\b/, /\bglobal\b/, /\bwindow\b/, /\bdocument\b/,
  /\blocation\b/, /\bnavigator\b/,
]

const MAX_EXPRESSION_LENGTH = 500

export class ExpressionEvaluationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExpressionEvaluationError'
  }
}

export function evaluateExpression(
  expression: string,
  variables: Record<string, unknown>,
): boolean {
  if (!expression || expression.trim().length === 0) return true

  if (expression.length > MAX_EXPRESSION_LENGTH) {
    throw new ExpressionEvaluationError(`条件表达式超过最大长度限制 (${MAX_EXPRESSION_LENGTH} 字符)`)
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(expression)) {
      throw new ExpressionEvaluationError(`条件表达式包含不允许的语法: ${pattern.source}`)
    }
  }

  try {
    const keys = Object.keys(variables)
    const values = keys.map((k) => variables[k])
    const fn = new Function(...keys, `return (${expression})`)
    return Boolean(fn(...values))
  } catch (err) {
    throw new ExpressionEvaluationError(
      `条件表达式求值失败: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}
