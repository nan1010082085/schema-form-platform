<script setup lang="ts">
/**
 * PreviewRenderView — 编辑器预览渲染器
 *
 * 通过 route.query.id 加载 Schema（草稿状态也可以预览），
 * 使用 FormGrid 渲染，供编辑器预览使用。
 */
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { WidgetRenderer } from '@/components/WidgetRenderer'
import type { PartialWidget } from '@/widgets/base/types'
import { fetchSchemaById } from '@/utils/apiClient'
import { registerAllWidgets } from '@/widgets'
import styles from './PreviewRenderView.module.scss'
import AppIcon from '@schema-form/shared-components/common/AppIcon.vue'

registerAllWidgets()

const route = useRoute()
const schemaId = computed(() => route.query.id as string)
const schema = ref<PartialWidget[]>([])
const schemaName = ref('')
const loading = ref(false)
const error = ref('')

async function loadSchema(id: string) {
  loading.value = true
  error.value = ''
  try {
    const result = await fetchSchemaById(id)
    schema.value = Array.isArray(result.json) ? result.json : (result.json as any)?.widgets ?? []
    schemaName.value = result.name
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : `Schema "${id}" 未找到`
  } finally {
    loading.value = false
  }
}

watch(schemaId, (id) => { if (id) loadSchema(id) }, { immediate: true })
</script>

<template>
  <div :class="styles['fg-preview-render']">
    <div v-if="schemaName" :class="styles['fg-preview-render__banner']">
      <span>预览模式 — {{ schemaName }}</span>
      <span :class="styles['fg-preview-render__banner-hint']">（草稿数据，非发布版本）</span>
    </div>

    <div v-if="loading" :class="styles['fg-preview-render__state']">
      <AppIcon name="loading" :class="styles['loading-spinner']" :size="24" />
      <span>加载中...</span>
    </div>

    <div v-else-if="error" :class="[styles['fg-preview-render__state'], styles['fg-preview-render__state--error']]">
      <p>{{ error }}</p>
    </div>

    <div v-else :class="styles['fg-preview-render__body']">
      <WidgetRenderer :schema="schema" layout="absolute" />
    </div>
  </div>
</template>
