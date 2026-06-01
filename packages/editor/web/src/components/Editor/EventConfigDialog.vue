<script setup lang="ts">
/**
 * EventConfigDialog -- WidgetEvent[] 配置对话框
 *
 * 对每个事件支持：
 * - trigger: 触发事件名（select）
 * - condition: 条件表达式（textarea，可选）
 * - confirm: 确认提示（input，可选）
 * - actions[]: 动作列表（type + target + value）
 *
 * 保存时 emit 完整的 WidgetEvent[]，由调用方写入 widget。
 */
import { ref, watch, computed } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import type { WidgetEvent, SchemaEventAction, ReceivableEventConfig, EventTargetConfig } from '../../widgets/base/types'
import { useWidgetStore } from '@/stores/widget'
import { getWidget } from '@/widgets/registry'
import EnhancedDialog from '@/components/EnhancedDialog.vue'
import ConditionBuilder from '@/components/Editor/ConditionBuilder.vue'
import ActionListEditor from '@/components/Editor/ActionListEditor.vue'
import type { ActionTypeOption } from '@/components/Editor/ActionListEditor.vue'
import FlowPreview from '@/components/Editor/FlowPreview.vue'
import type { FlowItem } from '@/components/Editor/FlowPreview.vue'
import styles from './EventConfigDialog.module.scss'

const props = defineProps<{
  visible: boolean
  events: WidgetEvent[]
  eventTargets?: EventTargetConfig[]
}>()

const emit = defineEmits<{
  'update:visible': [val: boolean]
  save: [events: WidgetEvent[]]
}>()

const widgetStore = useWidgetStore()

// ---- 本地编辑副本 ----

const localEvents = ref<WidgetEvent[]>([])

watch(
  () => props.visible,
  (open) => {
    if (open) {
      // 深拷贝，编辑期间不影响原始数据
      localEvents.value = JSON.parse(JSON.stringify(props.events ?? []))
    }
  },
)

// ---- 选项常量 ----

const triggerOptions = [
  { label: '点击', value: 'click' },
  { label: '值变化', value: 'change' },
  { label: '关闭', value: 'close' },
  { label: '失焦', value: 'blur' },
  { label: '聚焦', value: 'focus' },
]

const actionTypeOptions: ActionTypeOption[] = [
  { label: '显示', value: 'show' },
  { label: '隐藏', value: 'hide' },
  { label: '打开弹窗', value: 'open-dialog' },
  { label: '关闭弹窗', value: 'close-dialog' },
  { label: '切换标签', value: 'switch-tab' },
  { label: '设置值', value: 'set-value' },
  { label: '提交表单', value: 'submit' },
  { label: '重置表单', value: 'reset' },
  { label: '触发事件', value: 'emit' },
  { label: '触发组件事件', value: 'trigger-event' },
  { label: '设置变量', value: 'set-variable' },
  { label: '调用 API', value: 'api' },
  { label: '路由跳转', value: 'navigate' },
  { label: '发送消息', value: 'post-message' },
  { label: '复制文本', value: 'copy' },
  { label: '刷新数据', value: 'refresh' },
  { label: '关闭页签', value: 'close-tab' },
]

// ---- 根据目标组件获取可接收事件 ----

function getReceivableEvents(targetId: string): ReceivableEventConfig[] {
  const widget = widgetStore.findWidget(targetId)
  if (!widget) return []
  const registryItem = getWidget(widget.type)
  return registryItem?.config?.receivableEvents ?? []
}

// ---- 事件 CRUD ----

function addEvent() {
  localEvents.value.push({
    trigger: 'click',
    condition: '',
    confirm: '',
    actions: [],
  })
}

function removeEvent(index: number) {
  localEvents.value.splice(index, 1)
}

// ---- 动作更新 ----

function handleActionUpdate(eventIndex: number, actions: SchemaEventAction[]) {
  localEvents.value[eventIndex].actions = actions
}

// ---- 保存 / 关闭 ----

function handleSave() {
  emit('save', localEvents.value)
  emit('update:visible', false)
}

function handleClose() {
  emit('update:visible', false)
}

// ---- 流程预览数据 ----

const triggerLabelMap: Record<string, string> = Object.fromEntries(
  triggerOptions.map(o => [o.value, o.label]),
)

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
  localEvents.value.map(evt => ({
    type: 'trigger',
    label: triggerLabelMap[evt.trigger] ?? evt.trigger,
    description: evt.eventTarget || undefined,
    children: [
      ...(evt.condition ? [{ type: 'condition' as const, label: '条件', description: evt.condition }] : []),
      ...(evt.confirm ? [{ type: 'action' as const, label: '确认', description: evt.confirm }] : []),
      ...evt.actions.map(a => ({
        type: 'action' as const,
        label: getActionLabel(a),
        description: getActionDesc(a),
      })),
    ],
  })),
)
</script>

<template>
  <EnhancedDialog
    :model-value="visible"
    title="事件配置"
    width="1000px"
    @update:model-value="emit('update:visible', $event)"
  >
    <div :class="styles.body">
      <!-- 左侧：配置表单 -->
      <div :class="styles.form">
      <!-- 空状态 -->
      <div v-if="localEvents.length === 0" :class="styles.empty">
        暂无事件，点击下方按钮添加。
      </div>

      <!-- 事件列表 -->
      <div
        v-for="(evt, ei) in localEvents"
        :key="ei"
        :class="styles.card"
      >
        <div :class="styles.cardHeader">
          <span :class="styles.cardTitle">事件 <span :class="styles.cardNum">{{ ei + 1 }}</span></span>
          <el-button
            type="danger"
            :icon="Delete"
            size="small"
            text
            @click="removeEvent(ei)"
          />
        </div>

        <!-- trigger -->
        <div :class="styles.row">
          <label :class="styles.label">触发</label>
          <el-select
            v-model="evt.trigger"
            style="flex: 1"
          >
            <el-option
              v-for="opt in triggerOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </div>

        <!-- eventTarget -->
        <div v-if="eventTargets?.length" :class="styles.row">
          <label :class="styles.label">目标</label>
          <el-select
            v-model="evt.eventTarget"
            style="flex: 1"
            clearable
            placeholder="整个部件"
          >
            <el-option
              v-for="t in eventTargets"
              :key="t.id"
              :label="t.label"
              :value="t.id"
            >
              <span>{{ t.label }}</span>
              <span v-if="t.description" style="color: var(--text-color-muted); font-size: 12px; margin-left: 8px">{{ t.description }}</span>
            </el-option>
          </el-select>
        </div>

        <!-- condition -->
        <div :class="styles.row">
          <label :class="styles.label">条件</label>
          <div :class="styles.conditionArea">
            <ConditionBuilder v-model="evt.condition" />
          </div>
        </div>

        <!-- confirm -->
        <div :class="styles.row">
          <label :class="styles.label">确认</label>
          <el-input
            v-model="evt.confirm"
            placeholder="可选，执行前弹出的确认提示"
          />
        </div>

        <!-- actions -->
        <ActionListEditor
          :actions="evt.actions"
          :action-types="actionTypeOptions"
          :get-receivable-events="getReceivableEvents"
          @update:actions="handleActionUpdate(ei, $event)"
        />
      </div>

      <!-- 添加事件 -->
      <el-button
        type="primary"
        :icon="Plus"
        plain
        style="width: 100%"
        @click="addEvent"
      >
        添加事件
      </el-button>
      </div>

      <!-- 右侧：流程预览 -->
      <div :class="styles.preview">
        <div :class="styles.previewTitle">事件流预览</div>
        <div :class="styles.previewBody">
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
