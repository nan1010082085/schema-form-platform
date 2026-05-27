/**
 * useModeControl — Editor mode (edit/preview) management
 *
 * Controls the editor's interaction mode toggle and triggers
 * schema API processing when entering non-edit modes (preview, publish-interactive, publish-readonly).
 */
import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { PartialWidget } from '@/components/WidgetRenderer/types'
import type { InteractionMode } from '@/composables/useConstant'
import { processSchema } from '@/utils/requestQueue'

export interface UseModeControlOptions {
  schema: Ref<PartialWidget[]>
  currentSchemaId: Ref<string | null>
}

export interface UseModeControlReturn {
  mode: Ref<InteractionMode>
  handlePreview: () => void
}

export function useModeControl(options: UseModeControlOptions): UseModeControlReturn {
  const { schema, currentSchemaId } = options

  const mode = ref<InteractionMode>('edit')

  // Process schema API tasks when entering any non-edit mode
  watch(mode, async (newMode) => {
    if (newMode !== 'edit' && schema.value.length > 0) {
      await processSchema(schema.value)
    }
  })

  function handlePreview() {
    if (currentSchemaId.value) {
      window.open(`/preview?id=${currentSchemaId.value}`, '_blank')
    }
  }

  return { mode, handlePreview }
}
