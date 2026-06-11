<script setup lang="ts">
/**
 * CredentialFormDialog -- Create/Edit credential dialog
 *
 * Dynamic fields based on credential type.
 * In edit mode, data fields are pre-filled from the server (decrypted).
 */
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useCredentialStore } from '@/stores/credential'
import type {
  CredentialItem,
  CredentialDetail,
  CredentialType,
  CredentialCreatePayload,
  CredentialUpdatePayload,
} from '@/types/credential'
import {
  CREDENTIAL_TYPE_LABELS,
  CREDENTIAL_TYPE_FIELDS,
  CREDENTIAL_TYPE_FIELD_LABELS,
} from '@/types/credential'
import styles from './CredentialFormDialog.module.scss'

const props = defineProps<{
  visible: boolean
  initialData?: CredentialDetail | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  saved: []
}>()

const credentialStore = useCredentialStore()

const isEditing = computed(() => !!props.initialData)
const dialogTitle = computed(() => isEditing.value ? 'Edit Credential' : 'Create Credential')
const submitting = ref(false)

const form = ref({
  name: '',
  type: 'api_key' as CredentialType,
  data: {} as Record<string, string>,
})

const typeOptions = computed(() =>
  Object.entries(CREDENTIAL_TYPE_LABELS).map(([value, label]) => ({ value, label })),
)

const currentFields = computed(() => CREDENTIAL_TYPE_FIELDS[form.value.type] ?? [])

watch(() => props.visible, (val) => {
  if (val) {
    if (props.initialData) {
      form.value = {
        name: props.initialData.name,
        type: props.initialData.type,
        data: { ...props.initialData.data },
      }
    } else {
      form.value = {
        name: '',
        type: 'api_key',
        data: {},
      }
    }
  }
})

watch(() => form.value.type, (newType, oldType) => {
  if (newType !== oldType && !isEditing.value) {
    // Reset data fields when type changes (create mode only)
    const fields = CREDENTIAL_TYPE_FIELDS[newType] ?? []
    const newData: Record<string, string> = {}
    for (const field of fields) {
      newData[field] = ''
    }
    form.value.data = newData
  }
})

function getFieldLabel(field: string): string {
  return CREDENTIAL_TYPE_FIELD_LABELS[field] ?? field
}

function isPasswordField(field: string): boolean {
  return field === 'password' || field === 'token' || field === 'apiKey'
}

async function handleSubmit() {
  if (!form.value.name.trim()) {
    ElMessage.warning('Please enter a credential name')
    return
  }

  // Validate all fields are filled
  for (const field of currentFields.value) {
    if (!form.value.data[field]?.trim()) {
      ElMessage.warning(`Please fill in ${getFieldLabel(field)}`)
      return
    }
  }

  submitting.value = true
  try {
    if (isEditing.value && props.initialData) {
      const payload: CredentialUpdatePayload = {
        name: form.value.name,
        type: form.value.type,
        data: form.value.data,
      }
      const result = await credentialStore.updateCredential(props.initialData.id, payload)
      if (result) {
        ElMessage.success('Credential updated')
        emit('update:visible', false)
        emit('saved')
      } else {
        ElMessage.error(credentialStore.error || 'Update failed')
      }
    } else {
      const payload: CredentialCreatePayload = {
        name: form.value.name,
        type: form.value.type,
        data: form.value.data,
      }
      const result = await credentialStore.createCredential(payload)
      if (result) {
        ElMessage.success('Credential created')
        emit('update:visible', false)
        emit('saved')
      } else {
        ElMessage.error(credentialStore.error || 'Creation failed')
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
    width="480px"
    :close-on-click-modal="false"
    append-to-body
    destroy-on-close
    @update:model-value="handleClose"
  >
    <el-form label-position="top" @submit.prevent="handleSubmit">
      <el-form-item label="Name" required>
        <el-input
          v-model="form.name"
          placeholder="e.g. Production API Key"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="Type" required>
        <el-select v-model="form.type" :class="styles.fullWidth" :disabled="isEditing">
          <el-option
            v-for="opt in typeOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>

      <template v-for="field in currentFields" :key="field">
        <el-form-item :label="getFieldLabel(field)" required>
          <el-input
            v-model="form.data[field]"
            :type="isPasswordField(field) ? 'password' : 'text'"
            :show-password="isPasswordField(field)"
            :placeholder="`Enter ${getFieldLabel(field)}`"
          />
        </el-form-item>
      </template>
    </el-form>

    <template #footer>
      <div :class="styles.footer">
        <el-button @click="handleClose">Cancel</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ isEditing ? 'Save' : 'Create' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>
