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

// Sync from props when drawer opens
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
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="visible" :class="$style.overlay" @click.self="handleClose">
        <div :class="$style.drawer">
          <!-- Header -->
          <div :class="$style.header">
            <span :class="$style.title">对话设置</span>
            <button :class="$style.closeBtn" @click="handleClose">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div :class="$style.body">
            <!-- Card: Preferences -->
            <div :class="$style.card">
              <div :class="$style.cardTitle">用户偏好</div>
              <div :class="$style.cardBody">
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
            </div>

            <!-- Card: History Summary -->
            <div :class="$style.card">
              <div :class="$style.cardTitle">对话历史摘要</div>
              <div :class="$style.cardBody">
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
          </div>

          <!-- Footer -->
          <div :class="$style.footer">
            <button :class="$style.cancelBtn" @click="handleClose">取消</button>
            <button :class="$style.saveBtn" @click="handleSave">保存</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style module src="./AiChatSettings.module.css" />
