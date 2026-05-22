<script setup lang="ts">
/**
 * PreviewRenderView — 编辑器预览渲染器
 *
 * 通过 route.query.id 加载 Schema（草稿状态也可以预览），
 * 使用 FormGrid 渲染，供编辑器预览使用。
 */
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'
import { FormGrid } from '@/components/FormGrid'
import type { FormSchemaItem } from '@/components/FormGrid'
import { fetchSchemaById } from '@/utils/apiClient'

const route = useRoute()
const schemaId = computed(() => route.query.id as string)
const schema = ref<FormSchemaItem[]>([])
const schemaName = ref('')
const loading = ref(false)
const error = ref('')

async function loadSchema(id: string) {
  loading.value = true
  error.value = ''
  try {
    const result = await fetchSchemaById(id)
    schema.value = result.json
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
  <div class="fg-preview-render">
    <div v-if="schemaName" class="fg-preview-render__banner">
      <span>预览模式 — {{ schemaName }}</span>
      <span class="fg-preview-render__banner-hint">（草稿数据，非发布版本）</span>
    </div>

    <div v-if="loading" class="fg-preview-render__state">
      <el-icon class="is-loading" :size="24"><Loading /></el-icon>
      <span>加载中...</span>
    </div>

    <div v-else-if="error" class="fg-preview-render__state fg-preview-render__state--error">
      <p>{{ error }}</p>
    </div>

    <div v-else class="fg-preview-render__body">
      <FormGrid :schema="schema" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.fg-preview-render {
  min-height: 100vh;
  background: #f5f7fa;

  &__banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 24px;
    background: #fffbe6;
    border-bottom: 1px solid #ffe58f;
    font-size: 14px;
    color: #8c6d00;
    position: sticky;
    top: 0;
    z-index: 50;

    &-hint {
      font-size: 12px;
      color: #b0982c;
    }
  }

  &__state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    gap: 12px;
    color: #666;

    &--error {
      color: #e50113;
    }
  }

  &__body {
    padding: 24px;
  }
}
</style>
