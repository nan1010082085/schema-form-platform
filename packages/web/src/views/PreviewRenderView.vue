<script setup lang="ts">
/**
 * PreviewRenderView — 编辑器预览渲染器
 *
 * 通过 route.query.id 加载 Schema（不限定 published 状态），
 * 以纯 FormGrid 渲染，供编辑器预览使用。
 * 顶部显示"预览模式"提示横幅。
 */
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { FormGrid } from '@/components/FormGrid'
import { fetchSchemaById } from '@/utils/apiClient'
import { demoSchemas } from '@/schemas/demo'
import type { FormSchemaItem } from '@/components/FormGrid'

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
  } catch {
    // Fallback to demo registry for backward compat
    const demoEntry = demoSchemas[id]
    if (demoEntry) {
      schema.value = demoEntry.schema
      schemaName.value = demoEntry.title ?? demoEntry.name
    } else {
      error.value = `Schema "${id}" 未找到`
    }
  } finally {
    loading.value = false
  }
}

watch(schemaId, (id) => { if (id) loadSchema(id) }, { immediate: true })
</script>

<template>
  <div class="fg-preview-render">
    <!-- 预览模式横幅 -->
    <div v-if="schemaName" class="fg-preview-render__banner">
      <span class="fg-preview-render__banner-icon">&#9881;</span>
      <span>预览模式 — {{ schemaName }}</span>
      <span class="fg-preview-render__banner-hint">（草稿数据，非发布版本）</span>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="fg-preview-render__state">
      <el-icon class="is-loading" :size="24"><Loading /></el-icon>
      <span>加载中...</span>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="fg-preview-render__state fg-preview-render__state--error">
      <p>{{ error }}</p>
      <p class="fg-preview-render__error-hint">
        Demo ID: {{ Object.keys(demoSchemas).join(', ') }}
      </p>
    </div>

    <!-- 渲染区 -->
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

    &-icon {
      font-size: 16px;
    }

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

  &__error-hint {
    font-size: 13px;
    color: #999;
    margin-top: 8px;
  }

  &__body {
    padding: 24px;
  }
}
</style>
