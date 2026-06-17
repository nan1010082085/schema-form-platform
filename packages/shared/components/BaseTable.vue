<script setup lang="ts">
/**
 * BaseTable — 统一表格组件
 *
 * 支持排序、筛选、分页
 * 支持选择和操作
 */

import { computed, ref } from 'vue'
import styles from './BaseTable.module.scss'
import AppIcon from '@schema-form/shared-components/common/AppIcon.vue'

/** 列定义 */
export interface TableColumn {
  /** 列唯一标识 */
  key: string
  /** 列标题 */
  title: string
  /** 列宽度 */
  width?: number | string
  /** 最小宽度 */
  minWidth?: number | string
  /** 是否可排序 */
  sortable?: boolean
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right'
  /** 是否固定 */
  fixed?: 'left' | 'right'
  /** 自定义渲染插槽名 */
  slot?: string
}

/** 分页配置 */
export interface TablePagination {
  /** 当前页 */
  current: number
  /** 每页条数 */
  pageSize: number
  /** 总条数 */
  total: number
  /** 每页条数选项 */
  pageSizes?: number[]
}

/** 排序状态 */
interface SortState {
  key: string
  order: 'asc' | 'desc'
}

const props = withDefaults(defineProps<{
  /** 列定义 */
  columns: TableColumn[]
  /** 数据源 */
  data: Record<string, any>[]
  /** 行唯一标识字段 */
  rowKey?: string
  /** 是否显示边框 */
  bordered?: boolean
  /** 是否可选择 */
  selectable?: boolean
  /** 已选中的行 key 数组 */
  selectedKeys?: (string | number)[]
  /** 是否显示斑马纹 */
  stripe?: boolean
  /** 是否加载中 */
  loading?: boolean
  /** 空数据提示文本 */
  emptyText?: string
  /** 分页配置（不传则不显示分页） */
  pagination?: TablePagination
}>(), {
  rowKey: 'id',
  bordered: false,
  selectable: false,
  selectedKeys: () => [],
  stripe: false,
  loading: false,
  emptyText: '暂无数据',
})

const emit = defineEmits<{
  /** 选中行变更 */
  'update:selectedKeys': [keys: (string | number)[]]
  /** 排序变更 */
  sort: [key: string, order: 'asc' | 'desc']
  /** 分页变更 */
  'page-change': [page: number]
  /** 每页条数变更 */
  'size-change': [size: number]
  /** 行点击 */
  'row-click': [row: Record<string, any>, index: number]
}>()

const sortState = ref<SortState | null>(null)

/** 全选状态 */
const isAllSelected = computed(() => {
  if (props.data.length === 0) return false
  return props.data.every(row => props.selectedKeys.includes(row[props.rowKey]))
})

const isIndeterminate = computed(() => {
  const selectedCount = props.data.filter(row => props.selectedKeys.includes(row[props.rowKey])).length
  return selectedCount > 0 && selectedCount < props.data.length
})

/** 列对齐样式 */
function colAlignStyle(col: TableColumn) {
  if (!col.align || col.align === 'left') return {}
  return { textAlign: col.align }
}

/** 列宽样式 */
function colWidthStyle(col: TableColumn) {
  const style: Record<string, string> = {}
  if (col.width) style.width = typeof col.width === 'number' ? `${col.width}px` : col.width
  if (col.minWidth) style.minWidth = typeof col.minWidth === 'number' ? `${col.minWidth}px` : col.minWidth
  return style
}

/** 切换排序 */
function toggleSort(col: TableColumn) {
  if (!col.sortable) return

  let newOrder: 'asc' | 'desc' = 'asc'
  if (sortState.value?.key === col.key) {
    newOrder = sortState.value.order === 'asc' ? 'desc' : 'asc'
  }
  sortState.value = { key: col.key, order: newOrder }
  emit('sort', col.key, newOrder)
}

/** 切换全选 */
function toggleSelectAll() {
  if (isAllSelected.value) {
    emit('update:selectedKeys', [])
  } else {
    const keys = props.data.map(row => row[props.rowKey])
    emit('update:selectedKeys', keys)
  }
}

/** 切换单行选择 */
function toggleSelectRow(row: Record<string, any>) {
  const key = row[props.rowKey]
  const keys = [...props.selectedKeys]
  const index = keys.indexOf(key)
  if (index === -1) {
    keys.push(key)
  } else {
    keys.splice(index, 1)
  }
  emit('update:selectedKeys', keys)
}

function isRowSelected(row: Record<string, any>) {
  return props.selectedKeys.includes(row[props.rowKey])
}

const slots = defineSlots<{
  /** 自定义列插槽，名称为 column.slot 的值 */
  [key: string]: (scope: { row: Record<string, any>; value: any; index: number }) => any
  /** 空状态插槽 */
  empty?: () => any
}>()
</script>

<template>
  <div :class="styles.wrapper">
    <div :class="styles.tableContainer">
      <table :class="[styles.table, bordered ? styles['table--bordered'] : '', stripe ? styles['table--stripe'] : '']">
        <thead>
          <tr>
            <th v-if="selectable" :class="[styles.th, styles.thCheckbox]">
              <input
                type="checkbox"
                :checked="isAllSelected"
                :indeterminate="isIndeterminate"
                @change="toggleSelectAll"
              />
            </th>
            <th
              v-for="col in columns"
              :key="col.key"
              :class="[
                styles.th,
                col.sortable ? styles.thSortable : '',
                col.fixed === 'left' ? styles.thFixedLeft : '',
                col.fixed === 'right' ? styles.thFixedRight : '',
              ]"
              :style="{ ...colWidthStyle(col), ...colAlignStyle(col) }"
              @click="col.sortable ? toggleSort(col) : undefined"
            >
              <span :class="styles.thContent">
                <span>{{ col.title }}</span>
                <span v-if="col.sortable" :class="styles.sortIcons">
                  <AppIcon name="arrow-up" :class="[styles.sortIcon, sortState?.key === col.key && sortState?.order === 'asc' ? styles.sortActive : '']"
                    :size="12" />
                  <AppIcon name="arrow-down" :class="[styles.sortIcon, sortState?.key === col.key && sortState?.order === 'desc' ? styles.sortActive : '']"
                    :size="12" />
                </span>
              </span>
            </th>
          </tr>
        </thead>
        <tbody v-if="data.length > 0">
          <tr
            v-for="(row, rowIndex) in data"
            :key="row[rowKey] ?? rowIndex"
            :class="styles.tr"
            @click="emit('row-click', row, rowIndex)"
          >
            <td v-if="selectable" :class="styles.td">
              <input
                type="checkbox"
                :checked="isRowSelected(row)"
                @change.stop="toggleSelectRow(row)"
              />
            </td>
            <td
              v-for="col in columns"
              :key="col.key"
              :class="[
                styles.td,
                col.fixed === 'left' ? styles.tdFixedLeft : '',
                col.fixed === 'right' ? styles.tdFixedRight : '',
              ]"
              :style="colAlignStyle(col)"
            >
              <slot
                v-if="col.slot && slots[col.slot]"
                :name="col.slot"
                :row="row"
                :value="row[col.key]"
                :index="rowIndex"
              />
              <template v-else>{{ row[col.key] }}</template>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 空状态 -->
      <div v-if="data.length === 0 && !loading" :class="styles.empty">
        <slot name="empty">
          <span>{{ emptyText }}</span>
        </slot>
      </div>

      <!-- 加载遮罩 -->
      <div v-if="loading" :class="styles.loadingOverlay">
        <span :class="styles.loadingSpinner" />
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="pagination" :class="styles.pagination">
      <span :class="styles.paginationInfo">
        共 {{ pagination.total }} 条
      </span>
      <select
        :class="styles.pageSizeSelect"
        :value="pagination.pageSize"
        @change="emit('size-change', Number(($event.target as HTMLSelectElement).value))"
      >
        <option
          v-for="size in (pagination.pageSizes || [10, 20, 50, 100])"
          :key="size"
          :value="size"
        >
          {{ size }} 条/页
        </option>
      </select>
      <div :class="styles.paginationButtons">
        <button
          :class="styles.pageButton"
          :disabled="pagination.current <= 1"
          @click="emit('page-change', pagination.current - 1)"
        >
          &lt;
        </button>
        <span :class="styles.pageInfo">
          {{ pagination.current }} / {{ Math.ceil(pagination.total / pagination.pageSize) || 1 }}
        </span>
        <button
          :class="styles.pageButton"
          :disabled="pagination.current >= Math.ceil(pagination.total / pagination.pageSize)"
          @click="emit('page-change', pagination.current + 1)"
        >
          &gt;
        </button>
      </div>
    </div>
  </div>
</template>
