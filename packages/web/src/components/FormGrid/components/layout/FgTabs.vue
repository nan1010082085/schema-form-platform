<script setup lang="ts">
/**
 * FgTabs — 标签页表单布局组件
 *
 * 将表单内容分为多个标签页，切换不影响 formData。
 * 使用 v-show 保持各标签页内容挂载，避免切换时丢失数据。
 */
import { ref, computed, watch } from 'vue'
import SchemaRender from '../../SchemaRender.vue'
import type { FormData, FormSchemaItem } from '../../types'

interface TabConfig {
  /** tab 唯一标识 */
  name: string
  /** tab 标签文本 */
  label: string
  /** 是否禁用 */
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  /** 当前激活的 tab name（受控模式） */
  modelValue?: string
  /** tab 位置 */
  tabPosition?: 'top' | 'right' | 'bottom' | 'left'
  /** tab 样式类型 */
  type?: '' | 'card' | 'border-card'
  /** tab 配置列表 */
  tabs: TabConfig[]
  /** 每个 tab 对应一个 children 子树 */
  children?: FormSchemaItem[]
  /** 表单数据（由 SchemaRender 传入） */
  formData?: FormData
  /** 编辑模式标识 */
  editable?: boolean
  /** 是否正在拖拽 */
  isDragging?: boolean
  /** 当前节点路径 */
  path?: number[]
}>(), {
  modelValue: '',
  tabPosition: 'top',
  type: '',
  formData: () => ({}),
  tabs: () => [],
})

const emit = defineEmits<{
  'update:modelValue': [name: string]
  'tab-change': [name: string]
  'container-drop': [data: any]
}>()

// 内部激活 tab，支持受控和非受控模式
const internalActive = ref(props.modelValue || props.tabs[0]?.name || '')

// 受控模式：外部 modelValue 变化时同步
watch(() => props.modelValue, (val) => {
  if (val) internalActive.value = val
})

// 初始化：如果没有传 modelValue，使用第一个 tab
if (!props.modelValue && props.tabs.length > 0) {
  internalActive.value = props.tabs[0].name
}

const activeName = computed(() => internalActive.value)

/**
 * 根据 tab name 查找对应的 children 索引
 */
function getTabIndex(name: string): number {
  return props.tabs.findIndex((t) => t.name === name)
}

function handleTabChange(name: string | number) {
  const tabName = String(name)
  internalActive.value = tabName
  emit('update:modelValue', tabName)
  emit('tab-change', tabName)
}

defineExpose({
  activeName,
  setActive: (name: string) => handleTabChange(name),
})
</script>

<template>
  <div :class="$style.tabs">
    <el-tabs
      :model-value="activeName"
      :tab-position="tabPosition"
      :type="type"
      @tab-change="handleTabChange"
    >
      <el-tab-pane
        v-for="(tab, _idx) in tabs"
        :key="tab.name"
        :name="tab.name"
        :label="tab.label"
        :disabled="tab.disabled"
      >
        <!-- 使用 v-show 保持挂载，避免切换时丢失数据 -->
        <div
          v-for="(child, ci) in children"
          :key="ci"
          v-show="ci === getTabIndex(tab.name)"
          :class="$style.tabsPanel"
        >
          <SchemaRender
            v-if="ci === getTabIndex(tab.name) && !child.hidden"
            :schema="child"
            :form-data="formData"
            :editable="editable"
            :is-dragging="isDragging"
            :path="[...(path ?? []), ci]"
            @container-drop="emit('container-drop', $event)"
          />
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style module lang="scss">
.tabs {
  --fg-tabs-padding: 16px;
  --fg-tabs-panel-min-height: 100px;

  padding: var(--fg-tabs-padding);

  // Deep: el-tabs 内容区域样式穿透
  :global(.el-tab-pane) {
    width: 100%;
  }

  // Deep: 左右布局时内容区域自适应
  :global(.el-tabs--left),
  :global(.el-tabs--right) {
    :global(.el-tabs__content) {
      overflow: visible;
    }
  }
}

.tabsPanel {
  min-height: var(--fg-tabs-panel-min-height);

  // Deep: tab 面板内的 grid 布局需要继承宽度
  > :global(.fg-grid-row) {
    width: 100%;
  }
}
</style>
