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
import { useWidgetStore } from '@/stores/widget'
import type {
  WidgetEvent,
  SchemaEventAction,
  EventActionType,
} from '../../widgets/base/types'
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

// ---- 部件字段选项 ----
const { widgetOptions, allWidgetOptions } = useWidgetOptions()

// ---- 所有组件 ID 选项 ----
const widgetStore = useWidgetStore()

interface WidgetIdOption {
  label: string
  value: string
  type: string
}

const widgetIdOptions = computed<WidgetIdOption[]>(() => {
  const result: WidgetIdOption[] = []
  function collect(list: typeof widgetStore.widgets) {
    for (const w of list) {
      result.push({
        label: `${w.label || w.type}（${w.id}）`,
        value: w.id,
        type: w.type,
      })
      if (w.children?.length) collect(w.children)
    }
  }
  collect(widgetStore.widgets)
  return result
})

// ---- 内部编辑模型（与 UI 绑定） ----

interface RuleActionUI {
  type: EventActionType | 'visible' | 'disabled' | 'fetch-data'
  target: string
  value: string
  /** fetch-data 专用 */
  apiUrl: string
  apiMethod: 'get' | 'post' | 'put' | 'delete'
  /** set-variable 专用 */
  variable: string
  /** trigger-event 专用 */
  eventTarget: string
  eventName: string
}

interface RuleUI {
  watches: { source: string }[]
  condition: string
  actions: RuleActionUI[]
}

const localRules = ref<RuleUI[]>([])

/** WidgetEvent[] → RuleUI[] 用于编辑 */
function fromEvents(events: WidgetEvent[]): RuleUI[] {
  return events.map(ev => ({
    watches: [],  // watches 不持久化到 WidgetEvent，每次重新配置
    condition: ev.condition ?? '',
    actions: ev.actions.map(a => ({
      type: a.type === 'show' ? 'visible' as const : a.type,
      target: a.target ?? '',
      value: String(a.value ?? ''),
      apiUrl: a.apiUrl ?? '',
      apiMethod: a.apiMethod ?? 'get',
      variable: a.variable ?? '',
      eventTarget: a.target ?? '',
      eventName: a.event ?? '',
    })),
  }))
}

/** RuleUI[] → WidgetEvent[] 用于保存 */
function toEvents(rules: RuleUI[]): WidgetEvent[] {
  return rules
    .filter(r => r.actions.length > 0)
    .map(r => ({
      trigger: 'change',
      condition: r.condition || undefined,
      actions: r.actions
        .map(a => toEventAction(a))
        .filter((a): a is SchemaEventAction => a !== null),
    }))
    .filter(ev => ev.actions.length > 0)
}

/** RuleUI action → SchemaEventAction */
function toEventAction(a: RuleActionUI): SchemaEventAction | null {
  switch (a.type) {
    case 'visible':
      return { type: 'show', target: a.target || undefined }
    case 'hide':
      return { type: 'hide', target: a.target || undefined }
    case 'disabled':
      return { type: 'show', target: a.target || undefined, value: '__disabled__' }
    case 'set-value':
      return { type: 'set-value', target: a.target || undefined, value: a.value }
    case 'open-dialog':
      return { type: 'open-dialog', target: a.target || undefined }
    case 'close-dialog':
      return { type: 'close-dialog' }
    case 'fetch-data':
      return { type: 'api', apiUrl: a.apiUrl, apiMethod: a.apiMethod }
    case 'set-variable':
      return { type: 'set-variable', variable: a.variable, value: a.value }
    case 'trigger-event':
      return { type: 'trigger-event', target: a.eventTarget, event: a.eventName }
    case 'submit':
      return { type: 'submit' }
    case 'reset':
      return { type: 'reset' }
    case 'emit':
      return { type: 'emit', value: a.value }
    case 'navigate':
      return { type: 'navigate', navigatePath: a.value }
    default:
      return null
  }
}

watch(
  () => props.visible,
  (open) => {
    if (open) {
      localRules.value = fromEvents(JSON.parse(JSON.stringify(props.events ?? [])))
      // 如果没有规则，添加一个空规则
      if (localRules.value.length === 0) {
        addRule()
      }
    }
  },
)

// ---- 选项常量 ----

const actionTypeOptions: { label: string; value: RuleActionUI['type'] }[] = [
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

/** 不需要额外配置的动作类型 */
const NO_CONFIG_TYPES = new Set<RuleActionUI['type']>([
  'submit', 'reset', 'close-dialog',
])

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

// ---- 动作 CRUD ----

function addAction(ruleIndex: number) {
  localRules.value[ruleIndex].actions.push({
    type: 'open-dialog',
    target: '',
    value: '',
    apiUrl: '',
    apiMethod: 'get',
    variable: '',
    eventTarget: '',
    eventName: '',
  })
}

function removeAction(ruleIndex: number, actionIndex: number) {
  localRules.value[ruleIndex].actions.splice(actionIndex, 1)
}

// ---- 保存 / 关闭 ----

function handleSave() {
  emit('save', toEvents(localRules.value))
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

        <!-- watches（辅助配置，帮助用户理解触发来源） -->
        <div :class="$style.section">
          <div :class="$style.sectionHeader">
            <span :class="$style.sectionTitle">监听字段</span>
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
            添加后当指定字段值变化时触发此规则
          </div>

          <div
            v-for="(w, wi) in rule.watches"
            :key="wi"
            :class="$style.watchRow"
          >
            <el-select
              v-model="w.source"
              size="small"
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
        </div>

        <!-- condition -->
        <div :class="$style.row">
          <label :class="$style.label">条件</label>
          <div :class="$style.conditionArea">
            <ConditionBuilder v-model="rule.condition" required />
          </div>
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
                @update:model-value="action.target = ''; action.value = ''; action.apiUrl = ''; action.variable = ''; action.eventTarget = ''; action.eventName = ''"
              >
                <el-option
                  v-for="opt in actionTypeOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </div>

            <!-- 需要目标组件的动作：open-dialog / hide / visible / disabled -->
            <template v-if="['open-dialog', 'hide', 'visible', 'disabled'].includes(action.type)">
              <div :class="$style.row">
                <label :class="$style.label">目标</label>
                <el-select
                  v-model="action.target"
                  size="small"
                  filterable
                  :placeholder="action.type === 'open-dialog' ? '选择弹窗组件' : action.type === 'hide' ? '选择要隐藏的组件' : action.type === 'visible' ? '选择要显示的组件' : '选择要禁用的组件'"
                  style="flex: 1"
                >
                  <el-option
                    v-for="opt in widgetIdOptions"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
              </div>
            </template>

            <!-- set-value：目标字段 + 值 -->
            <template v-if="action.type === 'set-value'">
              <div :class="$style.row">
                <label :class="$style.label">目标</label>
                <el-select
                  v-model="action.target"
                  size="small"
                  filterable
                  placeholder="选择要设置值的字段"
                  style="flex: 1"
                >
                  <el-option
                    v-for="opt in widgetOptions"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
              </div>
              <div :class="$style.row">
                <label :class="$style.label">值</label>
                <el-input
                  v-model="action.value"
                  size="small"
                  placeholder="要设置的值"
                  style="flex: 1"
                />
              </div>
            </template>

            <!-- fetch-data：URL + 方法 -->
            <template v-if="action.type === 'fetch-data'">
              <div :class="$style.row">
                <label :class="$style.label">URL</label>
                <el-input
                  v-model="action.apiUrl"
                  size="small"
                  placeholder="/api/data"
                  style="flex: 1"
                />
              </div>
              <div :class="$style.row">
                <label :class="$style.label">方法</label>
                <el-select
                  v-model="action.apiMethod"
                  size="small"
                  style="width: 120px"
                >
                  <el-option label="GET" value="get" />
                  <el-option label="POST" value="post" />
                </el-select>
              </div>
            </template>

            <!-- set-variable：变量名 + 值 -->
            <template v-if="action.type === 'set-variable'">
              <div :class="$style.row">
                <label :class="$style.label">变量</label>
                <el-input
                  v-model="action.variable"
                  size="small"
                  placeholder="变量名"
                  style="flex: 1"
                />
              </div>
              <div :class="$style.row">
                <label :class="$style.label">值</label>
                <el-input
                  v-model="action.value"
                  size="small"
                  placeholder="要设置的值"
                  style="flex: 1"
                />
              </div>
            </template>

            <!-- trigger-event：目标组件 + 事件名 -->
            <template v-if="action.type === 'trigger-event'">
              <div :class="$style.row">
                <label :class="$style.label">目标</label>
                <el-select
                  v-model="action.eventTarget"
                  size="small"
                  filterable
                  placeholder="选择目标组件"
                  style="flex: 1"
                >
                  <el-option
                    v-for="opt in widgetIdOptions"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
              </div>
              <div :class="$style.row">
                <label :class="$style.label">事件</label>
                <el-input
                  v-model="action.eventName"
                  size="small"
                  placeholder="事件名（如 click）"
                  style="flex: 1"
                />
              </div>
            </template>

            <!-- navigate：路由路径 -->
            <template v-if="action.type === 'navigate'">
              <div :class="$style.row">
                <label :class="$style.label">路径</label>
                <el-input
                  v-model="action.value"
                  size="small"
                  placeholder="/path"
                  style="flex: 1"
                />
              </div>
            </template>

            <!-- emit：事件值 -->
            <template v-if="action.type === 'emit'">
              <div :class="$style.row">
                <label :class="$style.label">值</label>
                <el-input
                  v-model="action.value"
                  size="small"
                  placeholder="emit 的值"
                  style="flex: 1"
                />
              </div>
            </template>

            <!-- 无需配置的类型 -->
            <div v-if="NO_CONFIG_TYPES.has(action.type)" :class="$style.noConfigHint">
              此动作无需额外配置
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

.noConfigHint {
  font-size: 11px;
  color: #909399;
  padding: 4px 0;
}
</style>
