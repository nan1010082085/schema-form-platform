<script setup lang="ts">
/**
 * WorkflowCard — 工作流卡片组件
 *
 * 用于列表页卡片视图，展示工作流缩略图、名称、描述、状态和操作按钮。
 */
import { computed } from 'vue'
import { EditIcon, CopyIcon, SendIcon, DeleteIcon, SettingIcon } from 'tdesign-icons-vue-next'
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

const statusTheme = computed(() => {
  const map: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
    draft: 'default',
    published: 'success',
    archived: 'warning',
  }
  return map[props.item.status] ?? 'default'
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
        <SettingIcon :size="36" />
      </div>
      <div :class="styles.statusBadge">
        <t-tag :theme="statusTheme" size="small" variant="dark">{{ statusLabel }}</t-tag>
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
      <t-popup content="编辑" placement="top" :delay="300">
        <t-button size="small" variant="text" theme="primary" @click="emit('edit', item)">
          <template #icon><EditIcon /></template>
        </t-button>
      </t-popup>
      <t-popup content="复制" placement="top" :delay="300">
        <t-button size="small" variant="text" @click="emit('duplicate', item)">
          <template #icon><CopyIcon /></template>
        </t-button>
      </t-popup>
      <t-popup :content="item.status === 'published' ? '归档' : '发布'" placement="top" :delay="300">
        <t-button
          size="small"
          variant="text"
          :theme="item.status === 'published' ? 'warning' : 'success'"
          @click="emit('publish', item)"
        >
          <template #icon><SendIcon /></template>
        </t-button>
      </t-popup>
      <t-popup content="删除" placement="top" :delay="300">
        <t-button size="small" variant="text" theme="danger" @click="emit('delete', item)">
          <template #icon><DeleteIcon /></template>
        </t-button>
      </t-popup>
    </div>
  </div>
</template>
