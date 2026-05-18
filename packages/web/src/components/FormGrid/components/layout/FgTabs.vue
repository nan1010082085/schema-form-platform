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
  <div class="fg-tabs">
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
          class="fg-tabs__panel"
        >
          <SchemaRender
            v-if="ci === getTabIndex(tab.name) && !child.hidden"
            :schema="child"
            :form-data="formData"
          />
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style lang="scss" scoped>
.fg-tabs {
  --fg-tabs-padding: 16px;
  --fg-tabs-panel-min-height: 100px;

  padding: var(--fg-tabs-padding);

  &__panel {
    min-height: var(--fg-tabs-panel-min-height);
  }
}
</style>

<!-- 非 scoped 块：穿透样式到 Element Plus 子组件和 grid 布局 -->
<style lang="scss">
.fg-tabs {
  // el-tabs 内容区域样式穿透
  .el-tab-pane {
    width: 100%;
  }

  // tab 面板内的 grid 布局需要继承宽度
  .fg-tabs__panel {
    > .fg-grid-row {
      width: 100%;
    }
  }

  // 左右布局时内容区域自适应
  .el-tabs--left,
  .el-tabs--right {
    .el-tabs__content {
      overflow: visible;
    }
  }
}
</style>
