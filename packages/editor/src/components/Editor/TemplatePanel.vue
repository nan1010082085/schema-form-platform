<script setup lang="ts">
/**
 * TemplatePanel — 左侧模板面板
 *
 * 展示组件模板库，支持搜索/分类筛选。
 * 模板卡片可拖拽到画布（通过 dataTransfer 传递模板 ID）。
 * 支持应用模板和删除操作。
 */
import { ref, watch } from 'vue'
import { SearchIcon } from 'tdesign-icons-vue-next'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import { fetchTemplates, deleteTemplate } from '@/utils/apiClient'
import type { TemplateItem as WidgetTemplateItem, TemplateCategory } from '@/utils/apiClient'
import type { PaginatedResponse } from '@/types/api'
import styles from './TemplatePanel.module.scss'

const emit = defineEmits<{
  apply: [template: WidgetTemplateItem]
}>()

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  form: '表单',
  layout: '布局',
  table: '表格',
  search: '搜索',
  chart: '图表',
  business: '业务',
  report: '报表',
  other: '其他',
}

const searchQuery = ref('')
const categoryFilter = ref<TemplateCategory | ''>('')
const loading = ref(false)
const items = ref<WidgetTemplateItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

async function loadTemplates() {
  loading.value = true
  try {
    const res: PaginatedResponse<WidgetTemplateItem> = await fetchTemplates({
      search: searchQuery.value || undefined,
      category: categoryFilter.value || undefined,
      page: page.value,
      pageSize: pageSize.value,
    })
    items.value = res.items
    total.value = res.total
  } catch (err) {
    MessagePlugin.error(err instanceof Error ? err.message : '加载模板失败')
  } finally {
    loading.value = false
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function debouncedLoad() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    page.value = 1
    loadTemplates()
  }, 300)
}

watch(searchQuery, debouncedLoad)
watch(categoryFilter, () => {
  page.value = 1
  loadTemplates()
})

// 初始加载
loadTemplates()

function handleDragStart(event: DragEvent, template: WidgetTemplateItem) {
  event.dataTransfer?.setData('template-id', template.id)
  event.dataTransfer?.setData('application/schema-drag', JSON.stringify({
    source: 'template',
    templateId: template.id,
  }))
  event.dataTransfer!.effectAllowed = 'copy'
}

function handleApply(template: WidgetTemplateItem) {
  emit('apply', template)
}

async function handleDelete(template: WidgetTemplateItem) {
  try {
    await new Promise<boolean>((resolve) => {
      const dialog = DialogPlugin.confirm({
        header: '删除确认',
        body: `确定删除模板「${template.name}」？`,
        theme: 'warning',
        confirmBtn: '确定',
        cancelBtn: '取消',
        onConfirm: () => { resolve(true); dialog.destroy() },
        onClose: () => { resolve(false); dialog.destroy() },
      })
    })
    await deleteTemplate(template.id)
    MessagePlugin.success('模板已删除')
    loadTemplates()
  } catch {
    // 用户取消
  }
}

function handlePageChange(newPage: number) {
  page.value = newPage
  loadTemplates()
}

const totalPages = ref(0)
watch(() => total.value, (v) => {
  totalPages.value = Math.ceil(v / pageSize.value)
})

defineExpose({ loadTemplates })
</script>

<template>
  <div :class="styles.panel">
    <!-- 搜索和筛选 -->
    <div :class="styles.toolbar">
      <t-input
        v-model="searchQuery"
        :class="styles.search"
        size="small"
        placeholder="搜索模板..."
        clearable
      >
        <template #prefix-icon>
          <SearchIcon />
        </template>
      </t-input>
      <t-select
        v-model="categoryFilter"
        :class="styles.categorySelect"
        size="small"
        placeholder="分类"
        clearable
      >
        <t-option
          v-for="(label, key) in CATEGORY_LABELS"
          :key="key"
          :label="label"
          :value="key"
        />
      </t-select>
    </div>

    <!-- 模板列表 -->
    <t-loading :loading="loading" :class="styles.scroll">
      <div :class="styles.grid">
        <div
          v-for="template in items"
          :key="template.id"
          :class="styles.card"
          draggable="true"
          @dragstart="handleDragStart($event, template)"
        >
          <!-- 缩略图 -->
          <div :class="styles.thumbnail">
            <img v-if="template.thumbnail" :src="template.thumbnail" :alt="template.name" />
            <span v-else :class="styles.placeholder">无预览</span>
          </div>

          <!-- 信息 -->
          <div :class="styles.info">
            <div :class="styles.name">{{ template.name }}</div>
            <div :class="styles.meta">
              <span :class="styles.category">{{ CATEGORY_LABELS[template.category] ?? '其他' }}</span>
              <span v-if="template.isBuiltin" :class="styles.builtin">内置</span>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div :class="styles.actions">
            <button :class="[styles.actionBtn, styles['actionBtn--apply']]" @click.stop="handleApply(template)">应用</button>
            <button
              v-if="!template.isBuiltin"
              :class="[styles.actionBtn, styles['actionBtn--delete']]"
              @click.stop="handleDelete(template)"
            >删除</button>
          </div>
        </div>
      </div>

      <div v-if="items.length === 0 && !loading" :class="styles.empty">
        暂无模板
      </div>
    </t-loading>

    <!-- 分页 -->
    <div v-if="totalPages > 1" :class="styles.pagination">
      <t-pagination
        size="small"
        :total="total"
        :page-size="pageSize"
        :current="page"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>
