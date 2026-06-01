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
          <span>{{ conv.updatedAt }}</span>
          <button :class="$style.deleteBtn" @click.stop="emit('delete', conv.id)">x</button>
        </div>
      </div>
      <div v-if="conversations.length === 0" :class="$style.empty">
        暂无对话
      </div>
    </div>
  </div>
</template>

<style module src="./AiConversationList.module.css" />
