<script setup lang="ts">
import type { Conversation } from '@/types'

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
</script>

<template>
  <div :class="$style.sidebar">
    <div :class="$style.header">
      <span :class="$style.title">对话列表</span>
      <button :class="$style.newBtn" @click="emit('new-conversation')">+</button>
    </div>
    <div :class="$style.list">
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
          <button :class="$style.deleteBtn" @click.stop="emit('delete', conv.id)" title="删除对话">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
      <div v-if="conversations.length === 0" :class="$style.empty">
        暂无对话
      </div>
    </div>
  </div>
</template>

<style module src="./AiConversationList.module.css" />
