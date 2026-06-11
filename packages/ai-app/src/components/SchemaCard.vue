<script setup lang="ts">
import { ElButton } from 'element-plus'

export interface SchemaField {
  icon: string
  name: string
  type: string
  required?: boolean
  meta?: string
}

export interface SchemaCardProps {
  title: string
  fields: SchemaField[]
  /** primary action label, e.g. "确认发布" */
  primaryAction?: string
  /** secondary action label, e.g. "修改" */
  secondaryAction?: string
  /** compact mode for inline message cards */
  compact?: boolean
}

defineProps<SchemaCardProps>()

const emit = defineEmits<{
  'primary-action': []
  'secondary-action': []
}>()
</script>

<template>
  <div :class="[$style.card, { [$style.compact]: compact }]">
    <div :class="$style.head">
      <div :class="$style.headLeft">
        <div :class="$style.headIcon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
        </div>
        <span :class="$style.title">{{ title }}</span>
      </div>
      <span :class="$style.badge">{{ fields.length }} 个字段</span>
    </div>
    <div :class="$style.body">
      <div
        v-for="(field, idx) in fields"
        :key="idx"
        :class="$style.field"
      >
        <div :class="$style.fieldIcon">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path v-if="field.type === 'input'" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle v-if="field.type === 'input'" cx="12" cy="7" r="4" />
            <path v-else-if="field.type === 'email'" d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline v-else-if="field.type === 'email'" points="22,6 12,13 2,6" />
            <path v-else-if="field.type === 'phone'" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            <template v-else-if="field.type === 'password'">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </template>
            <rect v-else x="3" y="3" width="18" height="18" rx="2" ry="2" />
          </svg>
        </div>
        <div :class="$style.fieldInfo">
          <div :class="$style.fieldName">{{ field.name }}</div>
          <div :class="$style.fieldType">{{ field.type }}</div>
        </div>
        <span v-if="field.required" :class="$style.fieldReq">必填</span>
        <span v-else :class="$style.fieldOpt">可选</span>
      </div>
    </div>
    <div v-if="!compact && (primaryAction || secondaryAction)" :class="$style.actions">
      <ElButton
        v-if="secondaryAction"
        :class="$style.btnGhost"
        @click="emit('secondary-action')"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        {{ secondaryAction }}
      </ElButton>
      <ElButton
        v-if="primaryAction"
        :class="$style.btnPrimary"
        type="primary"
        @click="emit('primary-action')"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {{ primaryAction }}
      </ElButton>
    </div>
  </div>
</template>

<style module src="./SchemaCard.module.css" />
