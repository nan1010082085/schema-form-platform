<script setup lang="ts">
/**
 * LinkageConfigDialog -- WidgetRule[] 配置对话框
 *
 * 对每条规则支持：
 * - watches[]: 监听字段列表（type + source）
 * - condition: 条件表达式（必填）
 * - actions[]: 动作列表（结构化配置 UI，按类型展示不同表单）
 *
 * 保存时 emit 完整的 WidgetRule[]，由调用方写入 widget。
 */
import { ref, watch, computed } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import { useWidgetOptions } from '@/composables/useWidgetOptions'
import { useWidgetStore } from '@/stores/widget'
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

// ---- 部件字段选项（带 field 的组件） ----
const { widgetOptions } = useWidgetOptions()

// ---- 所有组件 ID 选项（用于目标选择） ----
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

// ---- 本地编辑副本 ----

const localRules = ref<WidgetRule[]>([])

watch(
  () => props.visible,
  (open) => {
    if (open) {
      localRules.value = JSON.parse(JSON.stringify(props.rules ?? []))
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
  { label: '隐藏', value: 'hide' },
  { label: '显示', value: 'visible' },
  { label: '禁用', value: 'disabled' },
  { label: '提交', value: 'submit' },
  { label: '校验', value: 'validate' },
  { label: '重置', value: 'reset' },
]

/** 不需要额外配置的动作类型 */
const NO_CONFIG_TYPES = new Set<WidgetRuleAction['type']>(['submit', 'validate', 'reset'])

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

// ---- 结构化 config 操作 ----

function getConfigValue(action: WidgetRuleAction, key: string): string {
  const val = action.config?.[key]
  return val !== undefined && val !== null ? String(val) : ''
}

function setConfigValue(action: WidgetRuleAction, key: string, value: string) {
  if (!action.config) action.config = {}
  action.config[key] = value || undefined
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

            <!-- 字段类型：从表单字段列表选择 -->
            <el-select
              v-if="w.type === 'field'"
              v-model="w.source"
              size="small"
              filterable
              placeholder="选择要监听的字段"
              style="flex: 1"
            >
              <el-option
                v-for="opt in widgetOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>

            <!-- 动作类型：从组件 ID 列表选择 -->
            <el-select
              v-else-if="w.type === 'action'"
              v-model="w.source"
              size="small"
              filterable
              placeholder="选择触发动作的组件"
              style="flex: 1"
            >
              <el-option
                v-for="opt in widgetIdOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>

            <!-- 弹窗回调：从 dialog 类型组件选择 -->
            <el-select
              v-else
              v-model="w.source"
              size="small"
              filterable
              placeholder="选择弹窗组件"
              style="flex: 1"
            >
              <el-option
                v-for="opt in widgetIdOptions.filter(o => o.type === 'dialog')"
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
            <el-input
              v-model="rule.condition"
              type="textarea"
              :rows="2"
              size="small"
              placeholder="必填，表达式如: status === 'draft' 或 amount > 100"
            />
            <div v-if="widgetOptions.length > 0" :class="$style.conditionHint">
              <span :class="$style.hintLabel">可用字段:</span>
              <el-tag
                v-for="opt in widgetOptions.slice(0, 6)"
                :key="opt.value"
                size="small"
                type="info"
                :class="$style.hintTag"
                @click="rule.condition = (rule.condition ? rule.condition + ' ' : '') + opt.value"
              >
                {{ opt.value }}
              </el-tag>
            </div>
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
                @update:model-value="action.config = {}"
              >
                <el-option
                  v-for="opt in actionTypeOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </div>

            <!-- 结构化配置：set-value -->
            <template v-if="action.type === 'set-value'">
              <div :class="$style.row">
                <label :class="$style.label">目标</label>
                <el-select
                  :model-value="getConfigValue(action, 'targetField')"
                  size="small"
                  filterable
                  placeholder="选择要设置值的字段"
                  style="flex: 1"
                  @update:model-value="setConfigValue(action, 'targetField', $event)"
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
                  :model-value="getConfigValue(action, 'value')"
                  size="small"
                  placeholder="要设置的值"
                  style="flex: 1"
                  @update:model-value="setConfigValue(action, 'value', $event)"
                />
              </div>
            </template>

            <!-- 结构化配置：fetch-data -->
            <template v-if="action.type === 'fetch-data'">
              <div :class="$style.row">
                <label :class="$style.label">URL</label>
                <el-input
                  :model-value="getConfigValue(action, 'url')"
                  size="small"
                  placeholder="/api/data"
                  style="flex: 1"
                  @update:model-value="setConfigValue(action, 'url', $event)"
                />
              </div>
              <div :class="$style.row">
                <label :class="$style.label">方法</label>
                <el-select
                  :model-value="getConfigValue(action, 'method') || 'get'"
                  size="small"
                  style="width: 120px"
                  @update:model-value="setConfigValue(action, 'method', $event)"
                >
                  <el-option label="GET" value="get" />
                  <el-option label="POST" value="post" />
                </el-select>
              </div>
            </template>

            <!-- 结构化配置：hide / visible / disabled（选择目标组件） -->
            <template v-if="['hide', 'visible', 'disabled'].includes(action.type)">
              <div :class="$style.row">
                <label :class="$style.label">目标</label>
                <el-select
                  :model-value="getConfigValue(action, 'targetId')"
                  size="small"
                  filterable
                  :placeholder="action.type === 'hide' ? '选择要隐藏的组件' : action.type === 'visible' ? '选择要显示的组件' : '选择要禁用的组件'"
                  style="flex: 1"
                  @update:model-value="setConfigValue(action, 'targetId', $event)"
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

            <!-- 无需配置的类型：submit / validate / reset -->
            <div v-if="NO_CONFIG_TYPES.has(action.type)" :class="$style.noConfigHint">
              此动作无需额外配置
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

.conditionArea {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.conditionHint {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.hintLabel {
  font-size: 11px;
  color: #909399;
  flex-shrink: 0;
}

.hintTag {
  cursor: pointer;
  font-size: 11px;
}

.hintTag:hover {
  color: #409eff;
  border-color: #409eff;
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
</style>
