<script setup lang="ts">
import { inject, computed, ref, watch, type CSSProperties } from 'vue'
import { widgetDataKey } from '../base/types'
import { useApiRequest } from '../../composables/useApiRequest'
import { useExposeWidget } from '../../composables/useExposeWidget'
import styles from './style.module.scss'
import AppIcon from '@schema-form/shared-components/common/AppIcon.vue'

const widgetData = inject(widgetDataKey)!
const { fetchApi } = useApiRequest()

const loading = ref(false)
const apiValue = ref<number | null>(null)

const props = computed(() => widgetData.value.props ?? {})

// API data loading
const apiUrl = computed(() => props.value.apiUrl as string)
const apiMethod = computed(() => (props.value.apiMethod as string) ?? 'get')
const apiHeaders = computed(() => (props.value.apiHeaders as Record<string, string>) ?? {})
const responseDataPath = computed(() => props.value.responseDataPath as string)

function resolveDataPath(data: unknown, path: string): unknown {
  if (!path) return data
  return path.split('.').reduce<unknown>((obj, key) => {
    if (obj && typeof obj === 'object' && key in (obj as Record<string, unknown>)) {
      return (obj as Record<string, unknown>)[key]
    }
    return undefined
  }, data)
}

async function loadData() {
  if (!apiUrl.value) return
  loading.value = true
  try {
    const result = await fetchApi(apiUrl.value, apiMethod.value, apiHeaders.value)
    const extracted = resolveDataPath(result, responseDataPath.value)
    apiValue.value = typeof extracted === 'number' ? extracted : Number(extracted) || 0
  } catch {
    apiValue.value = null
  } finally {
    loading.value = false
  }
}

if (apiUrl.value) {
  loadData()
}
watch(apiUrl, (url) => {
  if (url) loadData()
  else apiValue.value = null
})

// Current display value: API data takes priority when apiUrl is set
const currentValue = computed(() => {
  if (apiUrl.value && apiValue.value !== null) return apiValue.value
  return (props.value.value as number) ?? 0
})

// Number formatting with thousand separators
const formattedValue = computed(() => {
  const num = currentValue.value
  const precision = (props.value.precision as number) ?? 0
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  })
})

// Trend config
const trend = computed(() => (props.value.trend as string) ?? 'flat')
const trendValue = computed(() => props.value.trendValue as string)

const trendClass = computed(() => {
  if (trend.value === 'up') return styles.trendUp
  if (trend.value === 'down') return styles.trendDown
  return styles.trendFlat
})

// Icon resolution
const iconName = computed(() => props.value.icon as string)

// Dynamic styles
const valueStyle = computed<CSSProperties>(() => {
  const s: CSSProperties = {}
  if (props.value.color) s.color = props.value.color as string
  if (props.value.valueFontSize) s.fontSize = props.value.valueFontSize as string
  return s
})

const titleStyle = computed<CSSProperties>(() => {
  const s: CSSProperties = {}
  if (props.value.titleFontSize) s.fontSize = props.value.titleFontSize as string
  return s
})

// Expose runtime state
useExposeWidget(() => ({
  get loading() { return loading.value },
  get currentValue() { return currentValue.value },
}))
</script>

<template>
  <div :class="[styles.container, { [styles.loading]: loading }]">
    <div :class="styles.header">
      <AppIcon
        v-if="iconName"
        :name="iconName"
        :class="styles.icon"
      />
      <span :class="styles.title" :style="titleStyle">
        {{ (props.title as string) || '统计指标' }}
      </span>
    </div>
    <div :class="styles.body">
      <span v-if="props.prefix" :class="styles.prefix">{{ props.prefix }}</span>
      <span :class="styles.value" :style="valueStyle">{{ formattedValue }}</span>
      <span v-if="props.suffix" :class="styles.suffix">{{ props.suffix }}</span>
    </div>
    <div v-if="trendValue" :class="styles.footer">
      <template v-if="trend === 'up'">
        <AppIcon name="caret-top" :class="[styles.trendIcon, trendClass]" />
      </template>
      <template v-else-if="trend === 'down'">
        <AppIcon name="caret-bottom" :class="[styles.trendIcon, trendClass]" />
      </template>
      <template v-else>
        <AppIcon name="minus" :class="[styles.trendIcon, trendClass]" />
      </template>
      <span :class="[styles.trendValue, trendClass]">{{ trendValue }}</span>
    </div>
  </div>
</template>
