<script setup lang="ts">
/**
 * PropertyPanel -- 属性面板（Widget 驱动，手风琴折叠分区）
 *
 * 设计原则：
 * - 手风琴分区：基础属性、位置、样式、组件属性各自折叠
 * - 动态组件：每个属性由 PropertyField 根据 type 渲染不同输入
 * - 每行一个属性：label + value 水平排列
 */
import { computed, ref, watch } from 'vue'
import { useEditorStore } from '../../stores/editor'
import { useWidgetStore } from '../../stores/widget'
import { useBoardStore } from '../../stores/board'
import { getWidget } from '../../widgets/registry'
import { publicStylePanel } from '../../widgets/base/publicSchema'
import type { Widget, WidgetEvent, SchemaApiConfig, ConfigPanelType, ArrayFieldSchema, WidgetConfig } from '../../widgets/base/types'
import PropertyField from './PropertyField.vue'
import BorderEditor from './BorderEditor.vue'
import BorderRadiusEditor from './BorderRadiusEditor.vue'
import SpacingEditor from './SpacingEditor.vue'
import TableColumnsEditor from './TableColumnsEditor.vue'
import type { TableColumn } from '../../widgets/table/config'
import GenericArrayEditor from './GenericArrayEditor.vue'
import OptionsEditor from './OptionsEditor.vue'
import RulesEditor from './RulesEditor.vue'
import EventConfigDialog from './EventConfigDialog.vue'
import LinkageConfigDialog from './LinkageConfigDialog.vue'
import OptionsApiConfigDialog from './OptionsApiConfigDialog.vue'
import VariableConfigDialog from './VariableConfigDialog.vue'
import type { WidgetVariable } from '../../widgets/base/types'
import { usePropertyAdapters } from '../../composables/usePropertyAdapters'
import { useClipboard } from '../../composables/useClipboard'
import styles from './style.module.scss'
import AppIcon from '@schema-form/shared-components/common/AppIcon.vue'

const editorStore = useEditorStore()
const widgetStore = useWidgetStore()
const boardStore = useBoardStore()
const { getStyleLabel, getStyleInputType, getPropInputType, getStyleOptions } = usePropertyAdapters()
const { copy } = useClipboard()

// ---- 选中的 Widget ----

const selectedWidget = computed(() => {
  if (!editorStore.selectedId) return null
  return widgetStore.findWidget(editorStore.selectedId)
})

// ---- Widget 注册配置 ----

const widgetConfig = computed(() => {
  if (!selectedWidget.value) return null
  const regItem = getWidget(selectedWidget.value.type)
  if (!regItem) return undefined
  return { ...regItem, config: regItem.config as WidgetConfig }
})

// ---- 属性面板声明 ----

const panelDeclaration = computed(() => {
  if (!widgetConfig.value) return null
  return widgetConfig.value.config.propertyPanel ?? null
})

// ---- 事件目标（支持动态函数） ----

const resolvedEventTargets = computed(() => {
  const et = widgetConfig.value?.config.eventTargets
  if (!et || !selectedWidget.value) return undefined
  if (typeof et === 'function') return et(selectedWidget.value)
  return et
})

// ---- 属性列表项类型 ----

interface SelectOption {
  label: string
  value: string | number | boolean
}

interface PropertyItem {
  key: string
  label: string
  type: string
  value: unknown
  desc?: string
  placeholder?: string
  options?: SelectOption[]
  fields?: ArrayFieldSchema[]
  remoteUrl?: string
  labelField?: string
  valueField?: string
}

interface PropertySection {
  key: string
  label: string
  items: PropertyItem[]
}

// ---- 基础属性映射 ----

function getBasicPropertyItem(prop: string, widget: Widget): PropertyItem {
  const map: Record<string, { label: string; type: string; value: unknown; desc: string }> = {
    field: { label: '字段名', type: 'text', value: widget.field, desc: '字段名，用于数据绑定' },
    label: { label: '标签', type: 'text', value: widget.label, desc: '组件显示标签' },
    defaultValue: { label: '默认值', type: 'text', value: widget.defaultValue, desc: '组件默认值' },
    hidden: { label: '隐藏', type: 'switch', value: widget.hidden, desc: '设计时隐藏组件' },
    options: { label: '选项', type: 'options', value: widget.options, desc: '下拉/单选/多选的选项列表' },
    validationRules: { label: '校验规则', type: 'rules', value: widget.validationRules, desc: '表单校验规则' },
  }
  const mapped = map[prop]
  if (mapped) {
    return { key: prop, ...mapped }
  }
  return { key: prop, label: prop, type: 'text', value: widget.props?.[prop] }
}

// ---- 所有可编辑属性（按分区） ----

const propertySections = computed<PropertySection[]>(() => {
  if (!panelDeclaration.value || !selectedWidget.value) return []

  const sections: PropertySection[] = []
  const panel = panelDeclaration.value
  const widget = selectedWidget.value

  // 1. 基础属性
  const basicItems: PropertyItem[] = []
  if (panel.basic) {
    for (const prop of panel.basic) {
      if (typeof prop === 'string') {
        basicItems.push(getBasicPropertyItem(prop, widget))
      } else {
        basicItems.push({
          key: prop.key,
          label: prop.label,
          type: prop.type,
          value: widget.props?.[prop.key] ?? prop.default,
          desc: prop.desc,
          options: prop.options,
          fields: prop.fields,
        })
      }
    }
  }
  if (basicItems.length) {
    sections.push({ key: 'basic', label: '基础属性', items: basicItems })
  }

  // 2. 位置属性
  sections.push({
    key: 'position',
    label: '位置',
    items: [
      { key: 'position.x', label: 'X', type: 'number', value: widget.position.x, desc: '水平位置' },
      { key: 'position.y', label: 'Y', type: 'number', value: widget.position.y, desc: '垂直位置' },
      { key: 'position.w', label: '宽度', type: 'number', value: widget.position.w, desc: '组件宽度' },
      { key: 'position.h', label: '高度', type: 'number', value: widget.position.h, desc: '组件高度' },
      { key: 'position.zIndex', label: '层级', type: 'number', value: widget.position.zIndex ?? 0, desc: 'Z轴层级' },
    ],
  })

  // 3. 样式属性
  const styleProps = [...publicStylePanel, ...(panel.style ?? [])]
  const uniqueStyleProps = [...new Set(styleProps)]
  const styleItems: PropertyItem[] = []
  for (const prop of uniqueStyleProps) {
    const styleLabel = getStyleLabel(prop)
    styleItems.push({
      key: `style.${prop}`,
      label: styleLabel,
      type: getStyleInputType(prop),
      value: widget.style?.[prop],
      desc: `组件${styleLabel}`,
      options: getStyleOptions(prop),
    })
  }
  if (styleItems.length) {
    sections.push({ key: 'style', label: '样式', items: styleItems })
  }

  // 4. 组件属性
  const propItems: PropertyItem[] = []
  if (panel.props) {
    for (const prop of panel.props) {
      if (typeof prop === 'string') {
        propItems.push({
          key: `props.${prop}`,
          label: prop,
          type: getPropInputType(prop),
          value: widget.props?.[prop],
        })
      } else {
        propItems.push({
          key: `props.${prop.key}`,
          label: prop.label,
          type: prop.type,
          value: widget.props?.[prop.key] ?? prop.default,
          desc: prop.desc,
          placeholder: (prop as any).placeholder,
          options: prop.options,
          fields: prop.fields,
          remoteUrl: (prop as any).remoteUrl,
          labelField: (prop as any).labelField,
          valueField: (prop as any).valueField,
        })
      }
    }
  }
  if (propItems.length) {
    sections.push({ key: 'props', label: '组件属性', items: propItems })
  }

  return sections
})

// ---- 手风琴展开状态 ----

const expandedSections = ref<Set<string>>(new Set(['basic', 'position', 'style', 'props']))

function toggleSection(key: string) {
  if (expandedSections.value.has(key)) {
    expandedSections.value.delete(key)
  } else {
    expandedSections.value.add(key)
  }
}

// ---- 更新属性 ----

const TOP_LEVEL_KEYS = new Set(['field', 'label', 'defaultValue', 'hidden', 'options', 'validationRules'])

function updateProperty(key: string, value: unknown) {
  if (!selectedWidget.value) return

  const parts = key.split('.')
  if (parts.length === 1) {
    if (TOP_LEVEL_KEYS.has(key)) {
      // field / label 是 Widget 顶层属性
      widgetStore.updateWidget(selectedWidget.value.id, { [key]: value })
    } else {
      // 其他无前缀 key 默认写入 widget.props
      widgetStore.updateWidget(selectedWidget.value.id, {
        props: { ...(selectedWidget.value.props ?? {}), [key]: value },
      })
    }
  } else if (parts[0] === 'position') {
    widgetStore.updateWidget(selectedWidget.value.id, {
      position: { ...selectedWidget.value.position, [parts[1]]: value },
    })
  } else if (parts[0] === 'style') {
    widgetStore.updateWidget(selectedWidget.value.id, {
      style: { ...(selectedWidget.value.style ?? {}), [parts[1]]: value },
    })
  } else if (parts[0] === 'props') {
    widgetStore.updateWidget(selectedWidget.value.id, {
      props: { ...(selectedWidget.value.props ?? {}), [parts[1]]: value },
    })
  }
}

function copyWidgetId() {
  if (selectedWidget.value) {
    copy(selectedWidget.value.id, '已复制部件 ID')
  }
}

/**
 * 样式补丁更新 — BorderEditor / BorderRadiusEditor 发出多字段 patch
 * 合并到现有 style 对象上
 */
function updateStylePatch(patch: Record<string, string>) {
  if (!selectedWidget.value) return
  widgetStore.updateWidget(selectedWidget.value.id, {
    style: { ...(selectedWidget.value.style ?? {}), ...patch },
  })
}

// ---- configPanels 声明 ----

const configPanels = computed<ConfigPanelType[]>(() => {
  if (!widgetConfig.value) return []
  return widgetConfig.value.config.configPanels ?? []
})

/** 根据 configPanels 自动生成配置说明 */
const configHelpText = computed(() => {
  const parts: string[] = ['<p><strong>配置说明</strong></p>']
  if (configPanels.value.includes('events')) {
    parts.push(`
      <p><strong>事件配置</strong></p>
      <p>为组件绑定交互事件，设置触发条件和执行动作：</p>
      <ul>
        <li><strong>触发</strong> — 选择事件类型（点击/值变化/聚焦/失焦/关闭）</li>
        <li><strong>条件</strong> — 可选，满足条件时才执行动作</li>
        <li><strong>确认</strong> — 可选，执行前弹出确认提示</li>
        <li><strong>动作</strong> — 显示/隐藏组件、打开/关闭弹窗、切换标签页</li>
      </ul>
    `)
  }
  if (configPanels.value.includes('rules')) {
    parts.push(`
      <p><strong>联动规则</strong></p>
      <p>监听其他字段值变化，自动控制当前组件状态：</p>
      <ul>
        <li>设置监听字段和触发条件表达式</li>
        <li>条件为真时：自动显示/隐藏/禁用/必填/更新选项</li>
        <li>条件为假时：恢复默认状态或指定回退值</li>
      </ul>
    `)
  }
  if (configPanels.value.includes('api')) {
    parts.push(`
      <p><strong>数据源</strong></p>
      <p>配置 API 接口实现动态数据加载：</p>
      <ul>
        <li>设置接口地址和请求方法</li>
        <li>配置请求参数和字段映射</li>
        <li>支持下拉选项、表格数据等动态加载</li>
      </ul>
    `)
  }
  if (configPanels.value.includes('variables')) {
    parts.push(`
      <p><strong>变量</strong></p>
      <p>定义组件级变量，可在事件条件和联动规则中引用：</p>
      <ul>
        <li>通过 exposed.xxx.value 引用组件暴露值</li>
        <li>通过 variables.xxx 引用变量值</li>
      </ul>
    `)
  }
  return parts.join('')
})

// ---- 事件/规则/API/变量 弹框 ----

const eventDialogVisible = ref(false)
const ruleDialogVisible = ref(false)
const apiDialogVisible = ref(false)
const variableDialogVisible = ref(false)

function openEventDialog() {
  eventDialogVisible.value = true
}

function openRuleDialog() {
  ruleDialogVisible.value = true
}

function openApiDialog() {
  apiDialogVisible.value = true
}

// ---- 监听右键菜单触发的弹框打开 ----
watch(() => editorStore.configDialogTrigger, (trigger) => {
  if (!trigger) return
  if (trigger.type === 'events') eventDialogVisible.value = true
  else if (trigger.type === 'rules') ruleDialogVisible.value = true
  else if (trigger.type === 'api') apiDialogVisible.value = true
  else if (trigger.type === 'variables') variableDialogVisible.value = true
  editorStore.clearConfigDialogTrigger()
})

function handleEventSave(events: WidgetEvent[]) {
  if (!selectedWidget.value) return
  widgetStore.updateWidget(selectedWidget.value.id, { events })
}

function handleRuleSave(events: WidgetEvent[]) {
  if (!selectedWidget.value) return
  widgetStore.updateWidget(selectedWidget.value.id, { events })
}

function handleApiSave(api: SchemaApiConfig | undefined) {
  if (!selectedWidget.value) return
  widgetStore.updateWidget(selectedWidget.value.id, { api })
}

function handleVariableSave(variables: WidgetVariable[]) {
  if (!selectedWidget.value) return
  widgetStore.updateWidget(selectedWidget.value.id, { variables })
}

// ---- 画布级变量配置 ----
const boardVariableDialogVisible = ref(false)

function handleBoardVariableSave(variables: WidgetVariable[]) {
  boardStore.variables = variables as typeof boardStore.variables
}

// ---- 画布配置（未选中部件时显示） ----

const canvasExpanded = ref(true)

interface BoardPropertyItem {
  key: string
  label: string
  type: string
  value: unknown
  desc?: string
}

const boardPropertyItems = computed<BoardPropertyItem[]>(() => [
  { key: 'width', label: '宽度', type: 'number', value: boardStore.canvas.width, desc: '画布宽度' },
  { key: 'height', label: '高度', type: 'number', value: boardStore.canvas.height, desc: '画布高度' },
  { key: 'backgroundColor', label: '背景色', type: 'color', value: boardStore.canvas.backgroundColor, desc: '画布背景色' },
  { key: 'padding', label: '内边距', type: 'text', value: boardStore.canvas.padding, desc: '画布内边距' },
  { key: 'zoom', label: '缩放', type: 'number', value: boardStore.canvas.zoom, desc: '缩放比例 (100-150)' },
])

function updateBoardProperty(key: string, value: unknown) {
  boardStore.updateCanvas({ [key]: value })
}
</script>

<template>
  <div :class="styles.panel">
    <div :class="styles.header">属性配置</div>

    <!-- 未选中部件时：显示画布配置 -->
    <template v-if="!selectedWidget">
      <div :class="styles.scroll" style="overflow: auto; height: 100%;">
        <div :class="styles.section">
          <div :class="styles.sectionHeader" @click="canvasExpanded = !canvasExpanded">
            <AppIcon name="arrow-down" :size="12" :class="styles.arrow" />
            <span :class="styles.sectionLabel">画布配置</span>
          </div>
          <div v-if="canvasExpanded" :class="styles.sectionBody">
            <PropertyField
              v-for="item in boardPropertyItems"
              :key="item.key"
              :label="item.label"
              :type="item.type"
              :value="item.value"
              :desc="item.desc"
              @update="(v: unknown) => updateBoardProperty(item.key, v)"
            />
            <div :class="styles.variableBtn">
              <el-button size="small" @click="boardVariableDialogVisible = true">
                画布变量 ({{ boardStore.variables.length }})
              </el-button>
            </div>
          </div>
        </div>

        <VariableConfigDialog
          :visible="boardVariableDialogVisible"
          :variables="boardStore.variables"
          title="画布变量配置"
          @update:visible="boardVariableDialogVisible = $event"
          @save="handleBoardVariableSave"
        />
      </div>
    </template>

    <template v-else>
      <div :class="styles.widgetNameRow">
        <span :class="styles.widgetType">{{ widgetConfig?.displayName }}</span>
        <el-popover
          v-if="widgetConfig?.config.description"
          :content="widgetConfig.config.description"
          placement="top"
          :show-after="500"
          trigger="hover"
        >
          <template #reference>
            <AppIcon name="question-filled" :class="styles.questionIcon" />
          </template>
        </el-popover>
        <el-popover v-if="selectedWidget" content="复制部件 ID" placement="top" :show-after="500" trigger="hover">
          <template #reference>
            <AppIcon name="copy-document" :class="styles.copyIdIcon" @click="copyWidgetId" />
          </template>
        </el-popover>
      </div>

      <!-- 动态配置入口（由 widget config.configPanels 声明驱动）—— 顶部横向按钮 -->
      <div v-if="configPanels.length" :class="styles.configActions">
        <div style="overflow: auto;">
          <div :class="styles.configButtons">
            <el-popover placement="bottom-left" :width="280" trigger="click">
              <template #default>
                <div :class="styles.helpContent" v-html="configHelpText" />
              </template>
              <template #reference>
                <div :class="styles.helpIconWrap">
                  <AppIcon name="question-filled" :class="styles.helpIcon" />
                </div>
              </template>
            </el-popover>
            <template v-for="panel in configPanels" :key="panel">
              <el-button v-if="panel === 'events'" plain @click="openEventDialog">
                事件配置
                <span v-if="selectedWidget.events?.length" :class="styles.badge">
                  {{ selectedWidget.events.length }}
                </span>
              </el-button>
              <el-button v-if="panel === 'rules'" plain @click="openRuleDialog">
                规则配置
                <span v-if="selectedWidget.rules?.length" :class="styles.badge">
                  {{ selectedWidget.rules.length }}
                </span>
              </el-button>
              <el-button v-if="panel === 'api'" plain @click="openApiDialog">
                数据源
                <span v-if="selectedWidget.api" :class="styles.badge">1</span>
              </el-button>
              <el-button v-if="panel === 'variables'" plain @click="variableDialogVisible = true">
                变量
                <span v-if="selectedWidget.variables?.length" :class="styles.badge">
                  {{ selectedWidget.variables.length }}
                </span>
              </el-button>
            </template>
          </div>
        </div>
      </div>

      <div :class="styles.scroll" style="overflow: auto; height: 100%;">
        <!-- 手风琴分区 -->
        <div v-for="section in propertySections" :key="section.key" :class="styles.section">
          <div :class="styles.sectionHeader" @click="toggleSection(section.key)">
            <AppIcon v-if="expandedSections.has(section.key)" name="arrow-down" :size="12" :class="styles.arrow" />
            <AppIcon v-else name="arrow-right" :size="12" :class="styles.arrow" />
            <span :class="styles.sectionLabel">{{ section.label }}</span>
            <span :class="styles.sectionCount">{{ section.items.length }}</span>
          </div>

          <div v-if="expandedSections.has(section.key)" :class="styles.sectionBody">
            <template v-for="item in section.items" :key="item.key">
              <!-- 列配置：直接渲染 TableColumnsEditor -->
              <div v-if="item.type === 'columns'" :class="styles.columnsSection">
                <div :class="styles.columnsLabel">{{ item.label }}</div>
                <TableColumnsEditor
                  :columns="(item.value as TableColumn[]) ?? []"
                  @update:columns="(v: TableColumn[]) => updateProperty(item.key, v)"
                />
              </div>
              <!-- 通用数组编辑器 -->
              <div v-else-if="item.type === 'array-editor'" :class="styles.columnsSection">
                <div :class="styles.columnsLabel">{{ item.label }}</div>
                <GenericArrayEditor
                  :value="(item.value as unknown[]) ?? []"
                  :fields="item.fields ?? []"
                  @update="(v: unknown[]) => updateProperty(item.key, v)"
                />
              </div>
              <!-- 选项编辑器（select/radio/checkbox 的选项配置） -->
              <OptionsEditor
                v-else-if="item.type === 'options'"
                :label="item.label"
                :value="item.value"
                @update="(v: unknown) => updateProperty(item.key, v)"
              />
              <!-- 边框可视化编辑器 -->
              <div v-else-if="item.type === 'border-editor'" :class="styles.columnsSection">
                <div :class="styles.columnsLabel">{{ item.label }}</div>
                <BorderEditor
                  :value="(selectedWidget?.style as Record<string, string>) ?? {}"
                  @update="updateStylePatch"
                />
              </div>
              <!-- 圆角可视化编辑器 -->
              <div v-else-if="item.type === 'border-radius-editor'" :class="styles.columnsSection">
                <div :class="styles.columnsLabel">{{ item.label }}</div>
                <BorderRadiusEditor
                  :value="(selectedWidget?.style as Record<string, string>) ?? {}"
                  @update="updateStylePatch"
                />
              </div>
              <!-- 外边距可视化编辑器 -->
              <div v-else-if="item.type === 'spacing-margin-editor'" :class="styles.columnsSection">
                <div :class="styles.columnsLabel">{{ item.label }}</div>
                <SpacingEditor
                  mode="margin"
                  :value="(selectedWidget?.style as Record<string, string>) ?? {}"
                  @update="updateStylePatch"
                />
              </div>
              <!-- 内边距可视化编辑器 -->
              <div v-else-if="item.type === 'spacing-padding-editor'" :class="styles.columnsSection">
                <div :class="styles.columnsLabel">{{ item.label }}</div>
                <SpacingEditor
                  mode="padding"
                  :value="(selectedWidget?.style as Record<string, string>) ?? {}"
                  @update="updateStylePatch"
                />
              </div>
              <!-- 校验规则编辑器 -->
              <div v-else-if="item.type === 'rules'" :class="styles.columnsSection">
                <div :class="styles.columnsLabel">{{ item.label }}</div>
                <RulesEditor
                  :rules="(item.value as any[] | undefined)"
                  @update:rules="(v: any[] | undefined) => updateProperty(item.key, v)"
                />
              </div>
              <PropertyField
                v-else
                :label="item.label"
                :type="item.type"
                :value="item.value"
                :desc="item.desc"
                :placeholder="item.placeholder"
                :options="item.options"
                :remote-url="item.remoteUrl"
                :label-field="item.labelField"
                :value-field="item.valueField"
                @update="(v: unknown) => updateProperty(item.key, v)"
              />
            </template>
          </div>
        </div>
      </div>

      <EventConfigDialog
        :visible="eventDialogVisible"
        :events="selectedWidget.events ?? []"
        :event-targets="resolvedEventTargets"
        @update:visible="eventDialogVisible = $event"
        @save="handleEventSave"
      />

      <LinkageConfigDialog
        :visible="ruleDialogVisible"
        :events="selectedWidget.events ?? []"
        @update:visible="ruleDialogVisible = $event"
        @save="handleRuleSave"
      />

      <OptionsApiConfigDialog
        :visible="apiDialogVisible"
        :api="selectedWidget.api"
        @update:visible="apiDialogVisible = $event"
        @save="handleApiSave"
      />

      <VariableConfigDialog
        :visible="variableDialogVisible"
        :variables="selectedWidget.variables ?? []"
        title="部件变量配置"
        @update:visible="variableDialogVisible = $event"
        @save="handleVariableSave"
      />
    </template>
  </div>
</template>

<style scoped lang="scss">
/* 属性面板内所有 small 尺寸输入组件统一高度 32px */

:deep(.el-input--small) {
  --el-component-size-small: 32px;

  .el-input__wrapper {
    height: 32px;
    min-height: 32px;
  }

  .el-input__inner {
    height: 32px;
  }
}

:deep(.el-select--small) {
  --el-component-size-small: 32px;

  .el-select__wrapper {
    min-height: 32px;
  }
}

:deep(.el-input-number--small) {
  --el-component-size-small: 32px;
  height: 32px;

  .el-input-number__decrease,
  .el-input-number__increase {
    height: 16px;
    line-height: 16px;
  }

  .el-input-number__increase {
    border-left: 1px solid var(--el-border-color);
  }

  .el-input__wrapper {
    height: 32px;
    min-height: 32px;
  }

  .el-input__inner {
    height: 32px;
    line-height: 32px;
  }
}
</style>

