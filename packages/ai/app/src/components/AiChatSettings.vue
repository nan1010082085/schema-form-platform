<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ChatSettings, ReplyLanguage, ReplyStyle, CodeCommentMode, HistorySummaryMode } from '@/types'
import { checkAIHealth, getModelConfigs, type AIHealthResponse, type ModelConfigItem } from '@/api/aiApi'

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

// Model config state
const modelConfigs = ref<ModelConfigItem[]>([])
const modelConfigsLoading = ref(false)
const selectedModelId = ref<string>('')

// AI health state
const healthData = ref<AIHealthResponse | null>(null)
const healthLoading = ref(false)
const healthError = ref(false)

async function fetchModelConfigs(): Promise<void> {
  modelConfigsLoading.value = true
  try {
    modelConfigs.value = await getModelConfigs()
    const defaultConfig = modelConfigs.value.find(c => c.isDefault)
    if (!selectedModelId.value && defaultConfig) {
      selectedModelId.value = defaultConfig.id
    }
  } catch {
    modelConfigs.value = []
  } finally {
    modelConfigsLoading.value = false
  }
}

async function fetchHealth(): Promise<void> {
  healthLoading.value = true
  healthError.value = false
  try {
    healthData.value = await checkAIHealth()
  } catch {
    healthError.value = true
    healthData.value = null
  } finally {
    healthLoading.value = false
  }
}

// Sync from props when drawer opens
watch(() => props.visible, (val) => {
  if (val) {
    localSettings.value = JSON.parse(JSON.stringify(props.settings))
    selectedModelId.value = (props.settings as unknown as Record<string, unknown>).selectedModelId as string ?? ''
    fetchHealth()
    fetchModelConfigs()
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
  const saved = JSON.parse(JSON.stringify(localSettings.value)) as Record<string, unknown>
  saved.selectedModelId = selectedModelId.value
  emit('update:settings', saved as unknown as ChatSettings)
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
            <t-button :class="$style.closeBtn" variant="text" @click="handleClose">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </t-button>
          </div>

          <!-- Body -->
          <div :class="$style.body">
            <!-- Card: Connection Status -->
            <div :class="$style.card">
              <div :class="$style.cardTitle">连接状态</div>
              <div :class="$style.cardBody">
                <div v-if="healthLoading" :class="$style.statusRow">
                  <span :class="[$style.statusDot, $style.statusChecking]" />
                  <span :class="$style.statusText">检测中...</span>
                </div>
                <div v-else-if="healthError" :class="$style.statusRow">
                  <span :class="[$style.statusDot, $style.statusError]" />
                  <span :class="$style.statusText">无法连接到 AI 服务</span>
                </div>
                <div v-else-if="healthData">
                  <div :class="$style.statusRow">
                    <span :class="[$style.statusDot, healthData.status === 'ok' ? $style.statusOk : $style.statusError]" />
                    <span :class="$style.statusText">
                      {{ healthData.status === 'ok' ? 'API Key 已配置' : '未配置 API Key' }}
                    </span>
                  </div>
                  <div v-if="healthData.providers.length > 0" :class="$style.providerList">
                    <div
                      v-for="p in healthData.providers"
                      :key="p.name"
                      :class="$style.providerItem"
                    >
                      <span :class="$style.providerName">
                        {{ p.name }}
                        <span v-if="p.isDefault" :class="$style.defaultBadge">默认</span>
                      </span>
                      <span :class="$style.providerModel">{{ p.model }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Card: Model Selection -->
            <div :class="$style.card">
              <div :class="$style.cardTitle">模型选择</div>
              <div :class="$style.cardBody">
                <div v-if="modelConfigsLoading" :class="$style.statusRow">
                  <span :class="[$style.statusDot, $style.statusChecking]" />
                  <span :class="$style.statusText">加载模型列表...</span>
                </div>
                <div v-else-if="modelConfigs.length === 0" :class="$style.statusRow">
                  <span :class="$style.statusText">暂无可用模型，请在管理后台配置</span>
                </div>
                <div v-else :class="$style.formItem">
                  <t-select
                    v-model:value="selectedModelId"
                    placeholder="选择模型"
                    style="width: 100%"
                    :options="modelConfigs.map(config => ({
                      label: `${config.name} (${config.model})`,
                      value: config.id,
                    }))"
                  />
                </div>
              </div>
            </div>

            <!-- Card: Preferences -->
            <div :class="$style.card">
              <div :class="$style.cardTitle">用户偏好</div>
              <div :class="$style.cardBody">
                <div :class="$style.formItem">
                  <label :class="$style.label">回复语言</label>
                  <t-radio-group
                    v-model:value="localSettings.preferences.replyLanguage"
                    :class="$style.radioGroup"
                  >
                    <t-radio-button
                      v-for="opt in languageOptions"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </t-radio-button>
                  </t-radio-group>
                </div>

                <div :class="$style.formItem">
                  <label :class="$style.label">回复风格</label>
                  <t-radio-group
                    v-model:value="localSettings.preferences.replyStyle"
                    :class="$style.radioGroup"
                  >
                    <t-radio-button
                      v-for="opt in styleOptions"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </t-radio-button>
                  </t-radio-group>
                </div>

                <div :class="$style.formItem">
                  <label :class="$style.label">代码注释</label>
                  <t-radio-group
                    v-model:value="localSettings.preferences.codeComment"
                    :class="$style.radioGroup"
                  >
                    <t-radio-button
                      v-for="opt in codeCommentOptions"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </t-radio-button>
                  </t-radio-group>
                </div>
              </div>
            </div>

            <!-- Card: History Summary -->
            <div :class="$style.card">
              <div :class="$style.cardTitle">对话历史摘要</div>
              <div :class="$style.cardBody">
                <div :class="$style.formItem">
                  <label :class="$style.label">生成方式</label>
                  <t-radio-group
                    v-model:value="localSettings.historySummary.mode"
                    :class="$style.radioGroup"
                  >
                    <t-radio-button
                      v-for="opt in historyModeOptions"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </t-radio-button>
                  </t-radio-group>
                </div>

                <div v-if="localSettings.historySummary.mode === 'manual'" :class="$style.formItem">
                  <label :class="$style.label">手动摘要</label>
                  <t-textarea
                    v-model:value="localSettings.historySummary.manualSummary"
                    :rows="3"
                    placeholder="输入对话历史摘要..."
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div :class="$style.footer">
            <t-button :class="$style.cancelBtn" @click="handleClose">取消</t-button>
            <t-button :class="$style.saveBtn" theme="primary" @click="handleSave">保存</t-button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style module src="./AiChatSettings.module.css" />
