/**
 * useEventLog — 事件执行日志存储
 *
 * 全局单例，捕获 useLogger 输出供 UI 面板展示。
 */
import { ref, readonly } from 'vue'

export interface LogEntry {
  id: number
  time: string
  scope: string
  level: 'info' | 'warn' | 'error' | 'debug' | 'event' | 'rule' | 'api'
  message: string
}

const MAX_ENTRIES = 200
let _id = 0

const entries = ref<LogEntry[]>([])

export function useEventLog() {
  function push(scope: string, level: LogEntry['level'], args: unknown[]) {
    const message = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')
    entries.value.push({
      id: ++_id,
      time: new Date().toLocaleTimeString(),
      scope,
      level,
      message,
    })
    if (entries.value.length > MAX_ENTRIES) {
      entries.value.splice(0, entries.value.length - MAX_ENTRIES)
    }
  }

  function clear() {
    entries.value = []
  }

  return {
    entries: readonly(entries),
    push,
    clear,
  }
}
