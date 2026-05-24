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
import type { WidgetEvent, EventActionType, ReceivableEventConfig } from '../../widgets/base/types'
import { useWidgetStore } from '@/stores/widget'
import { getWidget } from '@/widgets/registry'
import EnhancedDialog from '@/components/EnhancedDialog.vue'
import ConditionBuilder from '@/components/Editor/ConditionBuilder.vue'

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

const actionTypeOptions: { label: string; value: EventActionType }[] = [
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

// ---- 目标组件列表（用于 target 选择） ----

interface WidgetOption {
  label: string
  value: string
  type: string
}

const widgetOptions = computed<WidgetOption[]>(() => {
  const result: WidgetOption[] = []
  function collect(list: typeof widgetStore.widgets) {
    for (const w of list) {
      result.push({
        label: `${w.label || w.type} (${w.id})`,
        value: w.id,
        type: w.type,
      })
      if (w.children?.length) collect(w.children)
    }
  }
  collect(widgetStore.widgets)
  return result
})

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

// ---- 动作 CRUD ----

function addAction(eventIndex: number) {
  localEvents.value[eventIndex].actions.push({
    type: 'show',
    target: '',
  })
}

function removeAction(eventIndex: number, actionIndex: number) {
  localEvents.value[eventIndex].actions.splice(actionIndex, 1)
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
            size="small"
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
            size="small"
            placeholder="可选，执行前弹出的确认提示"
          />
        </div>

        <!-- actions -->
        <div :class="$style.actionsSection">
          <div :class="$style.actionsHeader">
            <span :class="$style.actionsTitle">动作列表</span>
            <el-button
              type="primary"
              :icon="Plus"
              size="small"
              text
              @click="addAction(ei)"
            >
              添加动作
            </el-button>
          </div>

          <div v-if="evt.actions.length === 0" :class="$style.actionsEmpty">
            暂无动作
          </div>

          <div
            v-for="(action, ai) in evt.actions"
            :key="ai"
            :class="$style.actionRow"
          >
            <div :class="$style.actionFields">
              <!-- action type -->
              <el-select
                v-model="action.type"
                size="small"
                placeholder="动作类型"
                style="width: 140px"
              >
                <el-option
                  v-for="opt in actionTypeOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>

              <!-- target: 组件选择（show/hide/open-dialog/switch-tab/set-value/trigger-event/refresh/close-dialog） -->
              <el-select
                v-if="['show','hide','open-dialog','switch-tab','set-value','trigger-event','refresh'].includes(action.type)"
                v-model="action.target"
                size="small"
                filterable
                placeholder="选择目标组件"
                style="flex: 1"
              >
                <el-option
                  v-for="opt in widgetOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>

              <!-- trigger-event: 选择目标组件可接收的事件 -->
              <el-select
                v-if="action.type === 'trigger-event' && action.target"
                v-model="action.event"
                size="small"
                placeholder="选择事件"
                style="width: 160px"
              >
                <el-option
                  v-for="evtOpt in getReceivableEvents(action.target)"
                  :key="evtOpt.name"
                  :label="`${evtOpt.name} — ${evtOpt.description}`"
                  :value="evtOpt.name"
                />
              </el-select>

              <!-- set-variable: 变量名 -->
              <el-input
                v-if="action.type === 'set-variable'"
                v-model="action.variable"
                size="small"
                placeholder="变量名"
                style="width: 120px"
              />

              <!-- set-variable / switch-tab / emit: value -->
              <el-input
                v-if="action.type === 'switch-tab' || action.type === 'set-value' || action.type === 'emit'"
                v-model="action.value as string"
                size="small"
                :placeholder="action.type === 'switch-tab' ? '标签 key' : action.type === 'set-value' ? '设置的值' : '事件 payload'"
                style="width: 140px"
              />

              <!-- api: URL + method -->
              <el-input
                v-if="action.type === 'api'"
                v-model="action.apiUrl"
                size="small"
                placeholder="API 地址"
                style="flex: 1"
              />
              <el-select
                v-if="action.type === 'api'"
                v-model="action.apiMethod"
                size="small"
                style="width: 90px"
              >
                <el-option label="POST" value="post" />
                <el-option label="GET" value="get" />
                <el-option label="PUT" value="put" />
                <el-option label="DELETE" value="delete" />
              </el-select>

              <!-- navigate: path -->
              <el-input
                v-if="action.type === 'navigate'"
                v-model="action.navigatePath"
                size="small"
                placeholder="路由路径"
                style="flex: 1"
              />

              <!-- post-message: message (JSON) -->
              <el-input
                v-if="action.type === 'post-message'"
                v-model="action.message"
                size="small"
                placeholder='消息 JSON，如 {"type":"save"}'
                style="flex: 1"
              />

              <!-- copy: text -->
              <el-input
                v-if="action.type === 'copy'"
                v-model="action.text"
                size="small"
                placeholder="复制内容（支持 formData.xxx）"
                style="flex: 1"
              />
            </div>

            <el-button
              type="danger"
              :icon="Delete"
              size="small"
              text
              @click="removeAction(ei, ai)"
            />
          </div>
        </div>
      </div>

      <!-- 添加事件 -->
      <el-button
        type="primary"
        :icon="Plus"
        size="small"
        plain
        style="width: 100%"
        @click="addEvent"
      >
        添加事件
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

.actionsSection {
  margin-top: 4px;
  border-top: 1px solid #ebeef5;
  padding-top: 8px;
}

.actionsHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.actionsTitle {
  font-size: 12px;
  font-weight: 500;
  color: #606266;
}

.actionsEmpty {
  font-size: 12px;
  color: #c0c4cc;
  text-align: center;
  padding: 8px 0;
}

.actionRow {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.actionFields {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
}

.conditionArea {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
