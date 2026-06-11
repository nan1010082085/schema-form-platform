<script setup lang="ts">
/**
 * WorkflowTemplateView — 工作流模板库
 *
 * 卡片网格展示模板，支持搜索、分类筛选、详情预览、一键创建工作流。
 */
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Plus, View, Document, Connection, Collection, List } from '@element-plus/icons-vue'
import {
  fetchWorkflowTemplates,
  fetchWorkflowTemplateById,
  useWorkflowTemplate,
  type WorkflowTemplateItem,
} from '@/utils/apiClient'
import type { PaginatedResponse } from '@/types/api'
import WorkflowTemplateCard from '@/components/WorkflowTemplateCard.vue'
import styles from './WorkflowTemplateView.module.scss'

const router = useRouter()

// ---- 分类定义 ----
const CATEGORY_OPTIONS: { label: string; value: string }[] = [
  { label: '全部', value: '' },
  { label: '人事', value: '人事' },
  { label: '财务', value: '财务' },
  { label: '采购', value: '采购' },
  { label: '行政', value: '行政' },
  { label: 'IT', value: 'IT' },
  { label: '其他', value: '其他' },
]

// ---- 数据 ----
const templates = ref<WorkflowTemplateItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const error = ref('')

// ---- 筛选 ----
const searchInput = ref('')
const selectedCategory = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

function handleSearch(val: string) {
  searchInput.value = val
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    loadTemplates()
  }, 300)
}

function handleCategoryChange(category: string) {
  selectedCategory.value = category
  page.value = 1
  loadTemplates()
}

// ---- 加载列表 ----
async function loadTemplates() {
  loading.value = true
  error.value = ''
  try {
    const res: PaginatedResponse<WorkflowTemplateItem> = await fetchWorkflowTemplates({
      search: searchInput.value || undefined,
      category: selectedCategory.value || undefined,
      page: page.value,
      pageSize: pageSize.value,
    })
    templates.value = res.items
    total.value = res.total
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载模板列表失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadTemplates)

// ---- 分页 ----
function handlePageChange(p: number) {
  page.value = p
  loadTemplates()
}

// ---- 详情预览 ----
const previewVisible = ref(false)
const previewTemplate = ref<WorkflowTemplateItem | null>(null)
const previewLoading = ref(false)

async function openPreview(tpl: WorkflowTemplateItem) {
  previewLoading.value = true
  try {
    const detail = await fetchWorkflowTemplateById(tpl.id)
    previewTemplate.value = detail
    previewVisible.value = true
  } catch {
    ElMessage.error('加载模板详情失败')
  } finally {
    previewLoading.value = false
  }
}

// ---- 使用模板 ----
const useDialogVisible = ref(false)
const useTemplate = ref<WorkflowTemplateItem | null>(null)
const useName = ref('')
const useLoading = ref(false)

function openUseDialog(tpl: WorkflowTemplateItem) {
  useTemplate.value = tpl
  useName.value = tpl.name
  useDialogVisible.value = true
}

async function handleUse() {
  if (!useTemplate.value) return
  useLoading.value = true
  try {
    const result = await useWorkflowTemplate(useTemplate.value.id, {
      name: useName.value || undefined,
    })
    ElMessage.success(`工作流「${result.workflow.name}」已创建`)
    useDialogVisible.value = false
    router.push(`/workflow/${result.workflow.id}`)
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '创建工作流失败')
  } finally {
    useLoading.value = false
  }
}

// ---- 辅助函数 ----
const CATEGORY_TAG_TYPE: Record<string, string> = {
  '人事': '',
  '财务': 'success',
  '采购': 'warning',
  '行政': 'info',
  'IT': 'danger',
  '其他': 'info',
}

function getCategoryTagType(category: string): string {
  return CATEGORY_TAG_TYPE[category] ?? 'info'
}

function getCategoryLabel(category: string): string {
  return CATEGORY_OPTIONS.find(c => c.value === category)?.label ?? category
}

// ---- 流程节点展示 ----
function getFlowNodes(tpl: WorkflowTemplateItem): Array<{ id: string; label: string; type: string }> {
  const nodes = (tpl.flowDefinition?.nodes ?? []) as Array<Record<string, unknown>>
  return nodes.map(n => ({
    id: n.id as string,
    label: (n.data as Record<string, unknown>)?.label as string ?? n.id as string,
    type: (n.data as Record<string, unknown>)?.bpmnType as string ?? 'unknown',
  }))
}

function getNodeChipClass(bpmnType: string): string {
  if (bpmnType === 'bpmn:StartEvent') return styles.flowNodeChipStart
  if (bpmnType === 'bpmn:EndEvent') return styles.flowNodeChipEnd
  if (bpmnType === 'bpmn:UserTask') return styles.flowNodeChipTask
  if (bpmnType === 'bpmn:ExclusiveGateway') return styles.flowNodeChipGateway
  return ''
}

// ---- 表单字段展示 ----
function getFormFields(tpl: WorkflowTemplateItem): Array<{ label: string; type: string; required: boolean }> {
  const fields: Array<{ label: string; type: string; required: boolean }> = []
  const schema = tpl.formSchema as Array<Record<string, unknown>> | undefined
  if (!Array.isArray(schema)) return fields

  function walk(nodes: Array<Record<string, unknown>>) {
    for (const node of nodes) {
      if (node.type === 'form' && Array.isArray(node.children)) {
        walk(node.children as Array<Record<string, unknown>>)
        continue
      }
      const props = node.props as Record<string, unknown> | undefined
      if (props?.label) {
        fields.push({
          label: props.label as string,
          type: node.type as string,
          required: !!props.required,
        })
      }
      if (Array.isArray(node.children)) {
        walk(node.children as Array<Record<string, unknown>>)
      }
    }
  }
  walk(schema)
  return fields
}

const totalFlowNodes = computed(() => getFlowNodes(previewTemplate.value as WorkflowTemplateItem).length)
const totalFormFields = computed(() => getFormFields(previewTemplate.value as WorkflowTemplateItem).length)
</script>

<template>
  <div :class="styles.container">
    <!-- 顶栏：搜索 + 标题 -->
    <div :class="styles.toolbar">
      <div :class="styles.toolbarLeft">
        <el-icon :size="20" :class="styles.toolbarIcon"><Connection /></el-icon>
        <span :class="styles.toolbarTitle">工作流模板库</span>
        <el-tag :class="styles.countTag" type="info" size="small">
          {{ total }} 个模板
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
            :type="(selectedCategory === cat.value ? 'primary' : 'info') as any"
            :effect="selectedCategory === cat.value ? 'dark' : 'plain'"
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
        <div v-if="loading && templates.length === 0" :class="styles.loadingState">
          <el-icon :size="32" :class="styles.loadingIcon"><Connection /></el-icon>
          <span>加载中...</span>
        </div>

        <!-- 错误 -->
        <div v-else-if="error" :class="styles.errorState">
          <span :class="styles.errorText">{{ error }}</span>
          <el-button size="small" @click="loadTemplates()">重试</el-button>
        </div>

        <!-- 空状态 -->
        <div v-else-if="templates.length === 0" :class="styles.emptyState">
          <el-icon :size="48" :class="styles.emptyIcon"><Document /></el-icon>
          <p :class="styles.emptyText">暂无模板</p>
          <p :class="styles.emptyHint">尝试调整筛选条件</p>
        </div>

        <!-- 模板卡片网格 -->
        <div v-else :class="styles.cardGrid">
          <WorkflowTemplateCard
            v-for="tpl in templates"
            :key="tpl.id"
            :template="tpl"
            @use="openUseDialog"
            @preview="openPreview"
          />
        </div>

        <!-- 分页 -->
        <div v-if="Math.ceil(total / pageSize) > 1" :class="styles.pagination">
          <el-pagination
            v-model:current-page="page"
            :page-size="pageSize"
            :total="total"
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
              使用 {{ previewTemplate.useCount }} 次
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

        <!-- 流程节点预览 -->
        <div :class="styles.previewSection">
          <h4 :class="styles.previewSectionTitle">
            <el-icon><Connection /></el-icon>
            流程节点（{{ totalFlowNodes }} 个）
          </h4>
          <div :class="styles.previewFlowArea">
            <div :class="styles.flowNodeList">
              <span
                v-for="node in getFlowNodes(previewTemplate)"
                :key="node.id"
                :class="[styles.flowNodeChip, getNodeChipClass(node.type)]"
              >
                {{ node.label }}
              </span>
            </div>
          </div>
        </div>

        <!-- 表单字段预览 -->
        <div :class="styles.previewSection">
          <h4 :class="styles.previewSectionTitle">
            <el-icon><List /></el-icon>
            表单字段（{{ totalFormFields }} 个）
          </h4>
          <div :class="styles.previewFormArea">
            <div :class="styles.formFieldList">
              <div
                v-for="(field, idx) in getFormFields(previewTemplate)"
                :key="idx"
                :class="styles.formFieldItem"
              >
                <span :class="styles.formFieldLabel">{{ field.label }}</span>
                <span :class="styles.formFieldType">{{ field.type }}</span>
                <span v-if="field.required" :class="styles.formFieldRequired">必填</span>
              </div>
            </div>
          </div>
        </div>

        <div :class="styles.previewActions">
          <el-button type="primary" @click="openUseDialog(previewTemplate!)">
            <el-icon><Plus /></el-icon>
            使用此模板
          </el-button>
        </div>
      </div>
    </el-drawer>

    <!-- 使用模板对话框 -->
    <el-dialog
      v-model="useDialogVisible"
      title="使用模板创建工作流"
      width="480px"
      :close-on-click-modal="false"
    >
      <div v-if="useTemplate">
        <p :class="styles.useDialogDesc">
          将基于模板「{{ useTemplate.name }}」创建工作流，包含预置的表单和流程定义。创建后可在编辑器中自由修改。
        </p>
        <el-form label-width="80px">
          <el-form-item label="工作流名称">
            <el-input v-model="useName" placeholder="请输入工作流名称" maxlength="200" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="useDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="useLoading" @click="handleUse">
          确认创建
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>
