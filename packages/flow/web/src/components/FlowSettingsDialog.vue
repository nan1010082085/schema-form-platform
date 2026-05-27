<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { FlowPermissions, RejectPolicy } from '@schema-form/flow-shared'
import UserPicker from './UserPicker.vue'

interface SettingsData {
  name: string
  description: string
  category: string
  permissions: FlowPermissions
  defaultRejectPolicy: RejectPolicy
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
  <el-dialog
    title="流程设置"
    :model-value="visible"
    width="560px"
    @close="onCancel"
  >
    <div class="settings-form">
      <div class="field">
        <label class="field-label">流程名称</label>
        <el-input v-model="form.name" placeholder="输入流程名称" />
      </div>

      <div class="field">
        <label class="field-label">描述</label>
        <el-input v-model="form.description" type="textarea" :rows="3" placeholder="流程描述" />
      </div>

      <div class="field">
        <label class="field-label">分类</label>
        <el-input v-model="form.category" placeholder="输入流程分类" />
      </div>

      <el-divider />

      <div class="section-header">流程权限</div>

      <div class="field">
        <label class="field-label">编辑权限</label>
        <UserPicker v-model="form.permissions.editors" placeholder="选择可编辑的用户" />
      </div>

      <div class="field">
        <label class="field-label">发起权限</label>
        <UserPicker v-model="form.permissions.launchers" placeholder="选择可发起的用户" />
        <div class="field-hint">留空表示所有人可发起</div>
      </div>

      <div class="field">
        <label class="field-label">查看权限</label>
        <UserPicker v-model="form.permissions.viewers" placeholder="选择可查看的用户" />
      </div>

      <el-divider />

      <div class="field">
        <label class="field-label">默认驳回策略</label>
        <el-radio-group v-model="form.defaultRejectPolicy">
          <el-radio value="reject-on-all">全部驳回才驳回</el-radio>
          <el-radio value="reject-on-any">一票驳回即驳回</el-radio>
        </el-radio-group>
      </div>
    </div>

    <template #footer>
      <el-button @click="onCancel">取消</el-button>
      <el-button type="primary" @click="onSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.settings-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: #606266;
}

.field-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.section-header {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}
</style>
