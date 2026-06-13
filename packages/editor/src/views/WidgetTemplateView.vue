<script setup lang="ts">
/**
 * WidgetTemplateView — 组件模板库
 *
 * 卡片网格展示模板，支持搜索、分类筛选、详情预览、一键插入画布。
 */
import { onMounted, ref } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import { SearchIcon, GridViewIcon, AddIcon, DeleteIcon, BrowseIcon, FileIcon, AppIcon, DesktopIcon } from 'tdesign-icons-vue-next'
import { useTemplateStore } from '@/stores/template'
import { useWidgetStore } from '@/stores/widget'
import { WidgetRenderer } from '@/components/WidgetRenderer'
import { registerAllWidgets } from '@/widgets'
import type { TemplateItem } from '@/utils/apiClient'
import type { PartialWidget } from '@/widgets/base/types'
import styles from './WidgetTemplateView.module.scss'

registerAllWidgets()

const templateStore = useTemplateStore()
const widgetStore = useWidgetStore()

// ---- 分类定义 ----
const CATEGORY_OPTIONS: { label: string; value: string }[] = [
  { label: '全部', value: '' },
  { label: '表单', value: 'form' },
  { label: '布局', value: 'layout' },
  { label: '表格', value: 'table' },
  { label: '搜索', value: 'search' },
  { label: '图表', value: 'chart' },
  { label: '业务', value: 'business' },
  { label: '报表', value: 'report' },
  { label: '其他', value: 'other' },
]

// ---- 搜索防抖 ----
const searchInput = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

function handleSearch(val: string) {
  searchInput.value = val
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    templateStore.setSearch(val)
    templateStore.loadTemplates()
  }, 300)
}

// ---- 分类筛选 ----
function handleCategoryChange(category: string) {
  templateStore.setCategory(category)
  templateStore.loadTemplates()
}

// ---- 分页 ----
function handlePageChange(page: number) {
  templateStore.setPage(page)
  templateStore.loadTemplates()
}

// ---- 详情预览 ----
type PreviewMode = 'render' | 'json'
const previewVisible = ref(false)
const previewTemplate = ref<TemplateItem | null>(null)
const previewJson = ref('')
const previewMode = ref<PreviewMode>('render')
const previewSchema = ref<PartialWidget[]>([])

function openPreview(template: TemplateItem) {
  previewTemplate.value = template
  previewJson.value = JSON.stringify(template.widgets, null, 2)
  previewSchema.value = template.widgets as unknown as PartialWidget[]
  previewMode.value = 'render'
  previewVisible.value = true
}

// ---- 插入画布 ----
async function applyToCanvas(template: TemplateItem) {
  try {
    const widgets = await templateStore.applyTemplateById(template.id)
    // 逐个添加 widget 到画布，补全 position
    let offsetX = 50
    let offsetY = 50
    for (const raw of widgets) {
      const w = raw as Record<string, unknown>
      if (!w.position) {
        w.position = { x: offsetX, y: offsetY, w: 300, h: 60, zIndex: 1 }
        offsetY += 80
      }
      widgetStore.addWidget(w as any)
    }
    MessagePlugin.success(`模板"${template.name}"已插入画布`)
  } catch {
    MessagePlugin.error('应用模板失败')
  }
}

// ---- 删除模板 ----
async function handleDelete(template: TemplateItem) {
  const confirmDia = DialogPlugin.confirm({
    header: '删除确认',
    body: `确定删除模板"${template.name}"吗？此操作不可撤销。`,
    theme: 'warning',
    confirmBtn: '确定删除',
    onConfirm: async () => {
      await templateStore.removeTemplate(template.id)
      MessagePlugin.success('模板已删除')
      confirmDia.hide()
    },
  })
}

// ---- 分类标签颜色 ----
const CATEGORY_TAG_THEME: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  form: 'default',
  layout: 'success',
  table: 'warning',
  search: 'default',
  chart: 'danger',
  business: 'default',
  report: 'success',
  other: 'default',
}

function getCategoryTagTheme(category: string): 'default' | 'success' | 'warning' | 'danger' {
  return CATEGORY_TAG_THEME[category] ?? 'default'
}

// ---- 分类中文名 ----
function getCategoryLabel(category: string): string {
  return CATEGORY_OPTIONS.find(c => c.value === category)?.label ?? category
}

// ---- 初始加载 ----
onMounted(() => {
  templateStore.loadTemplates()
})
</script>

<template>
  <div :class="styles.container">
    <!-- 顶栏：搜索 + 筛选 -->
    <div :class="styles.toolbar">
      <div :class="styles.toolbarLeft">
        <AppIcon :size="20" :class="styles.toolbarIcon" />
        <span :class="styles.toolbarTitle">组件模板库</span>
        <t-tag :class="styles.countTag" theme="default" size="small">
          {{ templateStore.total }} 个模板
        </t-tag>
      </div>
      <div :class="styles.toolbarRight">
        <t-input
          v-model="searchInput"
          placeholder="搜索模板名称或描述"
          clearable
          :class="styles.searchInput"
          @input="handleSearch"
        >
          <template #prefix-icon><SearchIcon /></template>
        </t-input>
      </div>
    </div>

    <!-- 分类标签栏 -->
    <div :class="styles.categoryBar">
      <div :class="styles.categoryList">
        <t-tag
          v-for="cat in CATEGORY_OPTIONS"
          :key="cat.value"
          :theme="templateStore.selectedCategory === cat.value ? 'primary' : 'default'"
          :variant="templateStore.selectedCategory === cat.value ? 'dark' : 'outline'"
          :class="styles.categoryTag"
          @click="handleCategoryChange(cat.value)"
        >
          {{ cat.label }}
        </t-tag>
      </div>
    </div>

    <!-- 内容区 -->
    <div :class="styles.content">
      <!-- 加载中 -->
      <div v-if="templateStore.loading" :class="styles.loadingState">
        <GridViewIcon :size="32" :class="styles.loadingIcon" />
        <span>加载中...</span>
      </div>

      <!-- 错误 -->
      <div v-else-if="templateStore.error" :class="styles.errorState">
        <span :class="styles.errorText">{{ templateStore.error }}</span>
        <t-button size="small" @click="templateStore.loadTemplates()">重试</t-button>
      </div>

      <!-- 空状态 -->
      <div v-else-if="templateStore.templates.length === 0" :class="styles.emptyState">
        <FileIcon :size="48" :class="styles.emptyIcon" />
        <p :class="styles.emptyText">暂无模板</p>
        <p :class="styles.emptyHint">尝试调整筛选条件或创建新模板</p>
      </div>

      <!-- 模板卡片网格 -->
      <div v-else :class="styles.cardGrid">
        <div
          v-for="tpl in templateStore.templates"
          :key="tpl.id"
          :class="styles.card"
        >
          <!-- 缩略图占位 -->
          <div :class="styles.cardThumb">
            <GridViewIcon :size="32" :class="styles.thumbIcon" />
            <t-tag
              :theme="getCategoryTagTheme(tpl.category)"
              :class="styles.cardCategory"
              size="small"
              variant="dark"
            >
              {{ getCategoryLabel(tpl.category) }}
            </t-tag>
          </div>

          <!-- 卡片内容 -->
          <div :class="styles.cardBody">
            <h3 :class="styles.cardTitle">{{ tpl.name }}</h3>
            <p :class="styles.cardDesc">{{ tpl.description || '暂无描述' }}</p>
            <div :class="styles.cardMeta">
              <span :class="styles.metaItem">
                <BrowseIcon :size="12" />
                {{ tpl.usageCount }} 次使用
              </span>
              <span v-if="tpl.isBuiltin" :class="styles.builtinBadge">内置</span>
            </div>
            <!-- 标签 -->
            <div v-if="tpl.tags.length > 0" :class="styles.tagList">
              <t-tag
                v-for="tag in tpl.tags"
                :key="tag"
                size="small"
                theme="default"
                variant="outline"
                :class="styles.tag"
              >
                {{ tag }}
              </t-tag>
            </div>
          </div>

          <!-- 卡片操作 -->
          <div :class="styles.cardActions">
            <t-button
              theme="primary"
              size="small"
              :class="styles.actionBtn"
              @click="applyToCanvas(tpl)"
            >
              <template #icon><AddIcon /></template>
              插入画布
            </t-button>
            <t-button
              size="small"
              :class="styles.actionBtn"
              @click="openPreview(tpl)"
            >
              <template #icon><FileIcon /></template>
              预览
            </t-button>
            <t-button
              v-if="!tpl.isBuiltin"
              theme="danger"
              size="small"
              :class="styles.actionBtn"
              @click="handleDelete(tpl)"
            >
              <template #icon><DeleteIcon /></template>
            </t-button>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="templateStore.totalPages > 1" :class="styles.pagination">
        <t-pagination
          :current="templateStore.page"
          :page-size="templateStore.pageSize"
          :total="templateStore.total"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 详情预览抽屉 -->
    <t-drawer
      v-model:visible="previewVisible"
      :header="previewTemplate?.name ?? '模板预览'"
      size="55%"
      placement="right"
    >
      <div v-if="previewTemplate" :class="styles.previewContent">
        <!-- 模式切换 -->
        <div :class="styles.previewModeBar">
          <t-radio-group v-model:value="previewMode" size="small">
            <t-radio-button value="render">
              <DesktopIcon :size="14" />
              渲染预览
            </t-radio-button>
            <t-radio-button value="json">
              <FileIcon :size="14" />
              JSON 源码
            </t-radio-button>
          </t-radio-group>
        </div>

        <!-- 模板基本信息 -->
        <div :class="styles.previewMeta">
          <div :class="styles.previewMetaRow">
            <span :class="styles.previewMetaLabel">分类</span>
            <t-tag :theme="getCategoryTagTheme(previewTemplate.category)" variant="outline" size="small">
              {{ getCategoryLabel(previewTemplate.category) }}
            </t-tag>
          </div>
          <div :class="styles.previewMetaRow">
            <span :class="styles.previewMetaLabel">统计</span>
            <span :class="styles.previewMetaValue">
              使用 {{ previewTemplate.usageCount }} 次 · 包含 {{ previewTemplate.widgets.length }} 个组件
            </span>
          </div>
          <div v-if="previewTemplate.description" :class="styles.previewMetaRow">
            <span :class="styles.previewMetaLabel">描述</span>
            <span :class="styles.previewMetaValue">{{ previewTemplate.description }}</span>
          </div>
          <div v-if="previewTemplate.tags.length > 0" :class="styles.previewMetaRow">
            <span :class="styles.previewMetaLabel">标签</span>
            <div :class="styles.previewTagList">
              <t-tag
                v-for="tag in previewTemplate.tags"
                :key="tag"
                size="small"
                theme="default"
                variant="outline"
              >
                {{ tag }}
              </t-tag>
            </div>
          </div>
        </div>

        <!-- 渲染预览 -->
        <div v-if="previewMode === 'render'" :class="styles.previewRenderArea">
          <WidgetRenderer :schema="previewSchema" />
        </div>

        <!-- JSON 源码 -->
        <pre v-else :class="styles.schemaCode"><code>{{ previewJson }}</code></pre>

        <div :class="styles.previewActions">
          <t-button theme="primary" @click="applyToCanvas(previewTemplate!)">
            <template #icon><AddIcon /></template>
            插入画布
          </t-button>
        </div>
      </div>
    </t-drawer>
  </div>
</template>
