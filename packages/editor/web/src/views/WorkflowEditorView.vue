<script setup lang="ts">
/**
 * WorkflowEditorView — 工作流编排器
 *
 * 三步向导：
 *   Step 1：选择/创建表单
 *   Step 2：选择/创建流程
 *   Step 3：配置数据更新规则（字段映射）
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowRight, Plus, Delete } from '@element-plus/icons-vue'
import {
  apiClient,
  fetchSchemas,
  fetchSchemaById,
  createWorkflow,
  updateWorkflow,
  publishWorkflow,
} from '@/utils/apiClient'
import type { PaginatedResponse, SchemaListItem, SchemaDetail } from '@/types/api'
import styles from './WorkflowEditorView.module.scss'

const route = useRoute()
const router = useRouter()

// ── 后端 Workflow 完整类型（对齐 Mongoose 模型）──
interface DataUpdateRule {
  trigger: string
  targetField: string
  sourceField: string
  transform?: string
}

interface WorkflowDetail {
  id: string
  name: string
  description: string
  status: 'draft' | 'published' | 'archived'
  formSchemaId: string
  flowDefinitionId: string
  dataUpdateRules: DataUpdateRule[]
  publishConfig: {
    entryUrl: string
    permissions: { launchers: string[]; viewers: string[] }
  }
  createdAt: string
  updatedAt: string
}

interface FlowDefinitionItem {
  id: string
  name: string
  description: string
  status: string
  category: string
  createdAt: string
  updatedAt: string
}

// ── 路由参数 ──
const workflowId = computed(() => route.params.id as string | undefined)
const isEditing = computed(() => !!workflowId.value)

// ── 顶部状态 ──
const workflowName = ref('未命名工作流')
const workflowStatus = ref<'draft' | 'published' | 'archived'>('draft')
const saving = ref(false)

// ── 步骤控制 ──
const currentStep = ref(0)
const stepTitles = ['选择表单', '选择流程', '配置数据更新规则']

// ── Step 1: 表单 ──
const schemas = ref<SchemaListItem[]>([])
const schemasLoading = ref(false)
const selectedSchemaId = ref('')
const selectedSchemaDetail = ref<SchemaDetail | null>(null)

// ── Step 2: 流程 ──
const flows = ref<FlowDefinitionItem[]>([])
const flowsLoading = ref(false)
const selectedFlowId = ref('')
const selectedFlow = ref<FlowDefinitionItem | null>(null)

// ── Step 3: 数据更新规则 ──
const dataUpdateRules = ref<DataUpdateRule[]>([])

// ── 表单字段列表（从 schema JSON 中提取）──
const formFields = computed(() => {
  if (!selectedSchemaDetail.value?.json) return []
  return extractFields(selectedSchemaDetail.value.json as Record<string, unknown>[])
})

// ── 流程变量列表（暂用占位，后续接入 FlowDefinition 变量）──
const flowVariables = ref<string[]>([])

function extractFields(widgets: Record<string, unknown>[]): string[] {
  const fields: string[] = []
  for (const w of widgets) {
    const field = w.field as string | undefined
    if (field) fields.push(field)
    const children = w.children as Record<string, unknown>[] | undefined
    if (children) fields.push(...extractFields(children))
  }
  return fields
}

// ── 加载数据 ──

async function loadSchemas() {
  schemasLoading.value = true
  try {
    const res: PaginatedResponse<SchemaListItem> = await fetchSchemas({ page: 1, pageSize: 100 })
    schemas.value = res.items
  } catch {
    ElMessage.error('加载表单列表失败')
  } finally {
    schemasLoading.value = false
  }
}

async function loadFlows() {
  flowsLoading.value = true
  try {
    const res = await apiClient.get<PaginatedResponse<FlowDefinitionItem>>('/flows', {
      page: '1',
      pageSize: '100',
    })
    flows.value = res.items
  } catch {
    ElMessage.error('加载流程列表失败')
  } finally {
    flowsLoading.value = false
  }
}

async function loadSchemaDetail(id: string) {
  try {
    selectedSchemaDetail.value = await fetchSchemaById(id)
  } catch {
    ElMessage.error('加载表单详情失败')
  }
}

async function loadFlowVariables(flowId: string) {
  try {
    const detail = await apiClient.get<FlowDefinitionItem & { variables?: string[] }>(
      `/flows/${encodeURIComponent(flowId)}`,
    )
    flowVariables.value = detail.variables ?? []
  } catch {
    flowVariables.value = []
  }
}

// ── 加载已有 Workflow（编辑模式）──

async function loadWorkflow(id: string) {
  try {
    const wf = await apiClient.get<WorkflowDetail>(`/workflows/${encodeURIComponent(id)}`)
    workflowName.value = wf.name
    workflowStatus.value = wf.status
    selectedSchemaId.value = wf.formSchemaId
    selectedFlowId.value = wf.flowDefinitionId
    dataUpdateRules.value = wf.dataUpdateRules ?? []

    // 加载关联的表单详情
    if (wf.formSchemaId) {
      await loadSchemaDetail(wf.formSchemaId)
    }
    // 加载关联的流程变量
    if (wf.flowDefinitionId) {
      await loadFlowVariables(wf.flowDefinitionId)
    }
  } catch {
    ElMessage.error('加载工作流详情失败')
  }
}

// ── Step 变更时加载数据 ──

async function handleStepChange(step: number) {
  if (step === 0 && schemas.value.length === 0) await loadSchemas()
  if (step === 1 && flows.value.length === 0) await loadFlows()
}

// ── 选择表单 ──

async function handleSchemaChange(id: string) {
  selectedSchemaId.value = id
  if (id) {
    await loadSchemaDetail(id)
  } else {
    selectedSchemaDetail.value = null
  }
}

// ── 选择流程 ──

async function handleFlowChange(id: string) {
  selectedFlowId.value = id
  selectedFlow.value = flows.value.find((f) => f.id === id) ?? null
  if (id) {
    await loadFlowVariables(id)
  } else {
    flowVariables.value = []
  }
}

// ── 规则操作 ──

function addRule() {
  dataUpdateRules.value.push({
    trigger: 'onSubmit',
    targetField: '',
    sourceField: '',
    transform: '',
  })
}

function removeRule(index: number) {
  dataUpdateRules.value.splice(index, 1)
}

// ── 步骤导航 ──

const canGoNext = computed(() => {
  if (currentStep.value === 0) return !!selectedSchemaId.value
  if (currentStep.value === 1) return !!selectedFlowId.value
  return true
})

async function handleNext() {
  if (!canGoNext.value) return
  if (currentStep.value < 2) {
    currentStep.value++
    await handleStepChange(currentStep.value)
  }
}

function handlePrev() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

// ── 跳转创建 ──

function goToCreateSchema() {
  router.push('/editor')
}

function goToCreateFlow() {
  // 跳转到 flow 项目创建页面
  const flowUrl = import.meta.env.VITE_FLOW_URL || '/flow'
  window.open(`${flowUrl}/designer`, '_blank')
}

// ── 保存 ──

async function handleSave() {
  if (!selectedSchemaId.value || !selectedFlowId.value) {
    ElMessage.warning('请先选择表单和流程')
    return
  }

  saving.value = true
  try {
    const payload = {
      name: workflowName.value,
      formSchemaId: selectedSchemaId.value,
      flowDefinitionId: selectedFlowId.value,
      dataUpdateRules: dataUpdateRules.value.filter(
        (r) => r.targetField && r.sourceField,
      ),
    }

    if (isEditing.value && workflowId.value) {
      await updateWorkflow(workflowId.value, payload)
      ElMessage.success('已保存')
    } else {
      const created = await createWorkflow(payload)
      ElMessage.success('已创建')
      router.replace(`/workflow/${created.id}`)
    }
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '保存失败')
  } finally {
    saving.value = false
  }
}

// ── 发布 ──

const publishing = ref(false)

async function handlePublish() {
  if (!workflowId.value) return
  publishing.value = true
  try {
    await publishWorkflow(workflowId.value)
    workflowStatus.value = 'published'
    ElMessage.success('已发布')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '发布失败')
  } finally {
    publishing.value = false
  }
}

// ── 初始化 ──

onMounted(async () => {
  await loadSchemas()
  if (workflowId.value) {
    await loadWorkflow(workflowId.value)
  }
})
</script>

<template>
  <div :class="styles.workflowEditor">
    <!-- 顶部 Header -->
    <div :class="styles.header">
      <div :class="styles.headerLeft">
        <button :class="styles.backBtn" title="返回" @click="router.push('/workflows')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <el-input
          v-model="workflowName"
          :class="styles.nameInput"
          placeholder="工作流名称"
          size="default"
        />
        <el-tag
          v-if="isEditing"
          :type="workflowStatus === 'published' ? 'success' : 'info'"
          :class="styles.statusBadge"
          size="small"
        >
          {{ workflowStatus === 'published' ? '已发布' : workflowStatus === 'archived' ? '已归档' : '草稿' }}
        </el-tag>
      </div>
      <div :class="styles.headerRight">
        <el-button @click="handleSave" :loading="saving">
          保存
        </el-button>
        <el-button
          v-if="isEditing && workflowStatus !== 'published'"
          type="primary"
          :loading="publishing"
          @click="handlePublish"
        >
          发布
        </el-button>
      </div>
    </div>

    <!-- 步骤条 -->
    <div :class="styles.stepsWrapper">
      <el-steps :active="currentStep" finish-status="success" align-center>
        <el-step
          v-for="(title, i) in stepTitles"
          :key="i"
          :title="title"
          :style="{ cursor: 'pointer' }"
          @click="currentStep = i"
        />
      </el-steps>
    </div>

    <!-- 内容区 -->
    <div :class="styles.body">
      <div :class="styles.content">
        <div :class="styles.stepContent">

          <!-- Step 1: 选择表单 -->
          <template v-if="currentStep === 0">
            <div :class="styles.stepSection">
              <h3 :class="styles.sectionTitle">选择关联表单</h3>
              <p :class="styles.sectionDesc">选择一个已有的表单 Schema，或前往编辑器创建新表单</p>
              <div :class="styles.selectRow">
                <el-select
                  v-model="selectedSchemaId"
                  :class="styles.selectFlex"
                  placeholder="请选择表单"
                  filterable
                  :loading="schemasLoading"
                  @change="handleSchemaChange"
                >
                  <el-option
                    v-for="s in schemas"
                    :key="s.id"
                    :label="s.name"
                    :value="s.id"
                  />
                </el-select>
                <el-button :class="styles.createLink" @click="goToCreateSchema">
                  <el-icon><Plus /></el-icon>
                  创建新表单
                </el-button>
              </div>
            </div>

            <!-- 表单预览 -->
            <el-card v-if="selectedSchemaDetail" :class="styles.previewCard" shadow="never">
              <template #header>
                <div :class="styles.previewCardHeader">
                  <span :class="styles.previewCardTitle">表单信息</span>
                  <el-tag size="small" type="info">{{ selectedSchemaDetail.type }}</el-tag>
                </div>
              </template>
              <div :class="styles.previewItem">
                <span :class="styles.previewLabel">名称</span>
                <span :class="styles.previewValue">{{ selectedSchemaDetail.name }}</span>
              </div>
              <div :class="styles.previewItem">
                <span :class="styles.previewLabel">字段数量</span>
                <span :class="styles.previewValue">{{ formFields.length }} 个字段</span>
              </div>
              <div v-if="formFields.length > 0" :class="styles.previewItem">
                <span :class="styles.previewLabel">字段列表</span>
                <div :class="styles.fieldList">
                  <el-tag
                    v-for="f in formFields"
                    :key="f"
                    :class="styles.fieldTag"
                    size="small"
                    type="info"
                  >
                    {{ f }}
                  </el-tag>
                </div>
              </div>
            </el-card>
          </template>

          <!-- Step 2: 选择流程 -->
          <template v-if="currentStep === 1">
            <div :class="styles.stepSection">
              <h3 :class="styles.sectionTitle">选择关联流程</h3>
              <p :class="styles.sectionDesc">选择一个已有的流程定义，或前往流程设计器创建新流程</p>
              <div :class="styles.selectRow">
                <el-select
                  v-model="selectedFlowId"
                  :class="styles.selectFlex"
                  placeholder="请选择流程"
                  filterable
                  :loading="flowsLoading"
                  @change="handleFlowChange"
                >
                  <el-option
                    v-for="f in flows"
                    :key="f.id"
                    :label="f.name"
                    :value="f.id"
                  />
                </el-select>
                <el-button :class="styles.createLink" @click="goToCreateFlow">
                  <el-icon><Plus /></el-icon>
                  创建新流程
                </el-button>
              </div>
            </div>

            <!-- 流程预览 -->
            <el-card v-if="selectedFlow" :class="styles.previewCard" shadow="never">
              <template #header>
                <div :class="styles.previewCardHeader">
                  <span :class="styles.previewCardTitle">流程信息</span>
                  <el-tag size="small" :type="selectedFlow.status === 'published' ? 'success' : 'info'">
                    {{ selectedFlow.status === 'published' ? '已发布' : '草稿' }}
                  </el-tag>
                </div>
              </template>
              <div :class="styles.previewItem">
                <span :class="styles.previewLabel">名称</span>
                <span :class="styles.previewValue">{{ selectedFlow.name }}</span>
              </div>
              <div v-if="selectedFlow.description" :class="styles.previewItem">
                <span :class="styles.previewLabel">描述</span>
                <span :class="styles.previewValue">{{ selectedFlow.description }}</span>
              </div>
              <div :class="styles.previewItem">
                <span :class="styles.previewLabel">流程变量</span>
                <span :class="styles.previewValue">
                  {{ flowVariables.length > 0 ? flowVariables.join(', ') : '无' }}
                </span>
              </div>
            </el-card>
          </template>

          <!-- Step 3: 配置数据更新规则 -->
          <template v-if="currentStep === 2">
            <div :class="styles.stepSection">
              <div :class="styles.rulesHeader">
                <h3 :class="styles.sectionTitle">数据更新规则</h3>
                <el-button size="small" type="primary" @click="addRule">
                  <el-icon><Plus /></el-icon>
                  添加规则
                </el-button>
              </div>
              <p :class="styles.sectionDesc">
                配置表单字段与流程变量之间的映射关系，决定数据如何在表单和流程之间流转
              </p>

              <!-- 无规则时 -->
              <div v-if="dataUpdateRules.length === 0" :class="styles.emptyRules">
                <p :class="styles.emptyRulesText">暂无数据更新规则</p>
                <el-button size="small" @click="addRule">添加第一条规则</el-button>
              </div>

              <!-- 规则列表 -->
              <template v-else>
                <!-- 字段映射表头 -->
                <div :class="styles.fieldMapHeader">
                  <span>表单字段（源）</span>
                  <span />
                  <span>流程变量（目标）</span>
                  <span />
                </div>
                <div :class="styles.fieldMapBody">
                  <div
                    v-for="(rule, idx) in dataUpdateRules"
                    :key="idx"
                    :class="styles.fieldMapRow"
                  >
                    <el-select
                      v-model="rule.sourceField"
                      :class="styles.ruleSelect"
                      placeholder="选择表单字段"
                      filterable
                      size="small"
                    >
                      <el-option
                        v-for="f in formFields"
                        :key="f"
                        :label="f"
                        :value="f"
                      />
                    </el-select>
                    <div :class="styles.fieldMapArrow">
                      <el-icon><ArrowRight /></el-icon>
                    </div>
                    <el-select
                      v-model="rule.targetField"
                      :class="styles.ruleSelect"
                      placeholder="选择流程变量"
                      filterable
                      allow-create
                      size="small"
                    >
                      <el-option
                        v-for="v in flowVariables"
                        :key="v"
                        :label="v"
                        :value="v"
                      />
                    </el-select>
                    <div :class="styles.fieldMapRemove">
                      <el-button
                        size="small"
                        type="danger"
                        text
                        :icon="Delete"
                        @click="removeRule(idx)"
                      />
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </template>

        </div>
      </div>

      <!-- 底部导航 -->
      <div :class="styles.footer">
        <div :class="styles.footerLeft">
          <el-button v-if="currentStep > 0" @click="handlePrev">
            上一步
          </el-button>
        </div>
        <div :class="styles.footerRight">
          <el-button
            v-if="currentStep < 2"
            type="primary"
            :disabled="!canGoNext"
            @click="handleNext"
          >
            下一步
          </el-button>
          <el-button
            v-if="currentStep === 2"
            type="primary"
            :loading="saving"
            @click="handleSave"
          >
            {{ isEditing ? '保存' : '创建工作流' }}
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>
