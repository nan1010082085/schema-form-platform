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
import { ref, watch } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import type { WidgetEvent, SchemaEventAction, ReceivableEventConfig } from '../../widgets/base/types'
import { useWidgetStore } from '@/stores/widget'
import { getWidget } from '@/widgets/registry'
import EnhancedDialog from '@/components/EnhancedDialog.vue'
import ConditionBuilder from '@/components/Editor/ConditionBuilder.vue'
import ActionListEditor from '@/components/Editor/ActionListEditor.vue'
import type { ActionTypeOption } from '@/components/Editor/ActionListEditor.vue'

const props = defineProps<{
  visible: boolean
  events: WidgetEvent[]
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
</script>

<template>
  <EnhancedDialog
    :model-value="visible"
    title="事件配置"
    width="640px"
    @update:model-value="emit('update:visible', $event)"
  >
    <div :class="$style.body">
      <!-- 空状态 -->
      <div v-if="localEvents.length === 0" :class="$style.empty">
        暂无事件，点击下方按钮添加。
      </div>

      <!-- 事件列表 -->
      <div
        v-for="(evt, ei) in localEvents"
        :key="ei"
        :class="$style.card"
      >
        <div :class="$style.cardHeader">
          <span :class="$style.cardTitle">事件 <span :class="$style.cardNum">{{ ei + 1 }}</span></span>
          <el-button
            type="danger"
            :icon="Delete"
            size="small"
            text
            @click="removeEvent(ei)"
          />
        </div>

        <!-- trigger -->
        <div :class="$style.row">
          <label :class="$style.label">触发</label>
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

        <!-- condition -->
        <div :class="$style.row">
          <label :class="$style.label">条件</label>
          <div :class="$style.conditionArea">
            <ConditionBuilder v-model="evt.condition" />
          </div>
        </div>

        <!-- confirm -->
        <div :class="$style.row">
          <label :class="$style.label">确认</label>
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

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSave">保存</el-button>
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

/* 统一表单控件高度 32px */
.body :global(.el-input__wrapper),
.body :global(.el-select .el-input__wrapper),
.body :global(.el-button:not(.is-text):not(.is-link)) {
  height: 32px !important;
  min-height: 32px !important;
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
</style>
