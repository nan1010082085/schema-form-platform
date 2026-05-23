/**
 * 字段联动 composable
 * 支持 visible / disabled / required / options 四种联动类型
 *
 * 设计要点：
 * 1. 递归遍历 schema 收集所有带 linkages 的节点
 * 2. 按 watchFields 建立依赖图，批量合并 watch
 * 3. condition 支持函数和字符串表达式两种模式
 * 4. DFS 检测循环依赖，发现后降级处理
 */
import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'
import type {
  PartialWidget,
  FormData,
  FormFieldValue,
  SchemaLinkage,
  LinkageState,
} from '@/components/WidgetRenderer/types'
import { useLogger } from '@/composables/useLogger'
import { checkSecurity } from '@/utils/expression'

const logger = useLogger('Linkage')

/** 收集到的联动节点信息 */
interface LinkageEntry {
  /** 字段名（schema.field） */
  field: string
  /** 该字段的所有联动配置 */
  linkages: SchemaLinkage[]
}

/** 依赖图：field -> 它所依赖的 watchFields 集合 */
type DependencyGraph = Map<string, Set<string>>

/**
 * 递归遍历 schema 树，收集所有带 linkages 的节点
 */
function collectLinkageEntries(schema: PartialWidget[]): LinkageEntry[] {
  const entries: LinkageEntry[] = []

  function walk(items: PartialWidget[]) {
    for (const item of items) {
      if (item.field && item.linkages?.length) {
        entries.push({ field: item.field, linkages: item.linkages })
      }
      if (item.children) {
        walk(item.children)
      }
    }
  }

  walk(schema)
  return entries
}

/**
 * 构建依赖图
 * key: 联动字段, value: 它所监听的字段集合
 */
function buildDependencyGraph(entries: LinkageEntry[]): DependencyGraph {
  const graph: DependencyGraph = new Map()

  for (const entry of entries) {
    const deps = new Set<string>()
    for (const linkage of entry.linkages) {
      for (const watchField of linkage.watchFields) {
        deps.add(watchField)
      }
    }
    graph.set(entry.field, deps)
  }

  return graph
}

/**
 * DFS 检测循环依赖
 * 返回所有存在循环的字段集合
 */
function detectCycles(graph: DependencyGraph): Set<string> {
  const cyclicFields = new Set<string>()
  const visited = new Set<string>()
  const inStack = new Set<string>()

  function dfs(field: string): boolean {
    if (inStack.has(field)) return true
    if (visited.has(field)) return false

    visited.add(field)
    inStack.add(field)

    const deps = graph.get(field)
    if (deps) {
      for (const dep of deps) {
        // 只有当 dep 也在图中（也是联动字段）时才需要检测
        if (graph.has(dep) && dfs(dep)) {
          cyclicFields.add(field)
          cyclicFields.add(dep)
        }
      }
    }

    inStack.delete(field)
    return false
  }

  for (const field of graph.keys()) {
    if (!visited.has(field)) {
      dfs(field)
    }
  }

  return cyclicFields
}

/**
 * 编译字符串表达式为求值函数
 * 沙箱限制：仅允许访问 values、variables、exposed 对象的属性
 */
function compileCondition(expression: string): (values: Record<string, FormFieldValue>, variables?: Record<string, unknown>, exposed?: Record<string, Record<string, unknown>>) => boolean {
  // 安全检查：阻止危险表达式（与 eventEngine 共享 blocklist）
  const securityError = checkSecurity(expression)
  if (securityError) {
    logger.warn(`Blocked unsafe expression: ${expression} (${securityError})`)
    return () => false
  }

  try {
    // 使用 new Function 创建沙箱函数，注入 values、variables、exposed 参数
    const fn = new Function('values', 'variables', 'exposed', `"use strict"; return (${expression});`)
    return (values: Record<string, FormFieldValue>, variables?: Record<string, unknown>, exposed?: Record<string, Record<string, unknown>>): boolean => {
      try {
        return Boolean(fn(values, variables ?? {}, exposed ?? {}))
      } catch {
        logger.rule(`条件表达式求值失败: "${expression}"`)
        return false
      }
    }
  } catch {
    logger.rule(`条件表达式编译失败: "${expression}"`)
    return () => false
  }
}

/**
 * 对单个联动配置求值
 */
function evaluateCondition(
  linkage: SchemaLinkage,
  formData: FormData,
  variables?: Record<string, unknown>,
  exposed?: Record<string, Record<string, unknown>>,
): boolean {
  const values: Record<string, FormFieldValue> = {}
  for (const field of linkage.watchFields) {
    values[field] = formData[field]
  }

  if (typeof linkage.condition === 'function') {
    try {
      return linkage.condition(values)
    } catch {
      logger.rule(`条件函数求值失败`)
      return false
    }
  }

  return compileCondition(linkage.condition)(values, variables, exposed)
}

/**
 * 默认联动状态
 */
const DEFAULT_STATE: LinkageState = {
  visible: true,
  disabled: false,
  required: false,
}

/**
 * useLinkage composable
 *
 * @param schema - 表单 schema 定义
 * @param formData - 响应式表单数据（reactive 对象、ref 或 getter）
 * @param variables - 可选的变量上下文（供条件表达式使用）
 * @param exposed - 可选的组件暴露值上下文（供条件表达式使用）
 * @returns stateMap - 所有联动字段的状态映射
 */
export function useLinkage(
  schema: PartialWidget[],
  formData: MaybeRefOrGetter<FormData>,
  variables?: MaybeRefOrGetter<Record<string, unknown>>,
  exposed?: MaybeRefOrGetter<Record<string, Record<string, unknown>>>,
): { stateMap: ComputedRef<Map<string, LinkageState>> } {
  // 收集所有联动节点（静态，不依赖 formData）
  const entries = computed(() => collectLinkageEntries(schema))

  // 构建依赖图
  const dependencyGraph = computed(() => buildDependencyGraph(entries.value))

  // 检测循环依赖
  const cyclicFields = computed(() => detectCycles(dependencyGraph.value))

  // 计算联动状态映射
  // 通过在 computed 内部读取 formData[watchField] 建立响应式依赖
  // 当任何 watchField 的值变化时，此 computed 会自动重算
  const stateMap = computed<Map<string, LinkageState>>(() => {
    const currentFormData = toValue(formData)
    const currentVariables = variables ? toValue(variables) : undefined
    const currentExposed = exposed ? toValue(exposed) : undefined
    const currentEntries = entries.value
    const cyclic = cyclicFields.value
    const map = new Map<string, LinkageState>()

    for (const entry of currentEntries) {
      // 循环依赖的字段降级为默认状态
      if (cyclic.has(entry.field)) {
        map.set(entry.field, { ...DEFAULT_STATE })
        continue
      }

      const state: LinkageState = { ...DEFAULT_STATE }

      for (const linkage of entry.linkages) {
        // 读取 watchFields 建立响应式依赖
        for (const watchField of linkage.watchFields) {
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          currentFormData[watchField]
        }

        const result = evaluateCondition(linkage, currentFormData, currentVariables, currentExposed)

        switch (linkage.type) {
          case 'visible':
            state.visible = result
            if (!result && linkage.elseValue !== undefined) {
              state.elseValue = linkage.elseValue
            }
            break
          case 'disabled':
            state.disabled = result
            break
          case 'required':
            state.required = result
            break
          case 'options':
            if (result) {
              if (linkage.thenOptions) {
                state.options = linkage.thenOptions
              }
              if (linkage.thenApi) {
                state.optionsApi = linkage.thenApi
              }
            } else if (linkage.elseValue !== undefined) {
              state.elseValue = linkage.elseValue
            }
            break
          case 'set-value':
            if (result) {
              if (linkage.valueSource) {
                state.targetValue = currentFormData[linkage.valueSource]
              } else if (linkage.thenValue !== undefined) {
                state.targetValue = linkage.thenValue
              }
            } else if (linkage.elseValue !== undefined) {
              state.elseValue = linkage.elseValue
            }
            break
          case 'reset-fields':
            if (result && linkage.targetFields?.length) {
              state.resetFields = [...linkage.targetFields]
            } else {
              state.resetFields = undefined
            }
            break
        }
      }

      map.set(entry.field, state)
    }

    return map
  })

  return { stateMap }
}
