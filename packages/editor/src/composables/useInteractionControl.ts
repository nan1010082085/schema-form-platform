/**
 * useInteractionControl — Preview device mode and readonly state
 *
 * Manages the preview device preset (desktop/tablet/mobile) and
 * readonly flag for publish-readonly scenarios.
 */
import { ref } from 'vue'
import type { Ref } from 'vue'

export interface UseInteractionControlReturn {
  previewMode: Ref<'desktop' | 'tablet' | 'mobile'>
  isReadonly: Ref<boolean>
}

export function useInteractionControl(): UseInteractionControlReturn {
  const previewMode = ref<'desktop' | 'tablet' | 'mobile'>('desktop')
  const isReadonly = ref(false)

  return { previewMode, isReadonly }
}
