<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ChatSettings, ReplyLanguage, ReplyStyle, CodeCommentMode, HistorySummaryMode } from '@/types'

export interface AiChatSettingsProps {
  visible: boolean
  settings: ChatSettings
}

const props = defineProps<AiChatSettingsProps>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'update:settings': [settings: ChatSettings]
}>()

// Local copy for editing
const localSettings = ref<ChatSettings>(JSON.parse(JSON.stringify(props.settings)))

// Sync from props when dialog opens
watch(() => props.visible, (val) => {
  if (val) {
    localSettings.value = JSON.parse(JSON.stringify(props.settings))
  }
})

const languageOptions: Array<{ value: ReplyLanguage; label: string }> = [
  { value: 'zh-CN', label: '中文' },
  { value: 'en-US', label: 'English' },
]

const styleOptions: Array<{ value: ReplyStyle; label: string }> = [
  { value: 'concise', label: '简洁' },
  { value: 'detailed', label: '详细' },
]

const codeCommentOptions: Array<{ value: CodeCommentMode; label: string }> = [
  { value: 'yes', label: '是' },
  { value: 'no', label: '否' },
]

const historyModeOptions: Array<{ value: HistorySummaryMode; label: string }> = [
  { value: 'auto', label: '自动生成' },
  { value: 'manual', label: '手动编辑' },
]

function handleClose(): void {
  emit('update:visible', false)
}

function handleSave(): void {
  emit('update:settings', JSON.parse(JSON.stringify(localSettings.value)))
  emit('update:visible', false)
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="对话设置"
    width="420px"
    :close-on-click-modal="true"
    @update:model-value="handleClose"
  >
    <div :class="$style.settingsForm">
      <!-- Section: Preferences -->
      <div :class="$style.section">
        <div :class="$style.sectionTitle">用户偏好</div>

        <div :class="$style.formItem">
          <label :class="$style.label">回复语言</label>
          <el-radio-group
            v-model="localSettings.preferences.replyLanguage"
            :class="$style.radioGroup"
          >
            <el-radio-button
              v-for="opt in languageOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </el-radio-button>
          </el-radio-group>
        </div>

        <div :class="$style.formItem">
          <label :class="$style.label">回复风格</label>
          <el-radio-group
            v-model="localSettings.preferences.replyStyle"
            :class="$style.radioGroup"
          >
            <el-radio-button
              v-for="opt in styleOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </el-radio-button>
          </el-radio-group>
        </div>

        <div :class="$style.formItem">
          <label :class="$style.label">代码注释</label>
          <el-radio-group
            v-model="localSettings.preferences.codeComment"
            :class="$style.radioGroup"
          >
            <el-radio-button
              v-for="opt in codeCommentOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <!-- Section: History Summary -->
      <div :class="$style.section">
        <div :class="$style.sectionTitle">对话历史摘要</div>

        <div :class="$style.formItem">
          <label :class="$style.label">生成方式</label>
          <el-radio-group
            v-model="localSettings.historySummary.mode"
            :class="$style.radioGroup"
          >
            <el-radio-button
              v-for="opt in historyModeOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </el-radio-button>
          </el-radio-group>
        </div>

        <div v-if="localSettings.historySummary.mode === 'manual'" :class="$style.formItem">
          <label :class="$style.label">手动摘要</label>
          <el-input
            v-model="localSettings.historySummary.manualSummary"
            type="textarea"
            :rows="3"
            placeholder="输入对话历史摘要..."
          />
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<style module src="./AiChatSettings.module.css" />
