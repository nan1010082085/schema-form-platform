<script setup lang="ts">
/**
 * WidgetTemplatePanel — 组件模板库面板
 *
 * 功能：
 * - 模板列表展示（卡片布局）
 * - 模板搜索和筛选（分类、关键词）
 * - 模板应用（点击应用到画布）
 * - 模板保存（从画布保存为模板）
 */
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Delete } from '@element-plus/icons-vue'
import {
  fetchTemplates,
  applyTemplate,
  createTemplate,
  deleteTemplate,
} from '@/utils/apiClient'
import type { TemplateItem, TemplateCategory } from '@/utils/apiClient'
import type { Widget } from '@/widgets/base/types'
import styles from './WidgetTemplatePanel.module.css'

const emit = defineEmits<{
  'apply-template': [widgets: Record<string, unknown>[]]
}>()

const props = defineProps<{
  currentWidgets?: Widget[]
}>()

// ---- Category options ----

const categoryOptions: Array<{ label: string; value: string }> = [
  { label: '全部分类', value: '' },
  { label: '表单', value: 'form' },
  { label: '布局', value: 'layout' },
  { label: '表格', value: 'table' },
  { label: '搜索', value: 'search' },
  { label: '图表', value: 'chart' },
  { label: '业务', value: 'business' },
  { label: '报表', value: 'report' },
  { label: '其他', value: 'other' },
]

const categoryLabelMap: Record<string, string> = {
  form: '表单',
  layout: '布局',
  table: '表格',
  search: '搜索',
  chart: '图表',
  business: '业务',
  report: '报表',
  other: '其他',
}

// ---- List state ----

const loading = ref(false)
const templates = ref<TemplateItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20

const searchKeyword = ref('')
const selectedCategory = ref('')

// ---- Load templates ----

async function loadTemplates() {
  loading.value = true
  try {
    const res = await fetchTemplates({
      search: searchKeyword.value || undefined,
      category: selectedCategory.value || undefined,
      page: page.value,
      pageSize,
    })
    templates.value = res.items
    total.value = res.total
  } catch (err) {
    ElMessage.error('加载模板失败')
    templates.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout> | null = null

function handleSearchChange() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    loadTemplates()
  }, 300)
}

function handleCategoryChange() {
  page.value = 1
  loadTemplates()
}

function handlePageChange(newPage: number) {
  page.value = newPage
  loadTemplates()
}

// ---- Apply template ----

async function handleApply(template: TemplateItem) {
  try {
    await ElMessageBox.confirm(
      `确认应用模板「${template.name}」？模板内容将添加到画布。`,
      '应用模板',
      { confirmButtonText: '应用', cancelButtonText: '取消', type: 'info' },
    )
  } catch {
    return
  }

  try {
    const result = await applyTemplate(template.id)
    emit('apply-template', result.widgets)
    ElMessage.success(`已应用模板「${template.name}」`)
    loadTemplates()
  } catch {
    ElMessage.error('应用模板失败')
  }
}

// ---- Delete template ----

async function handleDelete(template: TemplateItem) {
  try {
    await ElMessageBox.confirm(
      `确认删除模板「${template.name}」？此操作不可撤销。`,
      '删除模板',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }

  try {
    await deleteTemplate(template.id)
    ElMessage.success('已删除模板')
    loadTemplates()
  } catch {
    ElMessage.error('删除模板失败')
  }
}

// ---- Save as template ----

const showSaveDialog = ref(false)
const saveForm = ref({
  name: '',
  description: '',
  category: 'other' as TemplateCategory,
  tags: [] as string[],
})
const tagInput = ref('')

function openSaveDialog() {
  saveForm.value = {
    name: '',
    description: '',
    category: 'other',
    tags: [],
  }
  tagInput.value = ''
  showSaveDialog.value = true
}

function addTag() {
  const tag = tagInput.value.trim()
  if (tag && !saveForm.value.tags.includes(tag)) {
    saveForm.value.tags.push(tag)
  }
  tagInput.value = ''
}

function removeTag(index: number) {
  saveForm.value.tags.splice(index, 1)
}

async function handleSaveTemplate() {
  if (!saveForm.value.name.trim()) {
    ElMessage.warning('请输入模板名称')
    return
  }
  if (!props.currentWidgets || props.currentWidgets.length === 0) {
    ElMessage.warning('画布为空，无法保存模板')
    return
  }

  try {
    await createTemplate({
      name: saveForm.value.name.trim(),
      description: saveForm.value.description,
      category: saveForm.value.category,
      widgets: props.currentWidgets as unknown as Record<string, unknown>[],
      tags: saveForm.value.tags,
    })
    ElMessage.success('模板已保存')
    showSaveDialog.value = false
    loadTemplates()
  } catch {
    ElMessage.error('保存模板失败')
  }
}

// ---- Init ----

onMounted(() => {
  loadTemplates()
})
</script>

<template>
  <div :class="styles.panel">
    <!-- Header: search + filter + save button -->
    <div :class="styles.header">
      <div :class="styles['header-row']">
        <el-input
          v-model="searchKeyword"
          :class="styles['search-input']"
          placeholder="搜索模板..."
          clearable
          :prefix-icon="Search"
          size="small"
          @input="handleSearchChange"
        />
        <el-button
          :class="styles['save-btn']"
          type="primary"
          size="small"
          :icon="Plus"
          @click="openSaveDialog"
        >
          保存
        </el-button>
      </div>
      <div :class="styles['filter-row']">
        <el-select
          v-model="selectedCategory"
          :class="styles['filter-select']"
          placeholder="分类"
          size="small"
          clearable
          @change="handleCategoryChange"
        >
          <el-option
            v-for="opt in categoryOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>
    </div>

    <!-- List -->
    <div :class="styles.list">
      <div v-if="loading" :class="styles.loading">加载中...</div>
      <div v-else-if="templates.length === 0" :class="styles.empty">
        {{ searchKeyword || selectedCategory ? '未找到匹配的模板' : '暂无模板' }}
      </div>
      <div v-else :class="styles['card-grid']">
        <div
          v-for="tpl in templates"
          :key="tpl.id"
          :class="styles.card"
          @click="handleApply(tpl)"
        >
          <div :class="styles['card-header']">
            <img
              v-if="tpl.thumbnail"
              :class="styles['card-thumbnail']"
              :src="tpl.thumbnail"
              :alt="tpl.name"
            />
            <div v-else :class="styles['card-placeholder']">T</div>
            <div :class="styles['card-info']">
              <div :class="styles['card-name']">{{ tpl.name }}</div>
              <div v-if="tpl.description" :class="styles['card-desc']">
                {{ tpl.description }}
              </div>
            </div>
          </div>
          <div :class="styles['card-meta']">
            <span :class="styles['card-category']">
              {{ categoryLabelMap[tpl.category] || tpl.category }}
            </span>
            <span v-if="tpl.isBuiltin" :class="styles['card-builtin']">内置</span>
            <span :class="styles['card-usage']">{{ tpl.usageCount }} 次使用</span>
          </div>
          <div v-if="tpl.tags.length > 0" :class="styles['card-tags']">
            <span v-for="tag in tpl.tags" :key="tag" :class="styles['card-tag']">{{ tag }}</span>
          </div>
          <div :class="styles['card-actions']" @click.stop>
            <el-button
              type="primary"
              size="small"
              text
              @click="handleApply(tpl)"
            >
              应用
            </el-button>
            <el-button
              v-if="!tpl.isBuiltin"
              type="danger"
              size="small"
              text
              :icon="Delete"
              @click="handleDelete(tpl)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="total > pageSize" :class="styles.pagination">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        small
        @current-change="handlePageChange"
      />
    </div>

    <!-- Save template dialog -->
    <el-dialog
      v-model="showSaveDialog"
      title="保存为模板"
      width="400px"
      append-to-body
      destroy-on-close
    >
      <div :class="styles['save-form']">
        <el-form-item label="模板名称" required>
          <el-input
            v-model="saveForm.name"
            placeholder="请输入模板名称"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="saveForm.description"
            type="textarea"
            placeholder="请输入模板描述"
            :rows="2"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="saveForm.category" style="width: 100%">
            <el-option
              v-for="opt in categoryOptions.filter(o => o.value)"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="标签">
          <div :class="styles['tag-input-row']">
            <el-input
              v-model="tagInput"
              :class="styles['tag-input']"
              placeholder="输入标签后回车"
              size="small"
              @keyup.enter="addTag"
            />
            <el-button size="small" @click="addTag">添加</el-button>
          </div>
          <div v-if="saveForm.tags.length > 0" style="margin-top: 6px; display: flex; gap: 4px; flex-wrap: wrap;">
            <el-tag
              v-for="(tag, idx) in saveForm.tags"
              :key="idx"
              closable
              size="small"
              @close="removeTag(idx)"
            >
              {{ tag }}
            </el-tag>
          </div>
        </el-form-item>
      </div>
      <template #footer>
        <el-button @click="showSaveDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSaveTemplate">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
