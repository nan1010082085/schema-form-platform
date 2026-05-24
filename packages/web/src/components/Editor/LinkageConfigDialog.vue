<script setup lang="ts">
/**
 * LinkageConfigDialog -- WidgetRule[] 配置对话框
 *
 * 对每条规则支持：
 * - watches[]: 监听源列表（type + source）
 * - condition: 条件表达式（必填）
 * - actions[]: 动作列表（type + config JSON + onSuccess/onError 计数展示）
 *
 * 保存时 emit 完整的 WidgetRule[]，由调用方写入 widget。
 */
import { ref, watch } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import { useWidgetOptions } from '@/composables/useWidgetOptions'
import type {
  WidgetRule,
  WidgetRuleWatch,
  WidgetRuleAction,
} from '../../widgets/base/types'
import EnhancedDialog from '@/components/EnhancedDialog.vue'

const props = defineProps<{
  visible: boolean
  rules: WidgetRule[]
}>()

const emit = defineEmits<{
  'update:visible': [val: boolean]
  save: [rules: WidgetRule[]]
}>()

// ---- 部件字段选项 ----
const { widgetOptions } = useWidgetOptions()

// ---- 本地编辑副本 ----

const localRules = ref<WidgetRule[]>([])

watch(
  () => props.visible,
  (open) => {
    if (open) {
      localRules.value = JSON.parse(JSON.stringify(props.rules ?? []))
      // 清空配置文本缓存，避免上次编辑残留
      configTexts.value = {}
      configErrors.value = {}
    }
  },
)

// ---- 选项常量 ----

const watchTypeOptions: { label: string; value: WidgetRuleWatch['type'] }[] = [
  { label: '字段值变化', value: 'field' },
  { label: '组件动作', value: 'action' },
  { label: '弹窗回调', value: 'dialog-callback' },
]

const actionTypeOptions: { label: string; value: WidgetRuleAction['type'] }[] = [
  { label: '请求数据', value: 'fetch-data' },
  { label: '设置值', value: 'set-value' },
  { label: '提交', value: 'submit' },
  { label: '校验', value: 'validate' },
  { label: '重置', value: 'reset' },
  { label: '隐藏', value: 'hide' },
  { label: '可见', value: 'visible' },
  { label: '禁用', value: 'disabled' },
]

// ---- 规则 CRUD ----

function addRule() {
  localRules.value.push({
    watches: [],
    condition: '',
    actions: [],
  })
}

function removeRule(index: number) {
  localRules.value.splice(index, 1)
}

// ---- 监听源 CRUD ----

function addWatch(ruleIndex: number) {
  localRules.value[ruleIndex].watches.push({
    type: 'field',
    source: '',
  })
}

function removeWatch(ruleIndex: number, watchIndex: number) {
  localRules.value[ruleIndex].watches.splice(watchIndex, 1)
}

// ---- 动作 CRUD ----

function addAction(ruleIndex: number) {
  localRules.value[ruleIndex].actions.push({
    type: 'set-value',
    config: {},
  })
}

function removeAction(ruleIndex: number, actionIndex: number) {
  localRules.value[ruleIndex].actions.splice(actionIndex, 1)
}

/** 将 config 对象格式化为 JSON 字符串用于 textarea */
function configToText(config: Record<string, unknown>): string {
  if (!config || Object.keys(config).length === 0) return '{}'
  return JSON.stringify(config, null, 2)
}

/**
 * 动作配置的本地文本状态（防止输入过程中 JSON 解析失败覆盖用户输入）
 * key 格式: `${ruleIndex}-${actionIndex}`
 */
const configTexts = ref<Record<string, string>>({})
const configErrors = ref<Record<string, string>>({})

function getConfigText(ruleIndex: number, actionIndex: number, config: Record<string, unknown>): string {
  const key = `${ruleIndex}-${actionIndex}`
  if (key in configTexts.value) return configTexts.value[key]
  return configToText(config)
}

function handleConfigChange(ruleIndex: number, actionIndex: number, text: string) {
  const key = `${ruleIndex}-${actionIndex}`
  configTexts.value[key] = text
  if (!text.trim()) {
    configErrors.value[key] = ''
    localRules.value[ruleIndex].actions[actionIndex].config = {}
    return
  }
  try {
    const parsed = JSON.parse(text)
    configErrors.value[key] = ''
    localRules.value[ruleIndex].actions[actionIndex].config = parsed
  } catch {
    configErrors.value[key] = 'JSON 格式有误，继续编辑即可'
  }
}

// ---- 保存 / 关闭 ----

function handleSave() {
  emit('save', localRules.value)
  emit('update:visible', false)
}

function handleClose() {
  emit('update:visible', false)
}
</script>

<template>
  <EnhancedDialog
    :model-value="visible"
    title="规则配置"
    width="700px"
    @update:model-value="emit('update:visible', $event)"
  >
    <div :class="$style.body">
      <!-- 空状态 -->
      <div v-if="localRules.length === 0" :class="$style.empty">
        暂无规则，点击下方按钮添加。
      </div>

      <!-- 规则列表 -->
      <div
        v-for="(rule, ri) in localRules"
        :key="ri"
        :class="$style.card"
      >
        <div :class="$style.cardHeader">
          <span :class="$style.cardTitle">规则 <span :class="$style.cardNum">{{ ri + 1 }}</span></span>
          <el-button
            type="danger"
            :icon="Delete"
            size="small"
            text
            @click="removeRule(ri)"
          />
        </div>

        <!-- watches -->
        <div :class="$style.section">
          <div :class="$style.sectionHeader">
            <span :class="$style.sectionTitle">监听条件</span>
            <el-button
              type="primary"
              :icon="Plus"
              size="small"
              text
              @click="addWatch(ri)"
            >
              添加
            </el-button>
          </div>

          <div v-if="rule.watches.length === 0" :class="$style.sectionEmpty">
            暂无监听条件，添加后当指定字段值变化或组件动作触发时执行规则
          </div>

          <div
            v-for="(w, wi) in rule.watches"
            :key="wi"
            :class="$style.watchRow"
          >
            <el-select
              v-model="w.type"
              size="small"
              style="width: 120px"
            >
              <el-option
                v-for="opt in watchTypeOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>

            <el-select
              v-if="w.type === 'field'"
              v-model="w.source"
              size="small"
              filterable
              placeholder="选择字段"
              style="flex: 1"
            >
              <el-option
                v-for="opt in widgetOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
            <el-input
              v-else
              v-model="w.source"
              size="small"
              placeholder="动作名 / 弹窗ID"
              style="flex: 1"
            />

            <el-button
              type="danger"
              :icon="Delete"
              size="small"
              text
              @click="removeWatch(ri, wi)"
            />
          </div>
        </div>

        <!-- condition -->
        <div :class="$style.row">
          <label :class="$style.label">条件</label>
          <el-input
            v-model="rule.condition"
            type="textarea"
            :rows="2"
            size="small"
            placeholder="必填，表达式如: status === 'draft' 或 amount > 100"
          />
        </div>

        <!-- actions -->
        <div :class="$style.section">
          <div :class="$style.sectionHeader">
            <span :class="$style.sectionTitle">执行动作</span>
            <el-button
              type="primary"
              :icon="Plus"
              size="small"
              text
              @click="addAction(ri)"
            >
              添加
            </el-button>
          </div>

          <div v-if="rule.actions.length === 0" :class="$style.sectionEmpty">
            暂无动作
          </div>

          <div
            v-for="(action, ai) in rule.actions"
            :key="ai"
            :class="$style.actionCard"
          >
            <div :class="$style.actionHeader">
              <span :class="$style.actionIndex">动作 {{ ai + 1 }}</span>
              <el-button
                type="danger"
                :icon="Delete"
                size="small"
                text
                @click="removeAction(ri, ai)"
              />
            </div>

            <!-- action type -->
            <div :class="$style.row">
              <label :class="$style.label">类型</label>
              <el-select
                v-model="action.type"
                size="small"
                style="flex: 1"
              >
                <el-option
                  v-for="opt in actionTypeOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </div>

            <!-- config JSON -->
            <div :class="$style.row">
              <label :class="$style.label">参数</label>
              <div style="flex: 1">
                <el-input
                  :model-value="getConfigText(ri, ai, action.config)"
                  type="textarea"
                  :rows="3"
                  size="small"
                  placeholder='{"key": "value"}'
                  :class="{ [$style.inputError]: !!configErrors[`${ri}-${ai}`] }"
                  @update:model-value="handleConfigChange(ri, ai, $event)"
                />
                <div v-if="configErrors[`${ri}-${ai}`]" :class="$style.configError">
                  {{ configErrors[`${ri}-${ai}`] }}
                </div>
              </div>
            </div>

            <!-- callback summary -->
            <div :class="$style.callbackSummary">
              <span :class="$style.callbackTag">
                成功回调: {{ action.onSuccess?.length ?? 0 }} 个
              </span>
              <span :class="$style.callbackTag">
                失败回调: {{ action.onError?.length ?? 0 }} 个
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 添加规则 -->
      <el-button
        type="primary"
        :icon="Plus"
        size="small"
        plain
        style="width: 100%"
        @click="addRule"
      >
        添加规则
      </el-button>
    </div>

    <template #footer>
      <el-button size="small" @click="handleClose">取消</el-button>
      <el-button type="primary" size="small" @click="handleSave">保存</el-button>
    </template>
  </EnhancedDialog>
</template>

<style module>
.body {
  max-height: 60vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty {
  text-align: center;
  color: #909399;
  font-size: 13px;
  padding: 24px 0;
}

.card {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 12px;
  background: #fafbfc;
}

.cardHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.cardTitle {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.cardNum {
  color: #409eff;
  font-weight: 700;
}

.section {
  margin-top: 8px;
  border-top: 1px solid #ebeef5;
  padding-top: 8px;
}

.sectionHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.sectionTitle {
  font-size: 12px;
  font-weight: 500;
  color: #606266;
}

.sectionEmpty {
  font-size: 12px;
  color: #c0c4cc;
  text-align: center;
  padding: 8px 0;
}

.row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.label {
  width: 50px;
  flex-shrink: 0;
  font-size: 12px;
  color: #606266;
  line-height: 32px;
}

.watchRow {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.actionCard {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 8px;
  background: #fff;
}

.actionHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.actionIndex {
  font-size: 12px;
  font-weight: 500;
  color: #606266;
}

.callbackSummary {
  display: flex;
  gap: 12px;
  margin-top: 4px;
}

.callbackTag {
  font-size: 11px;
  color: #909399;
  background: #f4f4f5;
  padding: 2px 8px;
  border-radius: 3px;
}

.configError {
  font-size: 11px;
  color: #e6a23c;
  margin-top: 3px;
}

.inputError :deep(.el-textarea__inner) {
  border-color: #e6a23c;
}
</style>
