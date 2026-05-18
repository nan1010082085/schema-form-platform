<script setup lang="ts">
/**
 * FgWorkflowForm — 流程表单容器
 * 工具栏 + 内容区 + 意见区，支持工作流引擎集成
 */
import { ref } from 'vue'

export interface OpinionItem {
  id: string
  userName: string
  deptName: string
  content: string
  dateTime: string
  nodeName?: string
}

defineProps<{
  title?: string
  showToolbar?: boolean
  showOpinions?: boolean
  opinions?: OpinionItem[]
  opinionEditable?: boolean
}>()

const emit = defineEmits<{
  'save': []
  'submit': []
  'back': []
  'print': []
  'save-opinion': [content: string]
}>()

const opinionText = ref('')

function handleSaveOpinion() {
  if (!opinionText.value.trim()) return
  emit('save-opinion', opinionText.value)
  opinionText.value = ''
}
</script>

<template>
  <div class="fg-workflow-form">
    <!-- 工具栏 -->
    <div v-if="showToolbar !== false" class="fg-workflow-form__toolbar">
      <div class="fg-workflow-form__title">{{ title }}</div>
      <div class="fg-workflow-form__actions">
        <slot name="toolbar-actions">
          <el-button size="small" @click="emit('back')">返回</el-button>
          <el-button size="small" @click="emit('print')">打印</el-button>
          <el-button type="primary" size="small" @click="emit('save')">保存</el-button>
          <el-button type="primary" size="small" @click="emit('submit')">发送</el-button>
        </slot>
      </div>
    </div>

    <!-- 表单内容区 -->
    <div class="fg-workflow-form__body">
      <slot />
    </div>

    <!-- 意见区 -->
    <div v-if="showOpinions" class="fg-workflow-form__opinions">
      <div class="fg-workflow-form__opinions-header">
        <span class="fg-workflow-form__opinions-title">审批意见</span>
      </div>

      <!-- 意见列表 -->
      <div v-if="opinions?.length" class="fg-workflow-form__opinion-list">
        <div
          v-for="item in opinions"
          :key="item.id"
          class="fg-workflow-form__opinion-item"
        >
          <div class="fg-workflow-form__opinion-meta">
            <span class="fg-workflow-form__opinion-user">{{ item.userName }}</span>
            <span v-if="item.deptName" class="fg-workflow-form__opinion-dept">（{{ item.deptName }}）</span>
            <span v-if="item.nodeName" class="fg-workflow-form__opinion-node">{{ item.nodeName }}</span>
            <span class="fg-workflow-form__opinion-time">{{ item.dateTime }}</span>
          </div>
          <div class="fg-workflow-form__opinion-content">{{ item.content }}</div>
        </div>
      </div>
      <div v-else class="fg-workflow-form__opinion-empty">暂无审批意见</div>

      <!-- 填写意见 -->
      <div v-if="opinionEditable" class="fg-workflow-form__opinion-input">
        <el-input
          v-model="opinionText"
          type="textarea"
          :rows="3"
          placeholder="请输入审批意见"
        />
        <el-button
          type="primary"
          size="small"
          style="margin-top: 8px"
          @click="handleSaveOpinion"
        >
          提交意见
        </el-button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.fg-workflow-form {
  min-height: 100vh;
  background: #f5f7fa;

  &__toolbar {
    min-height: 60px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 24px;
    background: #fff;
    border-bottom: 1px solid #d5dde3;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  &__title {
    font-size: 18px;
    font-weight: 500;
    color: #333;
  }

  &__actions {
    display: flex;
    gap: 8px;
  }

  &__body {
    padding: 16px;
  }

  &__opinions {
    margin: 16px;
    background: #fff;
    border: 1px solid #d5dde3;
    border-radius: 2px;
  }

  &__opinions-header {
    padding: 12px 16px;
    border-bottom: 1px solid #d5dde3;
  }

  &__opinions-title {
    font-size: 15px;
    font-weight: 500;
    color: #333;
  }

  &__opinion-list {
    padding: 0 16px;
  }

  &__opinion-item {
    padding: 12px 0;
    border-bottom: 1px solid #ebedf3;

    &:last-child {
      border-bottom: none;
    }
  }

  &__opinion-meta {
    font-size: 13px;
    color: #666;
    margin-bottom: 6px;
  }

  &__opinion-user {
    font-weight: 500;
    color: #333;
  }

  &__opinion-dept {
    color: #999;
  }

  &__opinion-node {
    margin-left: 8px;
    padding: 1px 6px;
    background: #f0f2f5;
    border-radius: 2px;
    font-size: 12px;
  }

  &__opinion-time {
    float: right;
    color: #999;
  }

  &__opinion-content {
    font-size: 14px;
    color: #333;
    line-height: 1.6;
  }

  &__opinion-empty {
    padding: 24px;
    text-align: center;
    color: #999;
    font-size: 13px;
  }

  &__opinion-input {
    padding: 16px;
    border-top: 1px solid #d5dde3;
  }
}
</style>
