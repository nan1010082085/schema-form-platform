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
import type { WidgetEvent, EventActionType } from '../../widgets/base/types'
import EnhancedDialog from '@/components/EnhancedDialog.vue'

const props = defineProps<{
  visible: boolean
  events: WidgetEvent[]
}>()

const emit = defineEmits<{
  'update:visible': [val: boolean]
  save: [events: WidgetEvent[]]
}>()

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
]

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
          <span :class="$style.cardTitle">事件 {{ ei + 1 }}</span>
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
          <el-input
            v-model="evt.condition"
            type="textarea"
            :rows="2"
            size="small"
            placeholder="可选，表达式如: model.status === 'active'"
          />
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

              <!-- target -->
              <el-input
                v-model="action.target"
                size="small"
                placeholder="目标组件 ID"
                style="flex: 1"
              />

              <!-- value (for switch-tab) -->
              <el-input
                v-if="action.type === 'switch-tab'"
                v-model="action.value as string"
                size="small"
                placeholder="标签 key"
                style="width: 120px"
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
</style>
