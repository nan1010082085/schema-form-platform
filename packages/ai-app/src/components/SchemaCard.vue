<script setup lang="ts">
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
      <span :class="$style.title">{{ title }}</span>
      <span :class="$style.badge">{{ fields.length }} fields</span>
    </div>
    <div :class="$style.body">
      <div
        v-for="(field, idx) in fields"
        :key="idx"
        :class="$style.field"
      >
        <span :class="$style.fieldIcon">{{ field.icon }}</span>
        <span :class="$style.fieldName">{{ field.name }}</span>
        <span :class="$style.fieldType">{{ field.type }}</span>
        <span v-if="field.required" :class="$style.fieldReq">必填</span>
      </div>
    </div>
    <div v-if="primaryAction || secondaryAction" :class="$style.actions">
      <button
        v-if="primaryAction"
        :class="$style.btnPrimary"
        @click="emit('primary-action')"
      >
        {{ primaryAction }}
      </button>
      <button
        v-if="secondaryAction"
        :class="$style.btnGhost"
        @click="emit('secondary-action')"
      >
        {{ secondaryAction }}
      </button>
    </div>
  </div>
</template>

<style module src="./SchemaCard.module.css" />
