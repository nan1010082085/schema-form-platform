<script setup lang="ts">
import { inject, computed, ref } from 'vue'
import { widgetDataKey, widgetStyleKey } from '../base/types'
import './style.module.scss'
import { useWidgetRenderState } from '../../composables/useWidgetRenderState'
import { useExposeWidget } from '../../composables/useExposeWidget'
import { apiClient } from '../../utils/apiClient'

const widgetData = inject(widgetDataKey)!
const widgetStyle = inject(widgetStyleKey)!
const { isDisabled } = useWidgetRenderState()

interface UserItem {
  _id: string
  username: string
  displayName: string
}

const options = ref<UserItem[]>([])
const loading = ref(false)

useExposeWidget((wd) => ({
  get value() { return wd.value.defaultValue },
  get label() {
    const val = wd.value.defaultValue
    if (!val) return ''
    const found = options.value.find(u => u._id === val)
    return found?.displayName ?? found?.username ?? ''
  },
}))

const dynamicStyle = computed(() => ({
  width: '100%',
  height: `${widgetData.value.position?.h ?? 40}px`,
  '--el-component-size': `${widgetData.value.position?.h ?? 40}px`,
  '--el-component-size-small': `${widgetData.value.position?.h ?? 40}px`,
  fontSize: widgetStyle.value?.fontSize as string,
  color: widgetStyle.value?.color as string,
}))

const selectRef = ref<{ $el?: HTMLElement }>()

function forwardNativeChange() {
  selectRef.value?.$el?.dispatchEvent(new Event('change', { bubbles: true }))
}

async function remoteSearch(query: string) {
  if (!query) {
    options.value = []
    return
  }
  loading.value = true
  try {
    const res = await apiClient.requestUrl('get', '/api/users', { q: query, pageSize: 20 })
    const data = res as Record<string, unknown>
    const result = data.data as Record<string, unknown> | undefined
    options.value = (result?.items as UserItem[]) ?? []
  } catch {
    options.value = []
  } finally {
    loading.value = false
  }
}

function getUserLabel(user: UserItem): string {
  return user.displayName ? `${user.displayName}(${user.username})` : user.username
}
</script>

<template>
  <el-select
    ref="selectRef"
    v-model="widgetData.defaultValue"
    :style="dynamicStyle"
    :placeholder="(widgetData.props?.placeholder as string) || '请选择用户'"
    :disabled="isDisabled"
    :clearable="(widgetData.props?.clearable as boolean) ?? true"
    :multiple="(widgetData.props?.multiple as boolean) || false"
    filterable
    remote
    :remote-method="remoteSearch"
    :loading="loading"
    @change="forwardNativeChange"
  >
    <el-option
      v-for="user in options"
      :key="user._id"
      :label="getUserLabel(user)"
      :value="user._id"
    />
  </el-select>
</template>
