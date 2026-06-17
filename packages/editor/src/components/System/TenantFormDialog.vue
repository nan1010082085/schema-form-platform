<script setup lang="ts">
/**
 * TenantFormDialog — 创建/编辑租户弹窗
 *
 * 支持 name, code, status, maxUsers, features 字段。
 * 编辑模式下传入 initialData 预填表单。
 */
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useTenantStore } from '@/stores/tenant'
import type { TenantItem, TenantStatus, TenantCreatePayload, TenantUpdatePayload } from '@/types/tenant'
import styles from './TenantFormDialog.module.scss'

const props = defineProps<{
  visible: boolean
  initialData?: TenantItem | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  saved: []
}>()

const tenantStore = useTenantStore()

const isEditing = computed(() => !!props.initialData)
const dialogTitle = computed(() => isEditing.value ? '编辑租户' : '创建租户')
const submitting = ref(false)

const form = ref({
  name: '',
  code: '',
  status: 'active' as TenantStatus,
  maxUsers: 100,
  features: [] as string[],
})

const featuresInput = ref('')

watch(() => props.visible, (val) => {
  if (val) {
    if (props.initialData) {
      form.value = {
        name: props.initialData.name,
        code: props.initialData.code,
        status: props.initialData.status,
        maxUsers: props.initialData.config.maxUsers,
        features: [...props.initialData.config.features],
      }
      featuresInput.value = props.initialData.config.features.join(', ')
    } else {
      form.value = {
        name: '',
        code: '',
        status: 'active',
        maxUsers: 100,
        features: [],
      }
      featuresInput.value = ''
    }
  }
})

function parseFeatures(): string[] {
  return featuresInput.value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

async function handleSubmit() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入租户名称')
    return
  }
  if (!form.value.code.trim()) {
    ElMessage.warning('请输入租户编码')
    return
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(form.value.code)) {
    ElMessage.warning('编码只能包含字母、数字、下划线和连字符')
    return
  }

  const features = parseFeatures()

  submitting.value = true
  try {
    if (isEditing.value && props.initialData) {
      const payload: TenantUpdatePayload = {
        name: form.value.name,
        code: form.value.code,
        status: form.value.status,
        config: {
          maxUsers: form.value.maxUsers,
          features,
        },
      }
      const result = await tenantStore.updateTenant(props.initialData.id, payload)
      if (result) {
        ElMessage.success('租户更新成功')
        emit('update:visible', false)
        emit('saved')
      } else {
        ElMessage.error(tenantStore.error || '更新失败')
      }
    } else {
      const payload: TenantCreatePayload = {
        name: form.value.name,
        code: form.value.code,
        status: form.value.status,
        config: {
          maxUsers: form.value.maxUsers,
          features,
        },
      }
      const result = await tenantStore.createTenant(payload)
      if (result) {
        ElMessage.success('租户创建成功')
        emit('update:visible', false)
        emit('saved')
      } else {
        ElMessage.error(tenantStore.error || '创建失败')
      }
    }
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  emit('update:visible', false)
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="dialogTitle"
    width="520px"
    :close-on-click-modal="false"
    destroy-on-close
    @close="handleClose"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form label-position="top" @submit.prevent="handleSubmit">
      <el-form-item label="租户名称" required>
        <el-input
          v-model="form.name"
          placeholder="请输入租户名称"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="租户编码" required>
        <el-input
          v-model="form.code"
          placeholder="字母、数字、下划线、连字符"
          maxlength="50"
          :disabled="isEditing"
        />
      </el-form-item>

      <el-form-item label="状态">
        <el-select v-model="form.status" :class="styles.fullWidth">
          <el-option label="启用" value="active" />
          <el-option label="停用" value="inactive" />
          <el-option label="冻结" value="suspended" />
        </el-select>
      </el-form-item>

      <el-form-item label="用户上限">
        <el-input-number
          v-model="form.maxUsers"
          :min="1"
          :max="100000"
          :step="10"
          :class="styles.fullWidth"
        />
      </el-form-item>

      <el-form-item label="功能特性">
        <el-input
          v-model="featuresInput"
          placeholder="多个特性用逗号分隔，如: analytics, reports, api"
        />
        <div :class="styles.featuresHint">
          逗号分隔的功能特性标识
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div :class="styles.footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ isEditing ? '保存' : '创建' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>
