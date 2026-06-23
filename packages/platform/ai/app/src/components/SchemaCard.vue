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

function getFieldIcon(type: string): string {
  const iconMap: Record<string, string> = {
    input: 'user',
    email: 'message',
    phone: 'phone',
    password: 'lock',
  }
  return iconMap[type] ?? 'grid'
}
</script>

<template>
  <div :class="[$style.card, { [$style.compact]: compact }]">
    <div :class="$style.head">
      <div :class="$style.headLeft">
        <div :class="$style.headIcon">
          <AppIcon name="grid" :size="14" />
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
          <AppIcon :name="getFieldIcon(field.type)" :size="12" />
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
      <el-button
        v-if="secondaryAction"
        :class="$style.btnGhost"
        @click="emit('secondary-action')"
      >
        <AppIcon name="edit" :size="12" />
        {{ secondaryAction }}
      </el-button>
      <el-button
        v-if="primaryAction"
        :class="$style.btnPrimary"
        type="primary"
        @click="emit('primary-action')"
      >
        <AppIcon name="check" :size="12" />
        {{ primaryAction }}
      </el-button>
    </div>
  </div>
</template>

<style module src="./SchemaCard.module.scss" />
