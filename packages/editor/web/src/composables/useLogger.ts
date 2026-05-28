const COLORS = {
  info: '',
  warn: '',
  error: '',
  debug: '',
  event: 'color: #409eff; font-weight: bold',
  rule: 'color: #9c27b0; font-weight: bold',
  api: 'color: #67c23a; font-weight: bold',
} as const

// 日志收集器 — 供 UI 面板消费
type LogCollector = (scope: string, level: 'event' | 'rule' | 'api', args: unknown[]) => void
let _collector: LogCollector | null = null

export function setLogCollector(fn: LogCollector) {
  _collector = fn
}

export function useLogger(scope: string) {
  const isDev = import.meta.env.DEV

  const LEVEL_MAP = { info: 'log', warn: 'warn', error: 'error', debug: 'debug' } as const

  function log(level: 'info' | 'warn' | 'error' | 'debug', color: string, ...args: unknown[]) {
    if (!isDev) return
    const prefix = `[${scope}]`
    const method = LEVEL_MAP[level]
    if (color) {
      console[method](`%c${prefix}`, color, ...args)
    } else {
      console[method](prefix, ...args)
    }
  }

  function logAndCollect(level: 'event' | 'rule' | 'api', color: string, ...args: unknown[]) {
    log('info', color, ...args)
    _collector?.(scope, level, args)
  }

  return {
    info: (...args: unknown[]) => log('info', '', ...args),
    warn: (...args: unknown[]) => log('warn', '', ...args),
    error: (...args: unknown[]) => log('error', '', ...args),
    debug: (...args: unknown[]) => log('debug', '', ...args),
    event: (...args: unknown[]) => logAndCollect('event', COLORS.event, ...args),
    rule: (...args: unknown[]) => logAndCollect('rule', COLORS.rule, ...args),
    api: (...args: unknown[]) => logAndCollect('api', COLORS.api, ...args),
  }
}
