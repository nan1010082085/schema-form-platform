<template>
  <div :class="$style.container">
    <!-- 加载状态 -->
    <div v-if="loading" :class="$style.loading">
      <AppIcon name="loading" :class="$style.loadingIcon" />
      <span>加载表单中...</span>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" :class="$style.error">
      <WarningFilled :class="$style.errorIcon" />
      <span>{{ error }}</span>
      <el-button size="small" @click="loadSchema">重试</el-button>
    </div>

    <!-- 表单渲染 -->
    <div v-else-if="schema" :class="$style.form">
      <div :class="$style.formHeader">
        <h3 :class="$style.formTitle">{{ schemaName }}</h3>
        <el-tag v-if="formMode" :type="getModeTheme(formMode)" size="small">
          {{ getModeLabel(formMode) }}
        </el-tag>
      </div>
      <div :class="$style.formContent">
        <!-- 这里需要集成 Editor 的 SchemaRender 组件 -->
        <!-- 暂时显示表单数据 -->
        <pre :class="$style.formData">{{ JSON.stringify(formData, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import AppIcon from '@schema-form/platform-shared/components/common/AppIcon.vue'

const props = defineProps<{
  schemaId?: string
  publishId?: string
  formMode?: 'create' | 'view' | 'edit' | 'approve'
  initialData?: Record<string, unknown>
  instanceId?: string
  taskId?: string
}>()

defineEmits<{
  'form-submit': [data: Record<string, unknown>]
  'flow-action': [action: string, data: unknown]
}>()

const loading = ref(false)
const error = ref('')
const schema = ref<Record<string, unknown> | null>(null)
const schemaName = ref('')
const formData = ref<Record<string, unknown>>({})

async function loadSchema() {
  if (!props.schemaId && !props.publishId) {
    error.value = '未指定表单'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const token = localStorage.getItem('sfp_access_token')
    const url = props.publishId
      ? `/api/schemas/published/${props.publishId}`
      : `/api/schemas/${props.schemaId}`

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await response.json()

    if (data.success) {
      schema.value = data.data.json || data.data.schema
      schemaName.value = data.data.name || ''
      if (props.initialData) {
        formData.value = { ...props.initialData }
      }
    } else {
      error.value = data.error?.message || '加载失败'
    }
  } catch (err) {
    error.value = '网络错误'
    console.error('Failed to load schema:', err)
  } finally {
    loading.value = false
  }
}

function getModeTheme(mode: string) {
  const map: Record<string, string> = {
    create: 'primary',
    view: 'info',
    edit: 'warning',
    approve: 'success',
  }
  return map[mode] || 'info'
}

function getModeLabel(mode: string) {
  const map: Record<string, string> = {
    create: '新建',
    view: '查看',
    edit: '编辑',
    approve: '审批',
  }
  return map[mode] || mode
}

watch(() => props.schemaId, () => {
  if (props.schemaId) {
    loadSchema()
  }
})

watch(() => props.publishId, () => {
  if (props.publishId) {
    loadSchema()
  }
})

onMounted(() => {
  if (props.schemaId || props.publishId) {
    loadSchema()
  }
})
</script>

<style module>
.container {
  width: 100%;
  min-height: 200px;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  color: var(--text-color-secondary);
}

.loadingIcon {
  font-size: 24px;
}

.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  color: var(--color-danger);
}

.errorIcon {
  font-size: 24px;
}

.form {
  background: var(--bg-color);
  border-radius: 8px;
  border: 1px solid var(--border-color-lighter);
}

.formHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-color-lighter);
}

.formTitle {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.formContent {
  padding: 16px;
}

.formData {
  background: var(--bg-color-secondary);
  border-radius: 8px;
  padding: 16px;
  font-size: 12px;
  overflow-x: auto;
}
</style>
