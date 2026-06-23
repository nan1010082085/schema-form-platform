<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { flowApi } from '../api/flowApi.js'
import styles from './RolePicker.module.scss'

interface Role {
  id: string
  name: string
  description?: string
}

interface SelectOption {
  value: string
  label: string
}

const props = withDefaults(defineProps<{
  modelValue?: string[]
  placeholder?: string
}>(), {
  placeholder: '搜索角色...',
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const options = ref<SelectOption[]>([])
const loading = ref(false)
const searchQuery = ref('')
const page = ref(1)
const pageSize = 20
const total = ref(0)
const hasMore = ref(true)

let timer: ReturnType<typeof setTimeout> | null = null

function formatRoleLabel(role: Role): string {
  return role.description ? `${role.name} - ${role.description}` : role.name
}

async function loadData(reset = false) {
  if (reset) {
    page.value = 1
    hasMore.value = true
    options.value = []
  }

  if (!hasMore.value || loading.value) return

  loading.value = true
  try {
    const res = await flowApi.searchRoles(searchQuery.value, page.value, pageSize)

    const newOptions: SelectOption[] = []
    for (const role of res.items) {
      newOptions.push({
        value: role.id,
        label: formatRoleLabel(role),
      })
    }

    if (reset) {
      options.value = newOptions
    } else {
      options.value = [...options.value, ...newOptions]
    }

    total.value = res.total
    hasMore.value = options.value.length < total.value
    page.value++
  } catch (error) {
    console.error('Failed to load roles:', error)
  } finally {
    loading.value = false
  }
}

function onSearch(q: string) {
  if (timer) clearTimeout(timer)
  searchQuery.value = q
  timer = setTimeout(() => loadData(true), 300)
}

function onVisibleChange(visible: boolean) {
  if (visible && options.value.length === 0) {
    loadData(true)
  }
}

function onScroll(event: Event) {
  const target = event.target as HTMLElement
  if (target.scrollTop + target.clientHeight >= target.scrollHeight - 10) {
    loadData()
  }
}

function onChange(val: string[]) {
  emit('update:modelValue', val)
}

onMounted(() => {
  // 初始化时不加载，等下拉框打开时再加载
})

watch(() => props.modelValue, async (val) => {
  // 确保选中的值在选项中存在
  if (val && val.length > 0) {
    const missingIds = val.filter(v => !options.value.find(o => o.value === v))
    if (missingIds.length > 0) {
      // 加载缺失的角色信息
      try {
        const roles = await Promise.all(
          missingIds.map(id => flowApi.getRoleById(id))
        )
        const newOptions: SelectOption[] = []
        for (const role of roles) {
          if (!options.value.find(o => o.value === role.id)) {
            newOptions.push({
              value: role.id,
              label: formatRoleLabel(role as Role),
            })
          }
        }
        if (newOptions.length > 0) {
          options.value = [...options.value, ...newOptions]
        }
      } catch {
        // 忽略错误
      }
    }
  }
}, { immediate: true })
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
    @visible-change="onVisibleChange"
  >
    <div :class="styles.optionList" @scroll="onScroll">
      <el-option
        v-for="item in options"
        :key="item.value"
        :label="item.label"
        :value="item.value"
      >
        <div :class="styles.optionItem">
          <el-tag type="warning" size="small" :class="styles.typeTag">
            角色
          </el-tag>
          <span :class="styles.optionLabel">{{ item.label }}</span>
        </div>
      </el-option>
      <div v-if="loading" :class="styles.loading">加载中...</div>
      <div v-if="!hasMore && options.length > 0" :class="styles.noMore">没有更多了</div>
      <div v-if="!loading && options.length === 0" :class="styles.empty">暂无数据</div>
    </div>
  </el-select>
</template>
