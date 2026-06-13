<script setup lang="ts">
/**
 * ComponentPanel — 左侧组件面板（手风琴折叠）
 *
 * 从 widget registry 读取已注册组件，按分组折叠展示。
 * 拖拽 dataTransfer 中携带 SchemaType 字符串。
 * 支持拼音首字母搜索、匹配高亮、200ms 防抖。
 * 使用虚拟滚动优化大量组件时的性能。
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { SearchIcon, ChevronDownIcon, ChevronRightIcon } from 'tdesign-icons-vue-next'
import { pinyin } from 'pinyin-pro'
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

const searchInput = ref('')
const searchQuery = ref('')
const expandedGroups = ref<Set<string>>(new Set(allGroups.value.map(g => g.key)))

// 200ms 防抖
let debounceTimer: ReturnType<typeof setTimeout> | null = null
watch(searchInput, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    searchQuery.value = val
  }, 200)
})

/** 获取拼音首字母（小写） */
function getPinyinInitials(text: string): string {
  return pinyin(text, { pattern: 'first', toneType: 'none', type: 'array' }).join('').toLowerCase()
}

/** 获取全拼（无空格，小写） */
function getPinyinFull(text: string): string {
  return pinyin(text, { toneType: 'none', type: 'array' }).join('').toLowerCase()
}

interface MatchResult {
  matched: boolean
  matchedIn: 'displayName' | 'name' | 'pinyin'
}

/** 判断 item 是否匹配查询 */
function matchItem(item: WidgetRegistryItem, q: string): MatchResult {
  const displayName = item.displayName.toLowerCase()
  const name = item.name.toLowerCase()

  if (displayName.includes(q) || name.includes(q)) {
    return { matched: true, matchedIn: 'displayName' }
  }

  // 拼音首字母匹配
  const initials = getPinyinInitials(item.displayName)
  if (initials.includes(q)) {
    return { matched: true, matchedIn: 'pinyin' }
  }

  // 全拼匹配
  const fullPinyin = getPinyinFull(item.displayName)
  if (fullPinyin.includes(q)) {
    return { matched: true, matchedIn: 'pinyin' }
  }

  return { matched: false, matchedIn: 'displayName' }
}

const filteredGroups = computed(() => {
  if (!searchQuery.value) return allGroups.value
  const q = searchQuery.value.toLowerCase()
  return allGroups.value
    .map(g => ({
      ...g,
      items: g.items.filter(item => matchItem(item, q).matched),
    }))
    .filter(g => g.items.length > 0)
})

/** 高亮匹配文字 */
function highlightText(text: string): string {
  if (!searchQuery.value) return escapeHtml(text)
  const q = searchQuery.value.toLowerCase()
  const lowerText = text.toLowerCase()
  const idx = lowerText.indexOf(q)
  if (idx === -1) return escapeHtml(text)
  const before = text.slice(0, idx)
  const match = text.slice(idx, idx + q.length)
  const after = text.slice(idx + q.length)
  return `${escapeHtml(before)}<em class="${styles.highlight}">${escapeHtml(match)}</em>${escapeHtml(after)}`
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function toggleGroup(key: string) {
  if (expandedGroups.value.has(key)) {
    expandedGroups.value.delete(key)
  } else {
    expandedGroups.value.add(key)
  }
}

function handleDragStart(event: DragEvent, type: SchemaType, displayName: string) {
  event.dataTransfer?.setData('schema-type', type)
  event.dataTransfer?.setData('application/schema-drag', JSON.stringify({ source: 'panel', type }))
  event.dataTransfer!.effectAllowed = 'copy'

  // 创建拖拽预览 ghost 元素
  const ghost = document.createElement('div')
  ghost.textContent = displayName
  ghost.style.cssText = `
    padding: 6px 14px;
    background: var(--td-brand-color);
    color: white;
    font-size: 12px;
    font-weight: 500;
    border-radius: 6px;
    white-space: nowrap;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    pointer-events: none;
    position: absolute;
    top: -1000px;
    left: -1000px;
  `
  document.body.appendChild(ghost)
  event.dataTransfer!.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2)
  // 拖拽结束后清理 ghost 元素
  requestAnimationFrame(() => {
    ghost.remove()
  })
}

// ============================================================
// 虚拟滚动相关逻辑
// ============================================================

/** 每项高度（px）- 固定高度模式 */
const ITEM_HEIGHT = 36
/** 每行列数（2列网格） */
const COLUMNS_PER_ROW = 2
/** 缓冲区行数 */
const BUFFER_ROWS = 3

const scrollContainerRef = ref<HTMLElement | null>(null)
const containerHeight = ref(0)
const scrollTop = ref(0)

// ResizeObserver 监听容器高度
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (scrollContainerRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerHeight.value = entry.contentRect.height
      }
    })
    resizeObserver.observe(scrollContainerRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

// 计算所有展开分组的扁平化列表
interface FlatItem {
  type: 'header' | 'item'
  groupKey: string
  item?: WidgetRegistryItem
  label?: string
  count?: number
}

const flatList = computed<FlatItem[]>(() => {
  const result: FlatItem[] = []
  for (const group of filteredGroups.value) {
    result.push({
      type: 'header',
      groupKey: group.key,
      label: group.label,
      count: group.items.length,
    })
    if (expandedGroups.value.has(group.key)) {
      for (const item of group.items) {
        result.push({
          type: 'item',
          groupKey: group.key,
          item,
        })
      }
    }
  }
  return result
})

// 计算每项的累计高度
const itemAccumulatedHeights = computed(() => {
  const heights: number[] = []
  let accumulated = 0
  for (const item of flatList.value) {
    // header 高度 32px，item 高度按行计算（每行2列）
    const height = item.type === 'header' ? 32 : ITEM_HEIGHT
    accumulated += height
    heights.push(accumulated)
  }
  return heights
})

// 计算总高度
const totalHeight = computed(() => {
  if (itemAccumulatedHeights.value.length === 0) return 0
  return itemAccumulatedHeights.value[itemAccumulatedHeights.value.length - 1]
})

// 计算可见区域的起始索引
const startIndex = computed(() => {
  const index = itemAccumulatedHeights.value.findIndex(h => h > scrollTop.value)
  return Math.max(0, index - BUFFER_ROWS)
})

// 计算可见区域的结束索引
const endIndex = computed(() => {
  const targetHeight = scrollTop.value + containerHeight.value
  const index = itemAccumulatedHeights.value.findIndex(h => h >= targetHeight)
  return Math.min(flatList.value.length - 1, (index === -1 ? flatList.value.length - 1 : index) + BUFFER_ROWS)
})

// 可见区域的数据切片
const visibleItems = computed(() => {
  return flatList.value.slice(startIndex.value, endIndex.value + 1)
})

// 偏移量
const offsetY = computed(() => {
  if (startIndex.value === 0) return 0
  return itemAccumulatedHeights.value[startIndex.value - 1] || 0
})

// 滚动事件处理
function handleScroll(e: Event) {
  const target = e.target as HTMLElement
  scrollTop.value = target.scrollTop
}

// 判断分组是否展开
function isGroupExpanded(groupKey: string): boolean {
  return expandedGroups.value.has(groupKey)
}
</script>

<template>
  <div :class="styles.panel">
    <div :class="styles.search">
      <t-input
        v-model="searchInput"
        size="small"
        placeholder="搜索部件（支持拼音）..."
        clearable
      >
        <template #prefix-icon>
          <SearchIcon />
        </template>
      </t-input>
    </div>

    <div
      ref="scrollContainerRef"
      :class="styles.scroll"
      @scroll="handleScroll"
    >
      <div
        :class="styles.virtualWrapper"
        :style="{ height: `${totalHeight}px` }"
      >
        <div
          :class="styles.virtualContent"
          :style="{ transform: `translateY(${offsetY}px)` }"
        >
          <template v-for="(flatItem, idx) in visibleItems" :key="idx">
            <!-- 分组标题 -->
            <div
              v-if="flatItem.type === 'header'"
              :class="styles.groupHeader"
              @click="toggleGroup(flatItem.groupKey)"
            >
              <span :class="styles.arrow">
                <ChevronDownIcon v-if="isGroupExpanded(flatItem.groupKey)" />
                <ChevronRightIcon v-else />
              </span>
              <span :class="styles.groupLabel">{{ flatItem.label }}</span>
              <span :class="styles.groupCount">{{ flatItem.count }}</span>
            </div>

            <!-- 组件项 -->
            <div
              v-else-if="flatItem.type === 'item' && flatItem.item"
              :class="styles.itemRow"
            >
              <div
                :class="styles.item"
                draggable="true"
                @dragstart="handleDragStart($event, flatItem.item!.type, flatItem.item!.displayName)"
              >
                <span
                  :class="styles.itemLabel"
                  v-html="searchQuery ? highlightText(flatItem.item!.displayName) : flatItem.item!.displayName"
                />
              </div>
            </div>
          </template>
        </div>
      </div>

      <div v-if="filteredGroups.length === 0" :class="styles.empty">
        <p :class="styles.emptyText">未找到匹配的部件</p>
        <p :class="styles.emptyHint">试试其他关键词或拼音首字母</p>
      </div>
    </div>
  </div>
</template>
