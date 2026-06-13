<script setup lang="ts">
import { message } from '@schema-form/shared-utils/message'
import { downloadConversation } from '@/api/aiApi'
import AiConversationSearch from './AiConversationSearch.vue'
import type { Conversation } from '@/types'
import type { ExportFormat } from '@/api/aiApi'

export interface AiConversationListProps {
  conversations: Conversation[]
  activeId?: string
}

defineProps<AiConversationListProps>()

const emit = defineEmits<{
  select: [id: string]
  'new-conversation': []
  delete: [id: string]
}>()

/** 格式化时间 YYYYMMDD hhmmss */
function formatTime(date: Date | string): string {
  const d = new Date(date)
  const pad = (n: number) => String(n).padStart(2, '0')
  const Y = d.getFullYear()
  const M = pad(d.getMonth() + 1)
  const D = pad(d.getDate())
  const h = pad(d.getHours())
  const m = pad(d.getMinutes())
  const s = pad(d.getSeconds())
  return `${Y}${M}${D} ${h}${m}${s}`
}

/** 导出对话 */
async function handleExport(command: { id: string; format: ExportFormat }): Promise<void> {
  try {
    await downloadConversation(command.id, command.format)
    message.success('导出成功')
  } catch {
    message.error('导出失败')
  }
}
</script>

<template>
  <div :class="$style.sidebar">
    <div :class="$style.header">
      <span :class="$style.title">对话列表</span>
      <t-button :class="$style.newBtn" variant="text" @click="emit('new-conversation')">+</t-button>
    </div>
    <AiConversationSearch @select="(id) => emit('select', id)" />
    <t-scrollbar :class="$style.list">
      <div
        v-for="conv in conversations"
        :key="conv.id"
        :class="[$style.item, { [$style.active]: conv.id === activeId }]"
        @click="emit('select', conv.id)"
      >
        <div :class="$style.itemTitle">{{ conv.title }}</div>
        <div :class="$style.itemMeta">
          <span :class="[$style.itemTag, $style[conv.activeAgent]]">
            {{ conv.activeAgent === 'editor' ? 'Editor' : 'Flow' }}
          </span>
          <span :class="$style.itemTime">{{ formatTime(conv.updatedAt) }}</span>
          <t-dropdown
            :class="$style.exportBtn"
            trigger="click"
            :options="[
              { content: '导出 JSON', value: 'json' },
              { content: '导出 Markdown', value: 'markdown' },
              { content: '导出 HTML', value: 'html' },
            ]"
            @click.stop
            @click-command="(cmd: string) => handleExport({ id: conv.id, format: cmd as ExportFormat })"
          >
            <t-button :class="$style.iconBtn" title="导出对话" variant="text" @click.stop>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </t-button>
          </t-dropdown>
          <t-button :class="$style.deleteBtn" variant="text" @click.stop="emit('delete', conv.id)" title="删除对话">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </t-button>
        </div>
      </div>
      <div v-if="conversations.length === 0" :class="$style.empty">
        暂无对话
      </div>
    </t-scrollbar>
  </div>
</template>

<style module src="./AiConversationList.module.css" />
