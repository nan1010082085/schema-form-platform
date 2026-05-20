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
  <div :class="$style.form">
    <!-- 工具栏 -->
    <div v-if="showToolbar !== false" :class="$style.toolbar">
      <div :class="$style.title">{{ title }}</div>
      <div :class="$style.actions">
        <slot name="toolbar-actions">
          <el-button size="small" @click="emit('back')">返回</el-button>
          <el-button size="small" @click="emit('print')">打印</el-button>
          <el-button type="primary" size="small" @click="emit('save')">保存</el-button>
          <el-button type="primary" size="small" @click="emit('submit')">发送</el-button>
        </slot>
      </div>
    </div>

    <!-- 表单内容区 -->
    <div :class="$style.body">
      <slot />
    </div>

    <!-- 意见区 -->
    <div v-if="showOpinions" :class="$style.opinions">
      <div :class="$style.opinionsHeader">
        <span :class="$style.opinionsTitle">审批意见</span>
      </div>

      <!-- 意见列表 -->
      <div v-if="opinions?.length" :class="$style.opinionList">
        <div
          v-for="item in opinions"
          :key="item.id"
          :class="$style.opinionItem"
        >
          <div :class="$style.opinionMeta">
            <span :class="$style.opinionUser">{{ item.userName }}</span>
            <span v-if="item.deptName" :class="$style.opinionDept">（{{ item.deptName }}）</span>
            <span v-if="item.nodeName" :class="$style.opinionNode">{{ item.nodeName }}</span>
            <span :class="$style.opinionTime">{{ item.dateTime }}</span>
          </div>
          <div :class="$style.opinionContent">{{ item.content }}</div>
        </div>
      </div>
      <div v-else :class="$style.opinionEmpty">暂无审批意见</div>

      <!-- 填写意见 -->
      <div v-if="opinionEditable" :class="$style.opinionInput">
        <el-input
          v-model="opinionText"
          type="textarea"
          :rows="3"
          placeholder="请输入审批意见"
        />
        <el-button
          type="primary"
          size="small"
          :class="$style.submitBtn"
          @click="handleSaveOpinion"
        >
          提交意见
        </el-button>
      </div>
    </div>
  </div>
</template>

<style module lang="scss">
.form {
  min-height: 100vh;
  background: #f5f7fa;
}

.toolbar {
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

.title {
  font-size: 18px;
  font-weight: 500;
  color: #333;
}

.actions {
  display: flex;
  gap: 8px;
}

.body {
  padding: 16px;
}

.opinions {
  margin: 16px;
  background: #fff;
  border: 1px solid #d5dde3;
  border-radius: 2px;
}

.opinionsHeader {
  padding: 12px 16px;
  border-bottom: 1px solid #d5dde3;
}

.opinionsTitle {
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.opinionList {
  padding: 0 16px;
}

.opinionItem {
  padding: 12px 0;
  border-bottom: 1px solid #ebedf3;

  &:last-child {
    border-bottom: none;
  }
}

.opinionMeta {
  font-size: 13px;
  color: #666;
  margin-bottom: 6px;
}

.opinionUser {
  font-weight: 500;
  color: #333;
}

.opinionDept {
  color: #999;
}

.opinionNode {
  margin-left: 8px;
  padding: 1px 6px;
  background: #f0f2f5;
  border-radius: 2px;
  font-size: 12px;
}

.opinionTime {
  float: right;
  color: #999;
}

.opinionContent {
  font-size: 14px;
  color: #333;
  line-height: 1.6;
}

.opinionEmpty {
  padding: 24px;
  text-align: center;
  color: #999;
  font-size: 13px;
}

.opinionInput {
  padding: 16px;
  border-top: 1px solid #d5dde3;
}

.submitBtn {
  margin-top: 8px;
}
</style>
