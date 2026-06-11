<script setup lang="ts">
/**
 * WorkflowStartView — 发起申请页面
 *
 * 流程：
 *   1. 加载 Workflow 详情 → 获取关联的 formSchemaId
 *   2. 加载 FormSchema 详情 → 用 WidgetRenderer 渲染表单
 *   3. 用户填写表单 → 提交 → POST /api/workflows/:id/start
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { CircleCheckFilled, Loading, CircleCloseFilled } from '@element-plus/icons-vue'
import { WidgetRenderer } from '@/components/WidgetRenderer'
import type { FormData, PartialWidget } from '@/components/WidgetRenderer'
import type { WorkflowItem } from '@schema-form/shared-utils/apiClient'
import { fetchWorkflowById, fetchSchemaById, startWorkflow } from '@schema-form/shared-utils/apiClient'
import { registerAllWidgets } from '@/widgets'
import { useAppStore } from '@/stores/app'
import styles from './WorkflowStartView.module.scss'

registerAllWidgets()

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const workflowId = computed(() => route.params.id as string)

// ── 状态 ──
const workflow = ref<WorkflowItem | null>(null)
const schema = ref<PartialWidget[]>([])
const loading = ref(true)
const error = ref('')
const submitting = ref(false)
const submitted = ref(false)

const formRef = ref<InstanceType<typeof WidgetRenderer>>()

// ── 上下文 ──
const context = computed(() => appStore.formGridContext)

// ── 加载数据 ──
async function loadWorkflowAndSchema(id: string) {
  loading.value = true
  error.value = ''
  workflow.value = null
  schema.value = []

  try {
    const wf = await fetchWorkflowById(id)
    workflow.value = wf

    if (wf.status !== 'published') {
      error.value = '该工作流尚未发布，无法发起申请'
      return
    }

    const schemaDetail = await fetchSchemaById(wf.formSchemaId)
    schema.value = schemaDetail.json
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载工作流失败'
  } finally {
    loading.value = false
  }
}

// ── 提交 ──
async function handleSubmit(data: FormData) {
  if (!workflow.value) return

  submitting.value = true
  try {
    await startWorkflow(workflow.value.id, data)
    submitted.value = true
    ElMessage.success('申请已提交')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '提交失败')
  } finally {
    submitting.value = false
  }
}

// ── 返回列表 ──
function handleBack() {
  router.push('/workflows')
}

// ── 初始化 ──
onMounted(() => {
  if (workflowId.value) {
    loadWorkflowAndSchema(workflowId.value)
  } else {
    error.value = '缺少工作流 ID'
    loading.value = false
  }
})
</script>

<template>
  <div :class="styles.page">
    <el-scrollbar :class="styles.scrollbar">
      <div :class="styles.content">
        <!-- 加载中 -->
        <div v-if="loading" :class="styles.loading">
          <el-icon class="is-loading" :size="20"><Loading /></el-icon>
          <span>加载中...</span>
        </div>

        <!-- 错误 -->
        <div v-else-if="error" :class="styles.errorState">
          <el-icon :size="48" color="var(--el-color-danger)"><CircleCloseFilled /></el-icon>
          <p>{{ error }}</p>
          <el-button @click="handleBack">返回工作流列表</el-button>
        </div>

        <!-- 提交成功 -->
        <div v-else-if="submitted" :class="styles.successState">
          <el-icon :size="64" color="var(--el-color-success)"><CircleCheckFilled /></el-icon>
          <h2>申请已提交</h2>
          <p>您的申请已成功提交，将进入流程审批</p>
          <el-button @click="handleBack">返回工作流列表</el-button>
        </div>

        <!-- 正常填写 -->
        <template v-else-if="workflow">
          <!-- 顶部：Workflow 名称和描述 -->
          <div :class="styles.header">
            <h1 :class="styles.title">{{ workflow.name }}</h1>
            <p v-if="workflow.description" :class="styles.description">
              {{ workflow.description }}
            </p>
          </div>

          <!-- 中间：表单渲染器 -->
          <div :class="styles.formSection">
            <h2 :class="styles.formSectionTitle">填写表单</h2>
            <WidgetRenderer
              ref="formRef"
              :schema="schema"
              layout="flow"
              :user="context.user"
              :request="context.request"
              :global="context.global"
              @submit="handleSubmit"
            />
          </div>

          <!-- 底部：提交按钮 -->
          <div :class="styles.footer">
            <el-button @click="handleBack">取消</el-button>
            <el-button
              type="primary"
              :loading="submitting"
              @click="formRef?.submit()"
            >
              提交申请
            </el-button>
          </div>
        </template>
      </div>
    </el-scrollbar>
  </div>
</template>
