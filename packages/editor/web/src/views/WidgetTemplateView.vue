<script setup lang="ts">
/**
 * WidgetTemplateView — 组件模板库
 *
 * 卡片网格展示模板，支持搜索、分类筛选、详情预览、一键插入画布。
 */
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Grid, Plus, Delete, View, Document, Collection, Monitor, Memo } from '@element-plus/icons-vue'
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
    ElMessage.success(`模板"${template.name}"已插入画布`)
  } catch {
    ElMessage.error('应用模板失败')
  }
}

// ---- 删除模板 ----
async function handleDelete(template: TemplateItem) {
  try {
    await ElMessageBox.confirm(
      `确定删除模板"${template.name}"吗？此操作不可撤销。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '确定删除', cancelButtonText: '取消' },
    )
    await templateStore.removeTemplate(template.id)
    ElMessage.success('模板已删除')
  } catch {
    // 用户取消
  }
}

// ---- 分类标签颜色 ----
const CATEGORY_TAG_TYPE: Record<string, string> = {
  form: '',
  layout: 'success',
  table: 'warning',
  search: 'info',
  chart: 'danger',
  business: '',
  report: 'success',
  other: 'info',
}

function getCategoryTagType(category: string): string {
  return CATEGORY_TAG_TYPE[category] ?? 'info'
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
        <el-icon :size="20" :class="styles.toolbarIcon"><Collection /></el-icon>
        <span :class="styles.toolbarTitle">组件模板库</span>
        <el-tag :class="styles.countTag" type="info" size="small">
          {{ templateStore.total }} 个模板
        </el-tag>
      </div>
      <div :class="styles.toolbarRight">
        <el-input
          v-model="searchInput"
          placeholder="搜索模板名称或描述"
          :prefix-icon="Search"
          clearable
          :class="styles.searchInput"
          @input="handleSearch"
        />
      </div>
    </div>

    <!-- 分类标签栏 -->
    <div :class="styles.categoryBar">
      <el-scrollbar>
        <div :class="styles.categoryList">
          <el-tag
            v-for="cat in CATEGORY_OPTIONS"
            :key="cat.value"
            :type="(templateStore.selectedCategory === cat.value ? 'primary' : 'info') as any"
            :effect="templateStore.selectedCategory === cat.value ? 'dark' : 'plain'"
            :class="styles.categoryTag"
            @click="handleCategoryChange(cat.value)"
          >
            {{ cat.label }}
          </el-tag>
        </div>
      </el-scrollbar>
    </div>

    <!-- 内容区 -->
    <div :class="styles.content">
      <el-scrollbar>
        <!-- 加载中 -->
        <div v-if="templateStore.loading" :class="styles.loadingState">
          <el-icon :size="32" :class="styles.loadingIcon"><Grid /></el-icon>
          <span>加载中...</span>
        </div>

        <!-- 错误 -->
        <div v-else-if="templateStore.error" :class="styles.errorState">
          <span :class="styles.errorText">{{ templateStore.error }}</span>
          <el-button size="small" @click="templateStore.loadTemplates()">重试</el-button>
        </div>

        <!-- 空状态 -->
        <div v-else-if="templateStore.templates.length === 0" :class="styles.emptyState">
          <el-icon :size="48" :class="styles.emptyIcon"><Document /></el-icon>
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
              <el-icon :size="32" :class="styles.thumbIcon"><Grid /></el-icon>
              <el-tag
                :type="getCategoryTagType(tpl.category) as any"
                :class="styles.cardCategory"
                size="small"
                effect="dark"
              >
                {{ getCategoryLabel(tpl.category) }}
              </el-tag>
            </div>

            <!-- 卡片内容 -->
            <div :class="styles.cardBody">
              <h3 :class="styles.cardTitle">{{ tpl.name }}</h3>
              <p :class="styles.cardDesc">{{ tpl.description || '暂无描述' }}</p>
              <div :class="styles.cardMeta">
                <span :class="styles.metaItem">
                  <el-icon :size="12"><View /></el-icon>
                  {{ tpl.usageCount }} 次使用
                </span>
                <span v-if="tpl.isBuiltin" :class="styles.builtinBadge">内置</span>
              </div>
              <!-- 标签 -->
              <div v-if="tpl.tags.length > 0" :class="styles.tagList">
                <el-tag
                  v-for="tag in tpl.tags"
                  :key="tag"
                  size="small"
                  type="info"
                  effect="plain"
                  :class="styles.tag"
                >
                  {{ tag }}
                </el-tag>
              </div>
            </div>

            <!-- 卡片操作 -->
            <div :class="styles.cardActions">
              <el-button
                type="primary"
                size="small"
                :class="styles.actionBtn"
                @click="applyToCanvas(tpl)"
              >
                <el-icon><Plus /></el-icon>
                插入画布
              </el-button>
              <el-button
                size="small"
                :class="styles.actionBtn"
                @click="openPreview(tpl)"
              >
                <el-icon><Document /></el-icon>
                预览
              </el-button>
              <el-button
                v-if="!tpl.isBuiltin"
                type="danger"
                size="small"
                :class="styles.actionBtn"
                @click="handleDelete(tpl)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="templateStore.totalPages > 1" :class="styles.pagination">
          <el-pagination
            :current-page="templateStore.page"
            :page-size="templateStore.pageSize"
            :total="templateStore.total"
            layout="prev, pager, next"
            @current-change="handlePageChange"
          />
        </div>
      </el-scrollbar>
    </div>

    <!-- 详情预览抽屉 -->
    <el-drawer
      v-model="previewVisible"
      :title="previewTemplate?.name ?? '模板预览'"
      size="55%"
      direction="rtl"
    >
      <div v-if="previewTemplate" :class="styles.previewContent">
        <!-- 模式切换 -->
        <div :class="styles.previewModeBar">
          <el-radio-group v-model="previewMode" size="small">
            <el-radio-button value="render">
              <el-icon :size="14"><Monitor /></el-icon>
              渲染预览
            </el-radio-button>
            <el-radio-button value="json">
              <el-icon :size="14"><Memo /></el-icon>
              JSON 源码
            </el-radio-button>
          </el-radio-group>
        </div>

        <!-- 模板基本信息 -->
        <div :class="styles.previewMeta">
          <div :class="styles.previewMetaRow">
            <span :class="styles.previewMetaLabel">分类</span>
            <el-tag :type="getCategoryTagType(previewTemplate.category) as any" effect="plain" size="small">
              {{ getCategoryLabel(previewTemplate.category) }}
            </el-tag>
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
              <el-tag
                v-for="tag in previewTemplate.tags"
                :key="tag"
                size="small"
                type="info"
                effect="plain"
              >
                {{ tag }}
              </el-tag>
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
          <el-button type="primary" @click="applyToCanvas(previewTemplate!)">
            <el-icon><Plus /></el-icon>
            插入画布
          </el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>
