/**
 * useCrossNodeData — composable for cross-node variable resolution.
 *
 * Fetches upstream node form data for a given task and provides
 * resolved initial values for the form, replacing {{nodeId.fieldName}}
 * template expressions with actual data from upstream completed tasks.
 */

import { ref, computed } from 'vue'
import { resolveCrossNodeValues } from '@schema-form/flow-shared'
import type { NodeFormDataMap } from '@schema-form/flow-shared'
import { flowApi } from '../api/flowApi.js'

export function useCrossNodeData() {
  const upstreamData = ref<NodeFormDataMap>({})
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch upstream node data for a given task.
   * Populates the upstreamData ref with nodeId -> formData mappings.
   */
  async function fetchUpstreamData(taskId: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await flowApi.getUpstreamNodeData(taskId)
      upstreamData.value = result.nodeData
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch upstream data'
      upstreamData.value = {}
    } finally {
      loading.value = false
    }
  }

  /**
   * Resolve cross-node template expressions in form values.
   * For string values containing {{nodeId.fieldPath}}, replaces with actual upstream data.
   * For missing data, replaces with empty string (not an error).
   */
  function resolveInitialValues(
    formDefaultValues?: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!formDefaultValues) return {}
    return resolveCrossNodeValues(formDefaultValues, upstreamData.value)
  }

  /**
   * Merge resolved cross-node values with existing task form data.
   * Existing task data takes priority (user's previous input overrides defaults).
   */
  function mergeWithTaskData(
    taskFormData?: Record<string, unknown>,
    formDefaultValues?: Record<string, unknown>,
  ): Record<string, unknown> {
    const resolved = resolveInitialValues(formDefaultValues)
    return { ...resolved, ...(taskFormData ?? {}) }
  }

  const hasUpstreamData = computed(() => Object.keys(upstreamData.value).length > 0)

  return {
    upstreamData,
    loading,
    error,
    hasUpstreamData,
    fetchUpstreamData,
    resolveInitialValues,
    mergeWithTaskData,
  }
}
