<script setup lang="ts">
/**
 * WidgetDocsView -- 部件文档查看器
 *
 * 左侧从 widget registry 读取已注册部件（与编辑器 ComponentPanel 一致），
 * 右侧展示选中部件的文档：渲染预览、Expose 方法、Props 属性、Schema 示例。
 */
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { WidgetRenderer } from '@/components/WidgetRenderer'
import { getWidgetsByGroup, type WidgetRegistryItem } from '@/widgets/registry'
import { componentDocs } from '@/docs/components'
import type { ComponentDoc, PropDoc, ExposeDoc } from '@/docs/components'
import type { PartialWidget } from '@/widgets/base/types'
import styles from './WidgetDocsView.module.scss'
import AppIcon from '@schema-form/shared-components/common/AppIcon.vue'

const route = useRoute()
const router = useRouter()

// 分组定义（与 ComponentPanel 一致，补充 chart）
const GROUP_LABELS: Record<string, string> = {
  layout: '布局部件',
  container: '容器部件',
  form: '表单部件',
  table: '表格部件',
  action: '操作部件',
  static: '静态部件',
  business: '业务部件',
  chart: '图表部件',
}

interface WidgetGroup {
  label: string
  key: string
  items: WidgetRegistryItem[]
}

const allGroups = computed<WidgetGroup[]>(() => {
  const groups: WidgetGroup[] = []
  for (const [key, label] of Object.entries(GROUP_LABELS)) {
    const items = getWidgetsByGroup(key as WidgetRegistryItem['group'])
    if (items.length > 0) {
      groups.push({ label, key, items })
    }
  }
  return groups
})

const expandedGroups = ref<Set<string>>(new Set(allGroups.value.map(g => g.key)))

function toggleGroup(key: string) {
  if (expandedGroups.value.has(key)) {
    expandedGroups.value.delete(key)
  } else {
    expandedGroups.value.add(key)
  }
}

// 文档查找：registry type === doc id
const docMap = computed(() => {
  const map = new Map<string, ComponentDoc>()
  for (const doc of componentDocs) {
    map.set(doc.id, doc)
  }
  return map
})

const selectedType = ref<string>('')

// 从路由 query 初始化选中
const initialId = route.query.widget as string | undefined
if (initialId && docMap.value.has(initialId)) {
  selectedType.value = initialId
}
if (!selectedType.value) {
  // 默认选中第一个有文档的部件
  for (const group of allGroups.value) {
    for (const item of group.items) {
      if (docMap.value.has(item.type)) {
        selectedType.value = item.type
        break
      }
    }
    if (selectedType.value) break
  }
}

const selectedDoc = computed(() => docMap.value.get(selectedType.value) ?? null)
const selectedWidget = computed(() => {
  for (const group of allGroups.value) {
    const found = group.items.find(i => i.type === selectedType.value)
    if (found) return found
  }
  return null
})

function selectWidget(type: string) {
  selectedType.value = type
  router.replace({ query: { widget: type } })
}

// 路由 query 变化时同步选中
watch(() => route.query.widget, (id) => {
  if (id && typeof id === 'string') {
    selectedType.value = id
  }
})

// Schema 预览
function toRendererSchema(doc: ComponentDoc, idx: number): PartialWidget[] {
  return doc.schemas[idx].schema as unknown as PartialWidget[]
}

function formatSchema(doc: ComponentDoc, idx: number): string {
  return JSON.stringify(doc.schemas[idx].schema, null, 2)
}
</script>

<template>
  <div :class="styles.container">
    <!-- 左侧导航栏 -->
    <aside :class="styles.sidebar">
      <div :class="styles.sidebarHeader">
        <AppIcon name="document" :size="20" />
        <span :class="styles.sidebarTitle">部件文档</span>
      </div>
      <div :class="styles.sidebarScroll">
        <div
          v-for="group in allGroups"
          :key="group.key"
          :class="styles.group"
        >
          <!-- 分组标题（手风琴折叠） -->
          <div
            :class="styles.groupHeader"
            @click="toggleGroup(group.key)"
          >
            <AppIcon v-if="expandedGroups.has(group.key)" name="arrow-down" :size="12" :class="styles.arrow" />
            <AppIcon v-else name="arrow-right" :size="12" :class="styles.arrow" />
            <span :class="styles.groupLabel">{{ group.label }}</span>
            <span :class="styles.groupCount">{{ group.items.length }}</span>
          </div>

          <!-- 2列网格布局 -->
          <div v-if="expandedGroups.has(group.key)" :class="styles.groupBody">
            <div
              v-for="item in group.items"
              :key="item.type"
              :class="[styles.item, selectedType === item.type && styles.itemActive]"
              @click="selectWidget(item.type)"
            >
              <span :class="styles.itemLabel">{{ item.displayName }}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- 右侧内容区 -->
    <main :class="styles.content">
      <div :class="styles.contentScroll">
        <div v-if="selectedDoc" :class="styles.docContent">
          <!-- 标题 -->
          <h1 :class="styles.docTitle">{{ selectedDoc.name }}</h1>
          <p :class="styles.docDesc">{{ selectedDoc.description }}</p>

          <!-- 渲染预览 -->
          <div v-if="selectedDoc.schemas.length > 0" :class="styles.section">
            <h2 :class="styles.sectionTitle">渲染预览</h2>
            <div
              v-for="(ex, idx) in selectedDoc.schemas"
              :key="idx"
              :class="styles.exampleCard"
            >
              <div v-if="selectedDoc.schemas.length > 1" :class="styles.exampleHeader">
                <span :class="styles.exampleTitle">{{ ex.title }}</span>
              </div>
              <div :class="styles.previewContainer">
                <WidgetRenderer :schema="toRendererSchema(selectedDoc, idx)" />
              </div>
            </div>
          </div>

          <!-- Expose 暴露方法 -->
          <div v-if="selectedDoc.exposes.length > 0" :class="styles.section">
            <h2 :class="styles.sectionTitle">Expose 暴露方法</h2>
            <el-table
              :data="(selectedDoc.exposes as ExposeDoc[])"
              :class="styles.table"
              border
              size="small"
              row-key="name"
            >
              <el-table-column prop="name" label="方法名" width="160" />
              <el-table-column prop="type" label="类型" width="140">
                <template #default="{ row }">
                  <code :class="styles.typeCode">{{ (row as ExposeDoc).type }}</code>
                </template>
              </el-table-column>
              <el-table-column prop="description" label="说明" min-width="200" />
            </el-table>
          </div>

          <!-- Props 属性 -->
          <div v-if="selectedDoc.props.length > 0" :class="styles.section">
            <h2 :class="styles.sectionTitle">Props 属性</h2>
            <el-table
              :data="(selectedDoc.props as PropDoc[])"
              :class="styles.table"
              border
              size="small"
              row-key="name"
            >
              <el-table-column prop="name" label="属性名" width="160" />
              <el-table-column prop="type" label="类型" width="120">
                <template #default="{ row }">
                  <code :class="styles.typeCode">{{ (row as PropDoc).type }}</code>
                </template>
              </el-table-column>
              <el-table-column prop="default" label="默认值" width="120">
                <template #default="{ row }">
                  <code :class="styles.typeCode">{{ (row as PropDoc).default }}</code>
                </template>
              </el-table-column>
              <el-table-column prop="description" label="说明" min-width="200" />
            </el-table>
          </div>

          <!-- Schema 示例 -->
          <div v-if="selectedDoc.schemas.length > 0" :class="styles.section">
            <h2 :class="styles.sectionTitle">Schema 示例</h2>
            <div
              v-for="(ex, idx) in selectedDoc.schemas"
              :key="idx"
              :class="styles.exampleCard"
            >
              <div :class="styles.exampleHeader">
                <span :class="styles.exampleTitle">{{ ex.title }}</span>
                <span v-if="ex.description" :class="styles.exampleDesc">{{ ex.description }}</span>
              </div>
              <pre :class="styles.schemaCode"><code>{{ formatSchema(selectedDoc, idx) }}</code></pre>
            </div>
          </div>
        </div>

        <!-- 无文档时显示基本信息 -->
        <div v-else-if="selectedWidget" :class="styles.docContent">
          <h1 :class="styles.docTitle">{{ selectedWidget.displayName }}</h1>
          <p :class="styles.docDesc">{{ selectedWidget.config.description }}</p>
          <div :class="styles.noDocHint">该部件暂无详细文档</div>
        </div>

        <!-- 未选中 -->
        <div v-else :class="styles.empty">
          <AppIcon name="document" :size="64" :class="styles.emptyIcon" />
          <p :class="styles.emptyText">请从左侧选择一个部件</p>
        </div>
      </div>
    </main>
  </div>
</template>
