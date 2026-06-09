<script setup lang="ts">
/**
 * Schema 渲染预览卡片
 *
 * 将 Widget[] 渲染为 Element Plus 表单预览，
 * 替代原来的 SchemaCard 字段列表，让用户直接看到渲染效果。
 */
import { computed } from 'vue'
import type { Widget } from '@/types'

export interface SchemaPreviewCardProps {
  widgets: Widget[]
  title?: string
  compact?: boolean
}

const props = withDefaults(defineProps<SchemaPreviewCardProps>(), {
  title: '生成的表单',
  compact: false,
})

const emit = defineEmits<{
  'click': []
  'primary-action': []
  'secondary-action': []
}>()

// 按 position.y 排序，提取顶层 widgets（非 children）
const sortedWidgets = computed(() => {
  const list = props.widgets.filter(w => w.type !== 'form')
  return [...list].sort((a, b) => (a.position?.y ?? 0) - (b.position?.y ?? 0))
})

// 表单容器 props
const formProps = computed(() => {
  const form = props.widgets.find(w => w.type === 'form')
  return form?.props ?? {}
})

/** 获取组件的 placeholder */
function getPlaceholder(w: Widget): string {
  const p = w.props as Record<string, unknown> | undefined
  return (p?.placeholder as string) ?? `请输入${w.label ?? w.field ?? ''}`
}

/** 获取组件的 maxlength */
function getMaxlength(w: Widget): number | undefined {
  const p = w.props as Record<string, unknown> | undefined
  return p?.maxlength as number | undefined
}

/** 获取组件的 clearable */
function isClearable(w: Widget): boolean {
  const p = w.props as Record<string, unknown> | undefined
  return p?.clearable === true
}

/** 获取组件的 showPassword */
function isShowPassword(w: Widget): boolean {
  const p = w.props as Record<string, unknown> | undefined
  return p?.showPassword === true
}

/** 获取 select/checkbox/radio 的 options */
function getOptions(w: Widget): Array<{ label: string; value: unknown }> {
  const raw = (w.props as Record<string, unknown>)?.options ?? (w as unknown as Record<string, unknown>)?.options
  if (Array.isArray(raw)) {
    return raw.map((o: Record<string, unknown>) => ({
      label: String(o.label ?? o.value ?? ''),
      value: o.value ?? o.label ?? '',
    }))
  }
  return []
}

/** 获取按钮文本 */
function getButtonText(w: Widget): string {
  const p = w.props as Record<string, unknown> | undefined
  return (p?.text as string) ?? w.label ?? '按钮'
}

/** 获取按钮类型 */
function getButtonType(w: Widget): string {
  const p = w.props as Record<string, unknown> | undefined
  return (p?.type as string) ?? 'default'
}
</script>

<template>
  <div :class="[$style.previewCard, { [$style.compact]: compact }]" @click="emit('click')">
    <!-- 标题栏 -->
    <div :class="$style.header">
      <div :class="$style.headerLeft">
        <div :class="$style.headerIcon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
        </div>
        <span :class="$style.title">{{ title }}</span>
      </div>
      <div :class="$style.headerRight">
        <span :class="$style.badge">{{ sortedWidgets.length }} 个字段</span>
        <span :class="$style.viewHint">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          预览
        </span>
      </div>
    </div>

    <!-- 表单预览区域 -->
    <div :class="$style.previewBody">
      <el-form
        :label-width="(formProps.labelWidth as string) ?? '100px'"
        :label-position="(formProps.labelPosition as 'left' | 'right' | 'top') ?? 'right'"
        :class="$style.form"
      >
        <template v-for="widget in sortedWidgets" :key="widget.id">
          <!-- input / email / phone / password -->
          <el-form-item
            v-if="['input', 'email', 'phone', 'password'].includes(widget.type)"
            :label="widget.label"
            :class="$style.formItem"
          >
            <el-input
              :placeholder="getPlaceholder(widget)"
              :clearable="isClearable(widget)"
              :show-password="isShowPassword(widget)"
              :maxlength="getMaxlength(widget)"
              :disabled="!compact"
              size="default"
            />
          </el-form-item>

          <!-- textarea -->
          <el-form-item
            v-else-if="widget.type === 'textarea'"
            :label="widget.label"
            :class="$style.formItem"
          >
            <el-input
              type="textarea"
              :placeholder="getPlaceholder(widget)"
              :rows="3"
              :disabled="!compact"
            />
          </el-form-item>

          <!-- select -->
          <el-form-item
            v-else-if="widget.type === 'select'"
            :label="widget.label"
            :class="$style.formItem"
          >
            <el-select
              :placeholder="getPlaceholder(widget)"
              :clearable="isClearable(widget)"
              :disabled="!compact"
              style="width: 100%"
            >
              <el-option
                v-for="opt in getOptions(widget)"
                :key="String(opt.value)"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>

          <!-- checkbox -->
          <el-form-item
            v-else-if="widget.type === 'checkbox'"
            :label="widget.label || undefined"
            :class="$style.formItem"
          >
            <el-checkbox-group :disabled="!compact">
              <el-checkbox
                v-for="opt in getOptions(widget)"
                :key="String(opt.value)"
                :label="opt.label"
                :value="opt.value"
              />
            </el-checkbox-group>
          </el-form-item>

          <!-- radio -->
          <el-form-item
            v-else-if="widget.type === 'radio'"
            :label="widget.label"
            :class="$style.formItem"
          >
            <el-radio-group :disabled="!compact">
              <el-radio
                v-for="opt in getOptions(widget)"
                :key="String(opt.value)"
                :value="opt.value"
              >
                {{ opt.label }}
              </el-radio>
            </el-radio-group>
          </el-form-item>

          <!-- switch -->
          <el-form-item
            v-else-if="widget.type === 'switch'"
            :label="widget.label"
            :class="$style.formItem"
          >
            <el-switch :disabled="!compact" />
          </el-form-item>

          <!-- date-picker -->
          <el-form-item
            v-else-if="widget.type === 'date-picker' || widget.type === 'datepicker'"
            :label="widget.label"
            :class="$style.formItem"
          >
            <el-date-picker
              :placeholder="getPlaceholder(widget)"
              :disabled="!compact"
              style="width: 100%"
            />
          </el-form-item>

          <!-- time-picker -->
          <el-form-item
            v-else-if="widget.type === 'time-picker' || widget.type === 'timepicker'"
            :label="widget.label"
            :class="$style.formItem"
          >
            <el-time-picker
              :placeholder="getPlaceholder(widget)"
              :disabled="!compact"
              style="width: 100%"
            />
          </el-form-item>

          <!-- button -->
          <el-form-item
            v-else-if="widget.type === 'button'"
            :class="$style.formItem"
          >
            <el-button
              :type="getButtonType(widget) as any"
              :disabled="!compact"
            >
              {{ getButtonText(widget) }}
            </el-button>
          </el-form-item>

          <!-- 数字输入 -->
          <el-form-item
            v-else-if="widget.type === 'number'"
            :label="widget.label"
            :class="$style.formItem"
          >
            <el-input-number
              :placeholder="getPlaceholder(widget)"
              :disabled="!compact"
              style="width: 100%"
            />
          </el-form-item>

          <!-- 未知类型：fallback 显示 input -->
          <el-form-item
            v-else
            :label="widget.label"
            :class="$style.formItem"
          >
            <el-input
              :placeholder="getPlaceholder(widget) || widget.type"
              :disabled="!compact"
            />
          </el-form-item>
        </template>
      </el-form>
    </div>

    <!-- 操作栏 -->
    <div :class="$style.actions">
      <button :class="$style.btnPrimary" @click.stop="emit('primary-action')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        确认发布
      </button>
    </div>
  </div>
</template>

<style module src="./SchemaPreviewCard.module.css" />
