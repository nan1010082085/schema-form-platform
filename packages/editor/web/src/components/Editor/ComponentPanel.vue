<script setup lang="ts">
/**
 * ComponentPanel — 左侧组件面板（手风琴折叠）
 *
 * 从 widget registry 读取已注册组件，按分组折叠展示。
 * 拖拽 dataTransfer 中携带 SchemaType 字符串。
 */
import { ref, computed } from 'vue'
import { Search, ArrowRight, ArrowDown } from '@element-plus/icons-vue'
import { getWidgetsByGroup, type WidgetRegistryItem } from '@/widgets/registry'
import type { SchemaType } from '@/widgets/base/types'
import styles from './ComponentPanel.module.scss'

const GROUP_LABELS: Record<string, string> = {
  layout: '布局部件',
  form: '表单部件',
  container: '容器部件',
  table: '表格部件',
  action: '操作部件',
  static: '静态部件',
  business: '业务部件',
  chart: '图表部件',
}

interface ComponentGroup {
  label: string
  key: string
  items: WidgetRegistryItem[]
}

const allGroups = computed<ComponentGroup[]>(() => {
  const groups: ComponentGroup[] = []
  for (const [key, label] of Object.entries(GROUP_LABELS)) {
    const items = getWidgetsByGroup(key as WidgetRegistryItem['group'])
    if (items.length > 0) {
      groups.push({ label, key, items })
    }
  }
  return groups
})

const searchQuery = ref('')
const expandedGroups = ref<Set<string>>(new Set(allGroups.value.map(g => g.key)))

function toggleGroup(key: string) {
  if (expandedGroups.value.has(key)) {
    expandedGroups.value.delete(key)
  } else {
    expandedGroups.value.add(key)
  }
}

const filteredGroups = computed(() => {
  if (!searchQuery.value) return allGroups.value
  const q = searchQuery.value.toLowerCase()
  return allGroups.value
    .map(g => ({
      ...g,
      items: g.items.filter(item =>
        item.displayName.includes(searchQuery.value) ||
        item.name.toLowerCase().includes(q)
      ),
    }))
    .filter(g => g.items.length > 0)
})

function handleDragStart(event: DragEvent, type: SchemaType) {
  event.dataTransfer?.setData('schema-type', type)
  event.dataTransfer?.setData('application/schema-drag', JSON.stringify({ source: 'panel', type }))
  event.dataTransfer!.effectAllowed = 'copy'
}
</script>

<template>
  <div :class="styles.panel">
    <div :class="styles.search">
      <el-input
        v-model="searchQuery"
        size="small"
        placeholder="搜索部件..."
        clearable
      >
        <template #prefix>
          <el-icon :size="12"><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <el-scrollbar :class="styles.scroll">
      <div
        v-for="group in filteredGroups"
        :key="group.key"
        :class="styles.group"
      >
        <!-- 分组标题（点击折叠/展开） -->
        <div
          :class="styles.groupHeader"
          @click="toggleGroup(group.key)"
        >
          <el-icon :size="12" :class="styles.arrow">
            <ArrowDown v-if="expandedGroups.has(group.key)" />
            <ArrowRight v-else />
          </el-icon>
          <span :class="styles.groupLabel">{{ group.label }}</span>
          <span :class="styles.groupCount">{{ group.items.length }}</span>
        </div>

        <!-- 组件列表 -->
        <div v-if="expandedGroups.has(group.key)" :class="styles.groupBody">
          <div
            v-for="item in group.items"
            :key="item.type"
            :class="styles.item"
            draggable="true"
            @dragstart="handleDragStart($event, item.type)"
          >
            <span :class="styles.itemLabel">{{ item.displayName }}</span>
          </div>
        </div>
      </div>

      <div v-if="filteredGroups.length === 0" :class="styles.empty">
        无匹配部件
      </div>
    </el-scrollbar>
  </div>
</template>

