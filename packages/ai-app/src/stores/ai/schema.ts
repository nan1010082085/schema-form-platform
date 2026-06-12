/**
 * Schema 状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Widget, SchemaDiff } from '@/types'

export const useSchemaStore = defineStore('ai-schema', () => {
  const currentSchema = ref<Widget[] | null>(null)
  const schemaHistory = ref<Widget[][]>([])
  const currentDiff = ref<SchemaDiff | null>(null)
  const schemaUpdateDescription = ref<string | null>(null)
  const currentBuildStep = ref<string | null>(null)

  const hasPreview = computed(() => currentSchema.value !== null && currentSchema.value.length > 0)
  const canUndoSchema = computed(() => schemaHistory.value.length > 0)

  function setCurrentSchema(schema: Widget[] | null) {
    if (currentSchema.value) {
      schemaHistory.value.push(JSON.parse(JSON.stringify(currentSchema.value)))
    }
    currentSchema.value = schema
  }

  function undoSchema() {
    if (schemaHistory.value.length > 0) {
      currentSchema.value = schemaHistory.value.pop()!
    }
  }

  function setDiff(diff: SchemaDiff | null) {
    currentDiff.value = diff
  }

  function setSchemaUpdateDescription(desc: string | null) {
    schemaUpdateDescription.value = desc
  }

  function setCurrentBuildStep(step: string | null) {
    currentBuildStep.value = step
  }

  function clearSchema() {
    currentSchema.value = null
    schemaHistory.value = []
    currentDiff.value = null
    schemaUpdateDescription.value = null
    currentBuildStep.value = null
  }

  return {
    currentSchema,
    schemaHistory,
    currentDiff,
    schemaUpdateDescription,
    currentBuildStep,
    hasPreview,
    canUndoSchema,
    setCurrentSchema,
    undoSchema,
    setDiff,
    setSchemaUpdateDescription,
    setCurrentBuildStep,
    clearSchema,
  }
})
