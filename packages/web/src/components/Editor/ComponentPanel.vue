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

const GROUP_LABELS: Record<string, string> = {
  container: '容器部件',
  basic: '基础部件',
  form: '表单部件',
  table: '表格部件',
  business: '业务部件',
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
  <div :class="$style.panel">
    <div :class="$style.search">
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

    <el-scrollbar :class="$style.scroll">
      <div
        v-for="group in filteredGroups"
        :key="group.key"
        :class="$style.group"
      >
        <!-- 分组标题（点击折叠/展开） -->
        <div
          :class="$style.groupHeader"
          @click="toggleGroup(group.key)"
        >
          <el-icon :size="12" :class="$style.arrow">
            <ArrowDown v-if="expandedGroups.has(group.key)" />
            <ArrowRight v-else />
          </el-icon>
          <span :class="$style.groupLabel">{{ group.label }}</span>
          <span :class="$style.groupCount">{{ group.items.length }}</span>
        </div>

        <!-- 组件列表 -->
        <div v-if="expandedGroups.has(group.key)" :class="$style.groupBody">
          <div
            v-for="item in group.items"
            :key="item.type"
            :class="$style.item"
            draggable="true"
            @dragstart="handleDragStart($event, item.type)"
          >
            <span :class="$style.itemLabel">{{ item.displayName }}</span>
          </div>
        </div>
      </div>

      <div v-if="filteredGroups.length === 0" :class="$style.empty">
        无匹配部件
      </div>
    </el-scrollbar>
  </div>
</template>

<style module>
.panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.search {
  padding: 8px 10px;
  flex-shrink: 0;
}

.scroll {
  flex: 1;
  min-height: 0;
}

.group {
  border-bottom: 1px solid #f0f2f5;
}

.groupHeader {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}

.groupHeader:hover {
  background: #f5f7fa;
}

.arrow {
  color: #909399;
  flex-shrink: 0;
  transition: transform 0.2s;
}

.groupLabel {
  font-size: 12px;
  font-weight: 600;
  color: #303133;
  flex: 1;
}

.groupCount {
  font-size: 11px;
  color: #c0c4cc;
  background: #f0f2f5;
  border-radius: 8px;
  padding: 0 6px;
  line-height: 18px;
}

.groupBody {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 0 10px 10px;
}

.item {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  cursor: grab;
  transition: all 0.15s;
  background: #fafbfc;
}

.item:hover {
  border-color: #409eff;
  background: #ecf5ff;
}

.item:active {
  cursor: grabbing;
  opacity: 0.7;
}

.itemLabel {
  font-size: 12px;
  color: #303133;
  font-weight: 500;
  text-align: center;
}

.empty {
  padding: 24px;
  text-align: center;
  color: #c0c4cc;
  font-size: 12px;
}
</style>
