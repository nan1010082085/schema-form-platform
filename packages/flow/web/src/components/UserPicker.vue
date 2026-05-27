<script setup lang="ts">
import { ref } from 'vue'

interface User {
  id: string
  username: string
  displayName: string
  role: string
}

withDefaults(defineProps<{
  modelValue?: string[]
  placeholder?: string
}>(), {
  placeholder: '搜索用户...',
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const options = ref<User[]>([])
const loading = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

async function search(q: string) {
  if (!q) { options.value = []; return }
  loading.value = true
  try {
    const res = await fetch(`/api/users?q=${encodeURIComponent(q)}`)
    const json = await res.json()
    options.value = json.success ? json.data : []
  } catch {
    options.value = []
  } finally {
    loading.value = false
  }
}

function onSearch(q: string) {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => search(q), 300)
}

function onChange(val: string[]) {
  emit('update:modelValue', val)
}
</script>

<template>
  <el-select
    :model-value="modelValue"
    multiple
    filterable
    remote
    reserve-keyword
    :placeholder="placeholder"
    :remote-method="onSearch"
    :loading="loading"
    @change="onChange"
  >
    <el-option
      v-for="u in options"
      :key="u.id"
      :label="`${u.displayName} (${u.username})`"
      :value="u.id"
    />
  </el-select>
</template>
