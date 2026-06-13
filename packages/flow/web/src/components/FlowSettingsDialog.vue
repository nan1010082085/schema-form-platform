<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { FlowPermissions, FlowPermissionItem } from '@schema-form/flow-shared'
import UserPicker from './UserPicker.vue'
import styles from './FlowSettingsDialog.module.scss'

interface SettingsData {
  name: string
  description: string
  category: string
  permissions: FlowPermissions
  defaultRejectPolicy: 'reject-on-all' | 'reject-on-any'
}

const props = defineProps<{
  visible: boolean
  settings: SettingsData
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  save: [settings: SettingsData]
}>()

const form = reactive<SettingsData>({
  name: '',
  description: '',
  category: '',
  permissions: { editors: [], launchers: [], viewers: [] },
  defaultRejectPolicy: 'reject-on-all',
})

watch(() => props.visible, (v) => {
  if (v) {
    form.name = props.settings.name
    form.description = props.settings.description
    form.category = props.settings.category
    form.permissions = {
      editors: [...(props.settings.permissions.editors ?? [])],
      launchers: [...(props.settings.permissions.launchers ?? [])],
      viewers: [...(props.settings.permissions.viewers ?? [])],
    }
    form.defaultRejectPolicy = props.settings.defaultRejectPolicy
  }
})

// 将 FlowPermissionItem[] 转换为 string[] 供 UserPicker 使用
function permissionItemsToStrings(items: FlowPermissionItem[]): string[] {
  return items.map(item => `${item.type}:${item.id}`)
}

// 将 string[] 转换为 FlowPermissionItem[]
function stringsToPermissionItems(strings: string[]): FlowPermissionItem[] {
  return strings.map(str => {
    const [type, id] = str.split(':')
    return { type: type as 'user' | 'role', id }
  })
}

function onCancel() {
  emit('update:visible', false)
}

function onSave() {
  emit('save', {
    name: form.name,
    description: form.description,
    category: form.category,
    permissions: {
      editors: form.permissions.editors ?? [],
      launchers: form.permissions.launchers ?? [],
      viewers: form.permissions.viewers ?? [],
    },
    defaultRejectPolicy: form.defaultRejectPolicy,
  })
  emit('update:visible', false)
}
</script>

<template>
  <t-dialog
    header="流程设置"
    :visible="visible"
    width="560px"
    :close-on-overlay-click="false"
    @close="onCancel"
  >
    <div :class="styles.settingsForm">
      <div :class="styles.field">
        <label :class="styles.fieldLabel">流程名称</label>
        <t-input v-model:value="form.name" placeholder="输入流程名称" />
      </div>

      <div :class="styles.field">
        <label :class="styles.fieldLabel">描述</label>
        <t-input v-model:value="form.description" type="textarea" :rows="3" placeholder="流程描述" />
      </div>

      <div :class="styles.field">
        <label :class="styles.fieldLabel">分类</label>
        <t-input v-model:value="form.category" placeholder="输入流程分类" />
      </div>

      <t-divider />

      <div :class="styles.sectionHeader">流程权限</div>

      <div :class="styles.field">
        <label :class="styles.fieldLabel">编辑权限</label>
        <UserPicker
          :model-value="permissionItemsToStrings(form.permissions.editors ?? [])"
          placeholder="选择可编辑的用户或角色"
          @update:model-value="form.permissions.editors = stringsToPermissionItems($event)"
        />
      </div>

      <div :class="styles.field">
        <label :class="styles.fieldLabel">发起权限</label>
        <UserPicker
          :model-value="permissionItemsToStrings(form.permissions.launchers ?? [])"
          placeholder="选择可发起的用户或角色"
          @update:model-value="form.permissions.launchers = stringsToPermissionItems($event)"
        />
        <div :class="styles.fieldHint">留空表示所有人可发起</div>
      </div>

      <div :class="styles.field">
        <label :class="styles.fieldLabel">查看权限</label>
        <UserPicker
          :model-value="permissionItemsToStrings(form.permissions.viewers ?? [])"
          placeholder="选择可查看的用户或角色"
          @update:model-value="form.permissions.viewers = stringsToPermissionItems($event)"
        />
      </div>

      <t-divider />

      <div :class="styles.field">
        <label :class="styles.fieldLabel">默认驳回策略</label>
        <t-radio-group v-model:value="form.defaultRejectPolicy">
          <t-radio value="reject-on-all">全部驳回才驳回</t-radio>
          <t-radio value="reject-on-any">一票驳回即驳回</t-radio>
        </t-radio-group>
      </div>
    </div>

    <template #footer>
      <t-button @click="onCancel">取消</t-button>
      <t-button theme="primary" @click="onSave">保存</t-button>
    </template>
  </t-dialog>
</template>
