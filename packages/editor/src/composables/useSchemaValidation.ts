/**
 * useSchemaValidation — 预览时触发 Schema 校验
 *
 * 非阻断式：校验结果以通知形式展示，不阻塞主流程。
 * 在进入预览模式时自动执行全量校验。
 */
import { ref, watch } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useWidgetStore } from '@/stores/widget'
import { validateSchema, type ValidationError, type ValidationResult } from '@/utils/schemaValidate'

export function useSchemaValidation() {
  const editorStore = useEditorStore()
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

  // 进入预览模式时自动校验
  watch(
    () => editorStore.mode,
    (mode) => {
      if (mode === 'preview') {
        runValidation()
      }
    },
  )

  return {
    issues,
    lastResult,
    errorCount,
    warningCount,
    validatedAt,
    runValidation,
  }
}
