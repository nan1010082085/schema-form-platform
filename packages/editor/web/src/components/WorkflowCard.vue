<script setup lang="ts">
/**
 * WorkflowCard — 工作流卡片组件
 *
 * 用于列表页卡片视图，展示工作流缩略图、名称、描述、状态和操作按钮。
 */
import { computed } from 'vue'
import { Edit, CopyDocument, Promotion, Delete, SetUp } from '@element-plus/icons-vue'
import type { WorkflowItem } from '@/utils/apiClient'
import styles from './WorkflowCard.module.scss'

const props = defineProps<{
  item: WorkflowItem
}>()

const emit = defineEmits<{
  edit: [item: WorkflowItem]
  duplicate: [item: WorkflowItem]
  publish: [item: WorkflowItem]
  delete: [item: WorkflowItem]
}>()

const statusLabel = computed(() => {
  const map: Record<string, string> = { draft: '草稿', published: '已发布', archived: '已归档' }
  return map[props.item.status] ?? props.item.status
})

const statusType = computed(() => {
  const map: Record<string, '' | 'success' | 'info' | 'warning' | 'danger'> = {
    draft: 'info',
    published: 'success',
    archived: 'warning',
  }
  return map[props.item.status] ?? 'info'
})

function formatDate(d: string): string {
  return new Date(d).toLocaleString('zh-CN')
}
</script>

<template>
  <div :class="styles.card" @click="emit('edit', item)">
    <!-- 缩略图区域 -->
    <div :class="styles.thumbnail">
      <div :class="styles.thumbnailPlaceholder">
        <el-icon :size="36"><SetUp /></el-icon>
      </div>
      <div :class="styles.statusBadge">
        <el-tag :type="statusType" size="small" effect="dark">{{ statusLabel }}</el-tag>
      </div>
    </div>

    <!-- 内容区域 -->
    <div :class="styles.body">
      <h3 :class="styles.name">{{ item.name }}</h3>
      <p :class="styles.description">{{ item.description || '暂无描述' }}</p>
      <div :class="styles.meta">
        <span :class="styles.date">{{ formatDate(item.updatedAt) }}</span>
      </div>
    </div>

    <!-- 操作栏 -->
    <div :class="styles.actions" @click.stop>
      <el-tooltip content="编辑" placement="top" :show-after="300">
        <el-button size="small" text type="primary" :icon="Edit" @click="emit('edit', item)" />
      </el-tooltip>
      <el-tooltip content="复制" placement="top" :show-after="300">
        <el-button size="small" text :icon="CopyDocument" @click="emit('duplicate', item)" />
      </el-tooltip>
      <el-tooltip :content="item.status === 'published' ? '归档' : '发布'" placement="top" :show-after="300">
        <el-button
          size="small"
          text
          :type="item.status === 'published' ? 'warning' : 'success'"
          :icon="Promotion"
          @click="emit('publish', item)"
        />
      </el-tooltip>
      <el-tooltip content="删除" placement="top" :show-after="300">
        <el-button size="small" text type="danger" :icon="Delete" @click="emit('delete', item)" />
      </el-tooltip>
    </div>
  </div>
</template>
