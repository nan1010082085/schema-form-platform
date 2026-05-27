<script setup lang="ts">
/**
 * LinkageConfigDialog — WidgetEvent[] 规则配置对话框
 *
 * 每条规则输出一个 WidgetEvent：
 * - trigger: 'change'（由监听字段值变化驱动）
 * - condition: 条件表达式
 * - actions: SchemaEventAction[]（直接对接事件引擎）
 */
import { ref, watch, computed } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import { useWidgetOptions } from '@/composables/useWidgetOptions'
import type {
  WidgetEvent,
  SchemaEventAction,
} from '../../widgets/base/types'
import EnhancedDialog from '@/components/EnhancedDialog.vue'
import ConditionBuilder from '@/components/Editor/ConditionBuilder.vue'
import ActionListEditor from '@/components/Editor/ActionListEditor.vue'
import type { ActionTypeOption } from '@/components/Editor/ActionListEditor.vue'
import FlowPreview from '@/components/Editor/FlowPreview.vue'
import type { FlowItem } from '@/components/Editor/FlowPreview.vue'

const props = defineProps<{
  visible: boolean
  events: WidgetEvent[]
}>()

const emit = defineEmits<{
  'update:visible': [val: boolean]
  save: [events: WidgetEvent[]]
}>()

// ---- 部件字段选项 ----
const { allWidgetOptions } = useWidgetOptions()

// ---- 内部编辑模型（与 UI 绑定） ----

interface RuleUI {
  watches: { source: string }[]
  condition: string
  actions: SchemaEventAction[]
}

const localRules = ref<RuleUI[]>([])

/** WidgetEvent[] → RuleUI[] 用于编辑 */
function fromEvents(events: WidgetEvent[]): RuleUI[] {
  return events.map(ev => ({
    watches: [],
    condition: ev.condition ?? '',
    actions: JSON.parse(JSON.stringify(ev.actions)),
  }))
}

/** RuleUI[] → WidgetEvent[] 用于保存 */
function toEvents(rules: RuleUI[]): WidgetEvent[] {
  return rules
    .filter(r => r.actions.length > 0)
    .map(r => ({
      trigger: 'change',
      condition: r.condition || undefined,
      actions: r.actions,
    }))
    .filter(ev => ev.actions.length > 0)
}

watch(
  () => props.visible,
  (open) => {
    if (open) {
      localRules.value = fromEvents(JSON.parse(JSON.stringify(props.events ?? [])))
      if (localRules.value.length === 0) {
        addRule()
      }
    }
  },
)

// ---- 选项常量 ----

const actionTypeOptions: ActionTypeOption[] = [
  { label: '打开弹窗', value: 'open-dialog' },
  { label: '关闭弹窗', value: 'close-dialog' },
  { label: '隐藏组件', value: 'hide' },
  { label: '显示组件', value: 'visible' },
  { label: '禁用组件', value: 'disabled' },
  { label: '设置值', value: 'set-value' },
  { label: '请求数据', value: 'fetch-data' },
  { label: '设置变量', value: 'set-variable' },
  { label: '触发事件', value: 'trigger-event' },
  { label: '提交', value: 'submit' },
  { label: '重置', value: 'reset' },
  { label: '路由跳转', value: 'navigate' },
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

// ---- 监听字段 CRUD ----

function addWatch(ruleIndex: number) {
  localRules.value[ruleIndex].watches.push({ source: '' })
}

function removeWatch(ruleIndex: number, watchIndex: number) {
  localRules.value[ruleIndex].watches.splice(watchIndex, 1)
}

// ---- 动作更新 ----

function handleActionUpdate(ruleIndex: number, actions: SchemaEventAction[]) {
  localRules.value[ruleIndex].actions = actions
}

// ---- 保存 / 关闭 ----

function handleSave() {
  emit('save', toEvents(localRules.value))
  emit('update:visible', false)
}

function handleClose() {
  emit('update:visible', false)
}

// ---- 流程预览数据 ----

const actionLabelMap: Record<string, string> = Object.fromEntries(
  actionTypeOptions.map(o => [o.value, o.label]),
)

function getActionLabel(action: SchemaEventAction): string {
  return actionLabelMap[action.type] ?? action.type
}

function getActionDesc(action: SchemaEventAction): string {
  if (action.target) return action.target
  if (action.apiUrl) return action.apiUrl
  if (action.variable) return action.variable
  if (action.event) return action.event
  if (action.value) return String(action.value)
  return ''
}

const flowItems = computed<FlowItem[]>(() =>
  localRules.value.map(rule => {
    const watchDesc = rule.watches
      .filter(w => w.source)
      .map(w => w.source)
      .join(', ')

    return {
      type: 'trigger' as const,
      label: '值变化',
      description: watchDesc || undefined,
      children: [
        ...(rule.condition ? [{ type: 'condition' as const, label: '条件', description: rule.condition }] : []),
        ...rule.actions.map(a => ({
          type: 'action' as const,
          label: getActionLabel(a),
          description: getActionDesc(a),
        })),
      ],
    }
  }),
)
</script>

<template>
  <EnhancedDialog
    :model-value="visible"
    title="规则配置"
    width="1100px"
    @update:model-value="emit('update:visible', $event)"
  >
    <div :class="$style.body">
      <!-- 左侧：配置表单 -->
      <div :class="$style.form">
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

        <!-- watches（辅助配置，帮助用户理解触发来源） -->
        <div :class="$style.row">
          <label :class="$style.label">监听</label>
          <div :class="$style.conditionArea">
            <div
              v-for="(w, wi) in rule.watches"
              :key="wi"
              :class="$style.watchRow"
            >
              <el-select
                v-model="w.source"
                filterable
                placeholder="选择要监听的字段"
                style="flex: 1"
              >
                <el-option
                  v-for="opt in allWidgetOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>

              <el-button
                type="danger"
                :icon="Delete"
                size="small"
                text
                @click="removeWatch(ri, wi)"
              />
            </div>

            <el-button
              type="primary"
              :icon="Plus"
              size="small"
              text
              @click="addWatch(ri)"
            >
              添加监听
            </el-button>
          </div>
        </div>

        <!-- condition -->
        <div :class="$style.row">
          <label :class="$style.label">条件</label>
          <div :class="$style.conditionArea">
            <ConditionBuilder v-model="rule.condition" required />
          </div>
        </div>

        <!-- actions -->
        <ActionListEditor
          :actions="rule.actions"
          :action-types="actionTypeOptions"
          @update:actions="handleActionUpdate(ri, $event)"
        />
      </div>

      <!-- 添加规则 -->
      <el-button
        type="primary"
        :icon="Plus"
        plain
        style="width: 100%"
        @click="addRule"
      >
        添加规则
      </el-button>
      </div>

      <!-- 右侧：流程预览 -->
      <div :class="$style.preview">
        <div :class="$style.previewTitle">规则流预览</div>
        <div :class="$style.previewBody">
          <FlowPreview :items="flowItems" />
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSave">保存</el-button>
    </template>
  </EnhancedDialog>
</template>

<style module>
.body {
  height: 60vh;
  display: flex;
  gap: 16px;
  min-height: 0;
}

/* 统一表单控件高度 32px */
.body :global(.el-input__wrapper),
.body :global(.el-select .el-input__wrapper),
.body :global(.el-button:not(.is-text):not(.is-link)) {
  height: 32px !important;
  min-height: 32px !important;
}

.form {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview {
  width: 280px;
  flex-shrink: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #fafbfc;
}

.previewTitle {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  padding: 10px 12px;
  border-bottom: 1px solid #ebeef5;
}

.previewBody {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 12px;
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
  color: var(--el-color-primary);
  font-weight: 700;
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

.conditionArea {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.watchRow {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
</style>
