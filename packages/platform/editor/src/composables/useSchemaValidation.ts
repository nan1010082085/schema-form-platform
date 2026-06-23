/**
 * useSchemaValidation — 手动触发 Schema 校验
 *
 * 非阻断式：校验结果以 popover 形式展示，不阻塞主流程。
 * 通过按钮手动触发，不自动执行。
 */
import { ref } from 'vue'
import { useWidgetStore } from '@/stores/widget'
import { validateSchema, type ValidationError, type ValidationResult } from '@/utils/schemaValidate'

export function useSchemaValidation() {
  const widgetStore = useWidgetStore()

  const issues = ref<ValidationError[]>([])
  const lastResult = ref<ValidationResult | null>(null)
  const validatedAt = ref<number>(0)
  const errorCount = ref(0)
  const warningCount = ref(0)

  function runValidation(): ValidationResult {
    const schema = widgetStore.widgets
    const result = validateSchema(schema as any)
    lastResult.value = result
    issues.value = result.errors
    errorCount.value = result.errors.filter(e => e.severity === 'error').length
    warningCount.value = result.errors.filter(e => e.severity === 'warning').length
    validatedAt.value = Date.now()
    return result
  }

  function clearValidation() {
    issues.value = []
    lastResult.value = null
    errorCount.value = 0
    warningCount.value = 0
    validatedAt.value = 0
  }

  return {
    issues,
    lastResult,
    errorCount,
    warningCount,
    validatedAt,
    runValidation,
    clearValidation,
  }
}
