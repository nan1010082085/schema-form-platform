<script setup lang="ts">
import { inject, computed, ref } from 'vue'
import * as ElementPlusIcons from '@element-plus/icons-vue'
import { widgetDataKey, widgetStyleKey } from '../base/types'
import { useWidgetRenderState } from '../../composables/useWidgetRenderState'
import { useExposeWidget } from '../../composables/useExposeWidget'
import styles from './style.module.scss'

const widgetData = inject(widgetDataKey)!
const widgetStyle = inject(widgetStyleKey)!
const { isDisabled } = useWidgetRenderState()

useExposeWidget((wd) => ({
  get value() { return wd.value.defaultValue },
}))

// Build icon list from @element-plus/icons-vue
const allIcons = Object.keys(ElementPlusIcons).map((name) => ({
  name,
  component: (ElementPlusIcons as Record<string, unknown>)[name],
}))

const searchQuery = ref('')
const popoverVisible = ref(false)

const filteredIcons = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return allIcons
  return allIcons.filter((icon) => icon.name.toLowerCase().includes(q))
})

const selectedIconName = computed(() => widgetData.value.defaultValue as string)

function selectIcon(name: string) {
  widgetData.value.defaultValue = name
  popoverVisible.value = false
  searchQuery.value = ''
}

function clearIcon() {
  widgetData.value.defaultValue = ''
  searchQuery.value = ''
}

const dynamicStyle = computed(() => ({
  fontSize: widgetStyle.value?.fontSize as string,
  color: widgetStyle.value?.color as string,
}))
</script>

<template>
  <div :class="styles.iconPicker">
    <el-popover
      v-model:visible="popoverVisible"
      placement="bottom-start"
      trigger="click"
      :width="320"
      :disabled="isDisabled"
      :popper-style="{ padding: '4px' }"
    >
      <template #reference>
        <el-input
          :model-value="selectedIconName"
          :placeholder="(widgetData.props?.placeholder as string) || '请选择图标'"
          :disabled="isDisabled"
          :clearable="(widgetData.props?.clearable as boolean) ?? true"
          :style="dynamicStyle"
          :class="styles.trigger"
          readonly
          @clear="clearIcon"
        >
          <template v-if="selectedIconName" #prefix>
            <el-icon>
              <component :is="ElementPlusIcons[selectedIconName as keyof typeof ElementPlusIcons]" />
            </el-icon>
          </template>
        </el-input>
      </template>

      <div :class="styles.popover">
        <el-input
          v-model="searchQuery"
          :class="styles.searchInput"
          placeholder="搜索图标..."
          clearable
          :prefix-icon="ElementPlusIcons.Search"
        />
        <div :class="styles.iconGrid">
          <div
            v-for="icon in filteredIcons"
            :key="icon.name"
            :class="[styles.iconItem, { [styles.active]: icon.name === selectedIconName }]"
            :title="icon.name"
            @click="selectIcon(icon.name)"
          >
            <el-icon :class="styles.iconSvg">
              <component :is="icon.component" />
            </el-icon>
            <span :class="styles.iconName">{{ icon.name }}</span>
          </div>
        </div>
        <div v-if="filteredIcons.length === 0" :class="styles.emptyText">
          未找到匹配图标
        </div>
      </div>
    </el-popover>
  </div>
</template>
