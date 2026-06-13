<script setup lang="ts">
/**
 * CredentialFormDialog -- Create/Edit credential dialog
 *
 * Dynamic fields based on credential type.
 * In edit mode, data fields are pre-filled from the server (decrypted).
 */
import { ref, watch, computed } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
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
    MessagePlugin.warning('Please enter a credential name')
    return
  }

  // Validate all fields are filled
  for (const field of currentFields.value) {
    if (!form.value.data[field]?.trim()) {
      MessagePlugin.warning(`Please fill in ${getFieldLabel(field)}`)
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
        MessagePlugin.success('Credential updated')
        emit('update:visible', false)
        emit('saved')
      } else {
        MessagePlugin.error(credentialStore.error || 'Update failed')
      }
    } else {
      const payload: CredentialCreatePayload = {
        name: form.value.name,
        type: form.value.type,
        data: form.value.data,
      }
      const result = await credentialStore.createCredential(payload)
      if (result) {
        MessagePlugin.success('Credential created')
        emit('update:visible', false)
        emit('saved')
      } else {
        MessagePlugin.error(credentialStore.error || 'Creation failed')
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
  <t-dialog
    :visible="visible"
    :header="dialogTitle"
    width="480px"
    :close-on-overlay-click="false"
    attach="body"
    destroy-on-close
    @update:visible="handleClose"
  >
    <t-form label-align="top" @submit.prevent="handleSubmit">
      <t-form-item label="Name" required-mark>
        <t-input
          v-model="form.name"
          placeholder="e.g. Production API Key"
          maxlength="100"
          show-word-limit
        />
      </t-form-item>

      <t-form-item label="Type" required-mark>
        <t-select v-model="form.type" :class="styles.fullWidth" :disabled="isEditing">
          <t-option
            v-for="opt in typeOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </t-select>
      </t-form-item>

      <template v-for="field in currentFields" :key="field">
        <t-form-item :label="getFieldLabel(field)" required-mark>
          <t-input
            v-model="form.data[field]"
            :type="isPasswordField(field) ? 'password' : 'text'"
            :placeholder="`Enter ${getFieldLabel(field)}`"
          />
        </t-form-item>
      </template>
    </t-form>

    <template #footer>
      <div :class="styles.footer">
        <t-button @click="handleClose">Cancel</t-button>
        <t-button theme="primary" :loading="submitting" @click="handleSubmit">
          {{ isEditing ? 'Save' : 'Create' }}
        </t-button>
      </div>
    </template>
  </t-dialog>
</template>
