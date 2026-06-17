<script setup lang="ts">
/**
 * ActionListEditor — 动作列表编辑器
 *
 * 从 EventConfigDialog / LinkageConfigDialog 提取的共享组件。
 * 接收 SchemaEventAction[]，内部维护 UI 别名状态，保存时转回标准类型。
 *
 * UI 别名：'visible' ↔ 'show', 'disabled' ↔ 'show' + '__disabled__', 'fetch-data' ↔ 'api'
 */
import { ref, watch } from 'vue'
import { useWidgetOptions } from '@/composables/useWidgetOptions'
import type { SchemaEventAction, EventActionType, ReceivableEventConfig } from '../../widgets/base/types'
import styles from './ActionListEditor.module.scss'
import AppIcon from '@schema-form/shared-components/common/AppIcon.vue'

// ---- Types ----

type UIActionType = EventActionType | 'visible' | 'disabled' | 'fetch-data'

interface UIAction {
  type: UIActionType
  target: string
  value: string
  variable: string
  event: string
  message: string
  text: string
  apiUrl: string
  apiMethod: 'get' | 'post' | 'put' | 'delete'
  navigatePath: string
  eventTarget: string
  eventName: string
  // ---- startFlow ----
  definitionId: string
  flowVariables: string
  // ---- endFlow ----
  instanceId: string
  reason: string
}

export interface ActionTypeOption {
  label: string
  value: UIActionType
}

// ---- Props & Emits ----

const props = withDefaults(defineProps<{
  actions: SchemaEventAction[]
  actionTypes: ActionTypeOption[]
  getReceivableEvents?: (targetId: string) => ReceivableEventConfig[]
}>(), {
  getReceivableEvents: () => [],
})

const emit = defineEmits<{
  'update:actions': [actions: SchemaEventAction[]]
}>()

// ---- Widget options ----

const { widgetOptions, allWidgetOptions, showHideOptions, dialogOptions, tabsOptions, setValueOptions, triggerEventOptions } = useWidgetOptions()

// ---- No-config types ----

const NO_CONFIG_TYPES = new Set<UIActionType>(['submit', 'reset', 'close-dialog', 'close-tab', 'refresh'])

// ---- Local state ----

const localActions = ref<UIAction[]>([])

// ---- Conversion: SchemaEventAction → UI ----

function convertSchemaToUi(action: SchemaEventAction): UIAction {
  // Map EventActionType → UI alias when the parent uses aliases
  let uiType: UIActionType = action.type
  if (action.type === 'show' && action.value === '__disabled__' && props.actionTypes.some(o => o.value === 'disabled')) {
    uiType = 'disabled'
  } else if (action.type === 'show' && props.actionTypes.some(o => o.value === 'visible')) {
    uiType = 'visible'
  } else if (action.type === 'api' && props.actionTypes.some(o => o.value === 'fetch-data')) {
    uiType = 'fetch-data'
  }

  return {
    type: uiType,
    target: action.target ?? '',
    value: String(action.value ?? ''),
    variable: action.variable ?? '',
    event: action.event ?? '',
    message: action.message ? JSON.stringify(action.message) : '',
    text: action.text ?? '',
    apiUrl: action.apiUrl ?? '',
    apiMethod: action.apiMethod ?? 'get',
    navigatePath: action.navigatePath ?? '',
    eventTarget: action.target ?? '',
    eventName: action.event ?? '',
    definitionId: action.definitionId ?? '',
    flowVariables: action.variables ? JSON.stringify(action.variables) : '',
    instanceId: action.instanceId ?? '',
    reason: action.reason ?? '',
  }
}

// ---- Conversion: UI → SchemaEventAction ----

function convertUiToSchema(a: UIAction): SchemaEventAction | null {
  switch (a.type) {
    case 'visible':
      return { type: 'show', target: a.target || undefined }
    case 'disabled':
      return { type: 'show', target: a.target || undefined, value: '__disabled__' }
    case 'fetch-data':
      return { type: 'api', apiUrl: a.apiUrl, apiMethod: a.apiMethod }
    case 'set-variable':
      return { type: 'set-variable', variable: a.variable, value: a.value }
    case 'trigger-event':
      return { type: 'trigger-event', target: a.eventTarget, event: a.eventName }
    case 'navigate':
      return { type: 'navigate', navigatePath: a.value }
    case 'emit':
      return { type: 'emit', value: a.value }
    case 'switch-tab':
      return { type: 'switch-tab', target: a.target || undefined, value: a.value }
    case 'set-value':
      return { type: 'set-value', target: a.target || undefined, value: a.value }
    case 'post-message':
      return { type: 'post-message', message: a.message ? JSON.parse(a.message) : undefined }
    case 'copy':
      return { type: 'copy', text: a.text }
    case 'open-dialog':
      return { type: 'open-dialog', target: a.target || undefined }
    case 'hide':
      return { type: 'hide', target: a.target || undefined }
    case 'close-dialog':
      return { type: 'close-dialog' }
    case 'submit':
      return { type: 'submit' }
    case 'reset':
      return { type: 'reset' }
    case 'close-tab':
      return { type: 'close-tab' }
    case 'refresh':
      return { type: 'refresh', target: a.target || undefined }
    // 'show' passthrough (when parent uses 'show' directly)
    case 'show':
      return { type: 'show', target: a.target || undefined }
    // 'api' passthrough (when parent uses 'api' directly)
    case 'api':
      return { type: 'api', apiUrl: a.apiUrl, apiMethod: a.apiMethod }
    case 'startFlow':
      return {
        type: 'startFlow',
        definitionId: a.definitionId,
        variables: a.flowVariables ? JSON.parse(a.flowVariables) : undefined,
      }
    case 'endFlow':
      return {
        type: 'endFlow',
        instanceId: a.instanceId,
        reason: a.reason || undefined,
      }
    default:
      return null
  }
}

// ---- Sync: prop → local ----

watch(
  () => props.actions,
  (newActions) => {
    localActions.value = (newActions ?? []).map(convertSchemaToUi)
  },
  { immediate: true, deep: true },
)

// ---- Emit helper ----

function emitChange() {
  const result = localActions.value
    .map(convertUiToSchema)
    .filter((a): a is SchemaEventAction => a !== null)
  emit('update:actions', result)
}

// ---- CRUD ----

function addAction() {
  localActions.value.push({
    type: props.actionTypes[0]?.value ?? 'show',
    target: '',
    value: '',
    variable: '',
    event: '',
    message: '',
    text: '',
    apiUrl: '',
    apiMethod: 'get',
    navigatePath: '',
    eventTarget: '',
    eventName: '',
    definitionId: '',
    flowVariables: '',
    instanceId: '',
    reason: '',
  })
  emitChange()
}

function removeAction(index: number) {
  localActions.value.splice(index, 1)
  emitChange()
}

function handleTypeChange(action: UIAction, newType: UIActionType) {
  action.type = newType
  action.target = ''
  action.value = ''
  action.apiUrl = ''
  action.variable = ''
  action.eventTarget = ''
  action.eventName = ''
  action.message = ''
  action.text = ''
  action.navigatePath = ''
  action.definitionId = ''
  action.flowVariables = ''
  action.instanceId = ''
  action.reason = ''
  emitChange()
}

function handleChange() {
  emitChange()
}

/** 根据动作类型获取目标选项 */
function getTargetOptions(type: UIActionType) {
  switch (type) {
    case 'open-dialog':
      return dialogOptions.value
    case 'hide':
    case 'visible':
    case 'disabled':
    case 'show':
      return showHideOptions.value
    case 'switch-tab':
      return tabsOptions.value
    case 'refresh':
      return allWidgetOptions.value
    default:
      return allWidgetOptions.value
  }
}
</script>

<template>
  <div :class="styles.section">
    <div :class="styles.sectionHeader">
      <span :class="styles.sectionTitle">动作列表</span>
      <el-button
        type="primary"
        size="small"
        link
        @click="addAction"
      >
        <AppIcon name="plus" />
        添加
      </el-button>
    </div>

    <div v-if="localActions.length === 0" :class="styles.sectionEmpty">
      暂无动作
    </div>

    <div
      v-for="(action, ai) in localActions"
      :key="ai"
      :class="styles.actionCard"
    >
      <div :class="styles.actionHeader">
        <span :class="styles.actionIndex">动作 {{ ai + 1 }}</span>
        <el-button
          type="danger"
          size="small"
          link
          @click="removeAction(ai)"
        >
          <AppIcon name="delete" />
        </el-button>
      </div>

      <!-- action type -->
      <div :class="styles.row">
        <label :class="styles.label">类型</label>
        <el-select
          :model-value="action.type"
          style="flex: 1"
          @update:model-value="(val: UIActionType) => handleTypeChange(action, val)"
        >
          <el-option
            v-for="opt in actionTypes"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>

      <!-- target: open-dialog / hide / visible / disabled / switch-tab / refresh / show -->
      <template v-if="['open-dialog', 'hide', 'visible', 'disabled', 'switch-tab', 'refresh', 'show'].includes(action.type)">
        <div :class="styles.row">
          <label :class="styles.label">目标</label>
          <el-select
            v-model="action.target"
            filterable
            :placeholder="action.type === 'open-dialog' ? '选择弹窗组件' : action.type === 'hide' ? '选择要隐藏的组件' : action.type === 'visible' ? '选择要显示的组件' : action.type === 'disabled' ? '选择要禁用的组件' : '选择目标组件'"
            style="flex: 1"
            @update:model-value="handleChange"
          >
            <el-option
              v-for="opt in getTargetOptions(action.type)"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </div>
      </template>

      <!-- switch-tab: value (tab key) -->
      <div v-if="action.type === 'switch-tab'" :class="styles.row">
        <label :class="styles.label">标签</label>
        <el-input
          v-model="action.value"
          placeholder="标签 key"
          style="flex: 1"
          @update:model-value="handleChange"
        />
      </div>

      <!-- set-value: target (field) + value -->
      <template v-if="action.type === 'set-value'">
        <div :class="styles.row">
          <label :class="styles.label">目标</label>
          <el-select
            v-model="action.target"
            filterable
            placeholder="选择要设置值的字段"
            style="flex: 1"
            @update:model-value="handleChange"
          >
            <el-option
              v-for="opt in setValueOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </div>
        <div :class="styles.row">
          <label :class="styles.label">值</label>
          <el-input
            v-model="action.value"
            placeholder="要设置的值"
            style="flex: 1"
            @update:model-value="handleChange"
          />
        </div>
      </template>

      <!-- fetch-data / api: URL + method -->
      <template v-if="action.type === 'fetch-data' || action.type === 'api'">
        <div :class="styles.row">
          <label :class="styles.label">URL</label>
          <el-input
            v-model="action.apiUrl"
            placeholder="/api/data"
            style="flex: 1"
            @update:model-value="handleChange"
          />
        </div>
        <div :class="styles.row">
          <label :class="styles.label">方法</label>
          <el-select
            v-model="action.apiMethod"
            style="width: 120px"
            @update:model-value="handleChange"
          >
            <el-option label="GET" value="get" />
            <el-option label="POST" value="post" />
            <el-option label="PUT" value="put" />
            <el-option label="DELETE" value="delete" />
          </el-select>
        </div>
      </template>

      <!-- set-variable: variable + value -->
      <template v-if="action.type === 'set-variable'">
        <div :class="styles.row">
          <label :class="styles.label">变量</label>
          <el-input
            v-model="action.variable"
            placeholder="变量名"
            style="flex: 1"
            @update:model-value="handleChange"
          />
        </div>
        <div :class="styles.row">
          <label :class="styles.label">值</label>
          <el-input
            v-model="action.value"
            placeholder="要设置的值"
            style="flex: 1"
            @update:model-value="handleChange"
          />
        </div>
      </template>

      <!-- trigger-event: target (component) + event (from receivableEvents or free input) -->
      <template v-if="action.type === 'trigger-event'">
        <div :class="styles.row">
          <label :class="styles.label">目标</label>
          <el-select
            v-model="action.eventTarget"
            filterable
            placeholder="选择目标组件"
            style="flex: 1"
            @update:model-value="handleChange"
          >
            <el-option
              v-for="opt in triggerEventOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </div>
        <div :class="styles.row">
          <label :class="styles.label">事件</label>
          <el-select
            v-if="action.eventTarget && getReceivableEvents(action.eventTarget).length > 0"
            v-model="action.eventName"
            filterable
            placeholder="选择事件"
            style="flex: 1"
            @update:model-value="handleChange"
          >
            <el-option
              v-for="evt in getReceivableEvents(action.eventTarget)"
              :key="evt.name"
              :label="`${evt.name} — ${evt.description}`"
              :value="evt.name"
            />
          </el-select>
          <el-input
            v-else
            v-model="action.eventName"
            placeholder="事件名（如 click）"
            style="flex: 1"
            @update:model-value="handleChange"
          />
        </div>
      </template>

      <!-- navigate: path -->
      <template v-if="action.type === 'navigate'">
        <div :class="styles.row">
          <label :class="styles.label">路径</label>
          <el-input
            v-model="action.value"
            placeholder="/path"
            style="flex: 1"
            @update:model-value="handleChange"
          />
        </div>
      </template>

      <!-- emit: value -->
      <template v-if="action.type === 'emit'">
        <div :class="styles.row">
          <label :class="styles.label">值</label>
          <el-input
            v-model="action.value"
            placeholder="事件 payload"
            style="flex: 1"
            @update:model-value="handleChange"
          />
        </div>
      </template>

      <!-- post-message: message (JSON) -->
      <template v-if="action.type === 'post-message'">
        <div :class="styles.row">
          <label :class="styles.label">消息</label>
          <el-input
            v-model="action.message"
            placeholder='{"type":"save"}'
            style="flex: 1"
            @update:model-value="handleChange"
          />
        </div>
      </template>

      <!-- copy: text -->
      <template v-if="action.type === 'copy'">
        <div :class="styles.row">
          <label :class="styles.label">内容</label>
          <el-input
            v-model="action.text"
            placeholder="复制内容（支持 formData.xxx）"
            style="flex: 1"
            @update:model-value="handleChange"
          />
        </div>
      </template>

      <!-- startFlow: definitionId + variables -->
      <template v-if="action.type === 'startFlow'">
        <div :class="styles.row">
          <label :class="styles.label">流程定义</label>
          <el-input
            v-model="action.definitionId"
            placeholder="流程定义 ID"
            style="flex: 1"
            @update:model-value="handleChange"
          />
        </div>
        <div :class="styles.row">
          <label :class="styles.label">变量</label>
          <el-input
            v-model="action.flowVariables"
            placeholder='{"key": "value"}（可选）'
            style="flex: 1"
            @update:model-value="handleChange"
          />
        </div>
      </template>

      <!-- endFlow: instanceId + reason -->
      <template v-if="action.type === 'endFlow'">
        <div :class="styles.row">
          <label :class="styles.label">实例 ID</label>
          <el-input
            v-model="action.instanceId"
            placeholder="流程实例 ID"
            style="flex: 1"
            @update:model-value="handleChange"
          />
        </div>
        <div :class="styles.row">
          <label :class="styles.label">原因</label>
          <el-input
            v-model="action.reason"
            placeholder="结束原因（可选）"
            style="flex: 1"
            @update:model-value="handleChange"
          />
        </div>
      </template>

      <!-- 无需配置的类型 -->
      <div v-if="NO_CONFIG_TYPES.has(action.type)" :class="styles.noConfigHint">
        此动作无需额外配置
      </div>
    </div>
  </div>
</template>
