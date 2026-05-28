<script setup lang="ts">
import { inject, computed, ref } from 'vue'
import { widgetDataKey, widgetStyleKey } from '../base/types'
import { useWidgetRenderState } from '../../composables/useWidgetRenderState'
import { useExposeWidget } from '../../composables/useExposeWidget'

const widgetData = inject(widgetDataKey)!
const widgetStyle = inject(widgetStyleKey)!
const { isDisabled } = useWidgetRenderState()

useExposeWidget((wd) => ({
  get value() { return wd.value.defaultValue },
}))

const inputValue = ref('')

const dynamicStyle = computed(() => ({
  fontSize: widgetStyle.value?.fontSize as string,
}))

const tags = computed(() => (widgetData.value.defaultValue as string[]) || [])

function addTag() {
  const val = inputValue.value.trim()
  if (!val) return
  const maxTags = (widgetData.value.props?.maxTags as number) || 10
  if (tags.value.length >= maxTags) return
  if (tags.value.includes(val)) return
  widgetData.value.defaultValue = [...tags.value, val]
  inputValue.value = ''
}

function removeTag(tag: string) {
  widgetData.value.defaultValue = tags.value.filter(t => t !== tag)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    addTag()
  }
}
</script>

<template>
  <div :class="$style.tagInput" :style="dynamicStyle">
    <el-tag
      v-for="tag in tags"
      :key="tag"
      :closable="(widgetData.props?.closable as boolean) ?? true"
      :disabled="isDisabled"
      size="small"
      @close="removeTag(tag)"
    >
      {{ tag }}
    </el-tag>
    <el-input
      v-if="tags.length < ((widgetData.props?.maxTags as number) || 10)"
      v-model="inputValue"
      size="small"
      :placeholder="(widgetData.props?.placeholder as string) || '请输入标签'"
      :disabled="isDisabled"
      :maxlength="(widgetData.props?.maxlength as number) || undefined"
      @keydown="handleKeydown"
      @blur="addTag"
    />
  </div>
</template>

<style module>
.tagInput {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  padding: 4px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  min-height: 32px;
}
</style>
