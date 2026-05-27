<script setup lang="ts">
/**
 * FgSearchList — 搜索列表 Widget
 *
 * 职责：
 * - 根据 searchFields 配置渲染搜索表单
 * - 使用 useWorkerRequest 调用 API 加载数据
 * - 渲染 el-table + el-pagination
 * - 支持 events/api configPanels
 */
import { inject, ref, reactive, computed, watch, onMounted } from 'vue'
import { widgetDataKey } from '../base/types'
import { EVENT_CONTEXT_KEY } from '../../components/WidgetRenderer/types'
import { triggerWidgetEvent } from '../../engine/eventEngine'
import type { SearchFieldConfig } from '../base/types'
import { useWorkerRequest } from '@/composables/useWorkerRequest'
import { useLogger } from '@/composables/useLogger'
import { useExposeWidget } from '@/composables/useExposeWidget'

const widgetData = inject(widgetDataKey)!
const eventCtx = inject(EVENT_CONTEXT_KEY, null)
useExposeWidget(() => ({
  get loading() { return loading.value },
  get tableData() { return tableData.value },
}))
const logger = useLogger('FgSearchList')
const { request } = useWorkerRequest()

// ---- 搜索表单 ----
const searchModel = reactive<Record<string, unknown>>({})

const searchFields = computed<SearchFieldConfig[]>(() =>
  (widgetData.value.props?.searchFields as SearchFieldConfig[]) ?? []
)

const columns = computed(() =>
  (widgetData.value.props?.columns as Array<{ field: string; label: string; width?: string }>) ?? []
)

// ---- 表格数据 ----
const tableData = ref<unknown[]>([])
const total = ref(0)
const currentPage = ref(1)
const loading = ref(false)

const pageSize = computed(() =>
  (widgetData.value.props?.pageSize as number) || 10
)

// ---- 初始化搜索字段默认值 ----
watch(searchFields, (fields) => {
  for (const f of fields) {
    if (searchModel[f.field] === undefined) {
      searchModel[f.field] = f.defaultValue ?? undefined
    }
  }
}, { immediate: true })

// ---- API 加载 ----
async function loadData() {
  const api = widgetData.value.api
  if (!api?.url) return

  loading.value = true
  try {
    const params: Record<string, unknown> = {
      ...api.params,
      ...searchModel,
      page: currentPage.value,
      pageSize: pageSize.value,
    }
    const result = await request({ url: api.url, method: api.method ?? 'get', params })
    const dataPath = api.dataPath
    const root = dataPath ? (result as Record<string, unknown>)?.[dataPath] : result
    if (Array.isArray(root)) {
      tableData.value = root
      total.value = ((result as Record<string, unknown>)?.total as number) ?? root.length
    } else if (root && typeof root === 'object') {
      tableData.value = (root as Record<string, unknown>).list as unknown[] ?? (root as Record<string, unknown>).records as unknown[] ?? []
      total.value = ((root as Record<string, unknown>).total as number) ?? tableData.value.length
    }
  } catch (e) {
    logger.error('search list load error:', e)
    tableData.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function handleSearch() {
  currentPage.value = 1
  loadData()
  if (eventCtx) {
    await triggerWidgetEvent(widgetData.value, 'click', eventCtx, 'search')
  }
}

async function handleReset() {
  for (const key of Object.keys(searchModel)) {
    searchModel[key] = undefined
  }
  currentPage.value = 1
  loadData()
  if (eventCtx) {
    await triggerWidgetEvent(widgetData.value, 'click', eventCtx, 'reset')
  }
}

function handlePageChange(page: number) {
  currentPage.value = page
  loadData()
}

onMounted(() => {
  const api = widgetData.value.api
  if (api?.immediate !== false && api?.url) {
    loadData()
  }
})

// ---- 暴露方法 ----
defineExpose({
  search: handleSearch,
  reset: handleReset,
  reload: loadData,
  getSearchParams: () => ({ ...searchModel }),
  setSearchParams: (params: Record<string, unknown>) => {
    Object.assign(searchModel, params)
  },
})
</script>

<template>
  <div :class="$style.container">
    <!-- 标题 -->
    <div :class="$style.header">
      <span :class="$style.title">{{ (widgetData.props?.title as string) || '列表' }}</span>
    </div>

    <!-- 搜索表单 -->
    <div v-if="searchFields.length > 0" :class="$style.searchBar">
      <template v-for="field in searchFields" :key="field.field">
        <div :class="$style.searchItem">
          <span v-if="field.label" :class="$style.searchLabel">{{ field.label }}</span>
          <el-input
            v-if="field.type === 'input'"
            v-model="searchModel[field.field]"
            :placeholder="field.placeholder || '请输入'"
            clearable
            size="default"
            @keyup.enter="handleSearch"
          />
          <el-select
            v-else-if="field.type === 'select'"
            v-model="searchModel[field.field]"
            :placeholder="field.placeholder || '请选择'"
            clearable
            size="default"
          >
            <el-option
              v-for="opt in (field.options || [])"
              :key="String(opt.value)"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
          <el-date-picker
            v-else-if="field.type === 'date'"
            v-model="searchModel[field.field]"
            type="date"
            :placeholder="field.placeholder || '选择日期'"
            clearable
            size="default"
            value-format="YYYY-MM-DD"
          />
          <el-date-picker
            v-else-if="field.type === 'date-range'"
            v-model="searchModel[field.field]"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            clearable
            size="default"
            value-format="YYYY-MM-DD"
          />
        </div>
      </template>
      <div :class="$style.searchActions">
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>
    </div>

    <!-- 数据表格 -->
    <el-table
      v-loading="loading"
      :data="tableData"
      :stripe="widgetData.props?.stripe !== false"
      :border="widgetData.props?.border !== false"
      :class="$style.table"
    >
      <el-table-column
        v-for="col in columns"
        :key="col.field"
        :prop="col.field"
        :label="col.label"
        :width="col.width"
      />
    </el-table>

    <!-- 分页 -->
    <el-pagination
      v-if="widgetData.props?.showPagination !== false"
      layout="total, prev, pager, next"
      :total="total"
      :page-size="pageSize"
      :current-page="currentPage"
      :class="$style.pagination"
      @current-change="handlePageChange"
    />
  </div>
</template>

<style module>
.container {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.header {
  padding: 12px;
  border-bottom: 1px solid #ebeef5;
}

.title {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}

.searchBar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid #ebeef5;
  background: #fafafa;
}

.searchItem {
  display: flex;
  align-items: center;
  gap: 6px;
}

.searchLabel {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}

.searchActions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.table {
  flex: 1;
  min-height: 0;
}

.pagination {
  padding: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>
