<script setup lang="ts">
/**
 * WorkflowTemplateView — 工作流模板库
 *
 * 卡片网格展示模板，支持搜索、分类筛选、详情预览、一键创建工作流。
 */
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { MessagePlugin } from 'tdesign-vue-next'
import { SearchIcon, AddIcon, FileIcon, LinkIcon, OrderListIcon } from 'tdesign-icons-vue-next'
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
    MessagePlugin.error('加载模板详情失败')
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
    MessagePlugin.success(`工作流「${result.workflow.name}」已创建`)
    useDialogVisible.value = false
    router.push(`/workflow/${result.workflow.id}`)
  } catch (err) {
    MessagePlugin.error(err instanceof Error ? err.message : '创建工作流失败')
  } finally {
    useLoading.value = false
  }
}

// ---- 辅助函数 ----
const CATEGORY_TAG_TYPE: Record<string, string> = {
  '人事': 'default',
  '财务': 'success',
  '采购': 'warning',
  '行政': 'default',
  'IT': 'danger',
  '其他': 'default',
}

function getCategoryTagType(category: string): string {
  return CATEGORY_TAG_TYPE[category] ?? 'default'
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
        <LinkIcon :size="20" :class="styles.toolbarIcon" />
        <span :class="styles.toolbarTitle">工作流模板库</span>
        <t-tag :class="styles.countTag" size="small">
          {{ total }} 个模板
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
          <template #prefix-icon>
            <SearchIcon />
          </template>
        </t-input>
      </div>
    </div>

    <!-- 分类标签栏 -->
    <div :class="styles.categoryBar">
      <div style="overflow-x: auto;">
        <div :class="styles.categoryList">
          <t-tag
            v-for="cat in CATEGORY_OPTIONS"
            :key="cat.value"
            :theme="selectedCategory === cat.value ? 'primary' : 'default'"
            :variant="selectedCategory === cat.value ? 'dark' : 'outline'"
            :class="styles.categoryTag"
            @click="handleCategoryChange(cat.value)"
          >
            {{ cat.label }}
          </t-tag>
        </div>
      </div>
    </div>

    <!-- 内容区 -->
    <div :class="styles.content">
      <div style="overflow: auto; height: 100%;">
        <!-- 加载中 -->
        <div v-if="loading && templates.length === 0" :class="styles.loadingState">
          <LinkIcon :size="32" :class="styles.loadingIcon" />
          <span>加载中...</span>
        </div>

        <!-- 错误 -->
        <div v-else-if="error" :class="styles.errorState">
          <span :class="styles.errorText">{{ error }}</span>
          <t-button size="small" @click="loadTemplates()">重试</t-button>
        </div>

        <!-- 空状态 -->
        <div v-else-if="templates.length === 0" :class="styles.emptyState">
          <FileIcon :size="48" :class="styles.emptyIcon" />
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
          <t-pagination
            v-model="page"
            :page-size="pageSize"
            :total="total"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>

    <!-- 详情预览抽屉 -->
    <t-drawer
      v-model:visible="previewVisible"
      :header="previewTemplate?.name ?? '模板预览'"
      size="55%"
      placement="right"
      :destroy-on-close="true"
    >
      <div v-if="previewTemplate" :class="styles.previewContent">
        <!-- 模板基本信息 -->
        <div :class="styles.previewMeta">
          <div :class="styles.previewMetaRow">
            <span :class="styles.previewMetaLabel">分类</span>
            <t-tag :theme="(getCategoryTagType(previewTemplate.category) as any)" size="small">
              {{ getCategoryLabel(previewTemplate.category) }}
            </t-tag>
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
              <t-tag
                v-for="tag in previewTemplate.tags"
                :key="tag"
                size="small"
              >
                {{ tag }}
              </t-tag>
            </div>
          </div>
        </div>

        <!-- 流程节点预览 -->
        <div :class="styles.previewSection">
          <h4 :class="styles.previewSectionTitle">
            <LinkIcon />
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
            <OrderListIcon />
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
          <t-button theme="primary" @click="openUseDialog(previewTemplate!)">
            <AddIcon />
            使用此模板
          </t-button>
        </div>
      </div>
    </t-drawer>

    <!-- 使用模板对话框 -->
    <t-dialog
      v-model:visible="useDialogVisible"
      header="使用模板创建工作流"
      width="480px"
      :close-on-overlay="false"
    >
      <div v-if="useTemplate">
        <p :class="styles.useDialogDesc">
          将基于模板「{{ useTemplate.name }}」创建工作流，包含预置的表单和流程定义。创建后可在编辑器中自由修改。
        </p>
        <t-form label-width="80px">
          <t-form-item label="工作流名称">
            <t-input v-model:value="useName" placeholder="请输入工作流名称" maxlength="200" />
          </t-form-item>
        </t-form>
      </div>
      <template #footer>
        <t-button variant="outline" @click="useDialogVisible = false">取消</t-button>
        <t-button theme="primary" :loading="useLoading" @click="handleUse">
          确认创建
        </t-button>
      </template>
    </t-dialog>
  </div>
</template>
