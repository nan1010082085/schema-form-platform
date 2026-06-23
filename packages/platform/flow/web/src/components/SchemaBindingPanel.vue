<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <h4 :class="$style.title">Schema 绑定</h4>
    </div>

    <!-- Schema 选择 -->
    <div :class="$style.field">
      <label :class="$style.label">绑定表单</label>
      <div :class="$style.selector">
        <el-input
          :model-value="schemaName"
          placeholder="点击选择表单"
          readonly
          @click="showSelector = true"
        >
          <template #suffix>
            <el-button link @click="showSelector = true">选择</el-button>
          </template>
        </el-input>
      </div>
    </div>

    <!-- 表单模式 -->
    <div v-if="formSchemaId" :class="$style.field">
      <label :class="$style.label">表单模式</label>
      <el-select
        :model-value="formMode"
        style="width: 100%"
        @change="update('formMode', $event)"
      >
        <el-option label="新建（create）" value="create" />
        <el-option label="查看（view）" value="view" />
        <el-option label="编辑（edit）" value="edit" />
        <el-option label="审批（approve）" value="approve" />
      </el-select>
    </div>

    <!-- 说明 -->
    <div v-if="formSchemaId" :class="$style.hint">
      <p>表单模式说明：</p>
      <ul>
        <li><strong>create</strong> - 新建数据，所有字段可编辑</li>
        <li><strong>view</strong> - 只读查看</li>
        <li><strong>edit</strong> - 编辑已有数据</li>
        <li><strong>approve</strong> - 审批模式，可配置部分字段可编辑</li>
      </ul>
      <p>按钮事件在 Editor 中配置，支持：</p>
      <ul>
        <li><code>completeTask</code> - 完成任务</li>
        <li><code>approveTask</code> - 审批通过</li>
        <li><code>rejectTask</code> - 审批拒绝</li>
      </ul>
    </div>

    <!-- Schema 选择弹窗 -->
    <AppDialog
      v-model="showSelector"
      title="选择表单"
      width="800px"
      destroy-on-close
    >
      <SchemaSelector
        :selected-id="formSchemaId"
        @select="handleSelect"
      />
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SchemaSelector from './SchemaSelector.vue'
import AppDialog from '@schema-form/shared-components/common/AppDialog.vue'

defineProps<{
  formSchemaId?: string
  formPublishId?: string
  formMode?: string
  schemaName?: string
}>()

const emit = defineEmits<{
  update: [key: string, value: unknown]
}>()

const showSelector = ref(false)

function update(key: string, value: unknown) {
  emit('update', key, value)
}

function handleSelect(schema: { id: string; name: string; publishId?: string }) {
  update('formSchemaId', schema.id)
  update('schemaName', schema.name)
  if (schema.publishId) {
    update('formPublishId', schema.publishId)
  }
  showSelector.value = false
}
</script>

<style module>
.container {
  padding: 16px;
}

.header {
  margin-bottom: 16px;
}

.title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color-primary);
}

.field {
  margin-bottom: 16px;
}

.label {
  display: block;
  font-size: 13px;
  color: var(--text-color-secondary);
  margin-bottom: 8px;
}

.selector {
  width: 100%;
}

.hint {
  background: var(--bg-color-secondary);
  border-radius: 8px;
  padding: 12px;
  font-size: 12px;
  color: var(--text-color-secondary);
  line-height: 1.8;
}

.hint p {
  margin: 0 0 8px 0;
}

.hint ul {
  margin: 0;
  padding-left: 20px;
}

.hint li {
  margin-bottom: 4px;
}

.hint code {
  background: var(--color-primary-light);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--color-primary);
}
</style>
