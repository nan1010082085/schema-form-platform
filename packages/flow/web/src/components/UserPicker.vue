<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { flowApi } from '../api/flowApi.js'
import styles from './UserPicker.module.scss'

interface User {
  id: string
  username: string
  displayName: string
  roles: string[]
}

interface Role {
  id: string
  name: string
  description?: string
}

interface SelectOption {
  value: string
  label: string
  type: 'user' | 'role'
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  modelValue?: string[]
  placeholder?: string
  /** 只显示用户，不显示角色 */
  usersOnly?: boolean
}>(), {
  placeholder: '搜索用户或角色...',
  usersOnly: false,
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

function formatUserLabel(user: User): string {
  return `${user.displayName} (${user.username})`
}

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
    const promises: Promise<{ items: Array<{ id: string; username?: string; displayName?: string; name?: string; description?: string; roles?: string[] }>; total: number }>[] = [
      flowApi.searchUsers(searchQuery.value, page.value, pageSize),
    ]

    // 只在非 usersOnly 模式下加载角色
    if (!props.usersOnly) {
      promises.push(flowApi.searchRoles(searchQuery.value, page.value, pageSize))
    }

    const results = await Promise.all(promises)
    const usersRes = results[0]
    const rolesRes = results[1]

    const newOptions: SelectOption[] = []

    // 添加用户选项
    for (const user of usersRes.items) {
      newOptions.push({
        value: user.id,
        label: formatUserLabel(user as User),
        type: 'user',
      })
    }

    // 添加角色选项（仅在非 usersOnly 模式下）
    if (rolesRes) {
      for (const role of rolesRes.items) {
        newOptions.push({
          value: role.id,
          label: formatRoleLabel(role as Role),
          type: 'role',
        })
      }
    }

    if (reset) {
      options.value = newOptions
    } else {
      options.value = [...options.value, ...newOptions]
    }

    total.value = usersRes.total + (rolesRes?.total ?? 0)
    hasMore.value = options.value.length < total.value
    page.value++
  } catch (error) {
    console.error('Failed to load data:', error)
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
      // 加载缺失的用户信息
      try {
        const users = await Promise.all(
          missingIds.map(id => flowApi.getUserById(id))
        )
        const newOptions: SelectOption[] = []
        for (const user of users) {
          if (!options.value.find(o => o.value === user.id)) {
            newOptions.push({
              value: user.id,
              label: formatUserLabel(user as User),
              type: 'user',
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
    :loading="loading"
    @change="onChange"
    @remote-method="onSearch"
    @visible-change="onVisibleChange"
  >
    <el-option
      v-for="item in options"
      :key="item.value"
      :label="item.label"
      :value="item.value"
    >
      <div :class="styles.optionItem">
        <el-tag
          :type="item.type === 'user' ? 'default' : 'warning'"
          size="small"
          :class="styles.typeTag"
        >
          {{ item.type === 'user' ? '用户' : '角色' }}
        </el-tag>
        <span :class="styles.optionLabel">{{ item.label }}</span>
      </div>
    </el-option>
    <template #dropdown>
      <div v-if="loading" :class="styles.loading">加载中...</div>
      <div v-if="!hasMore && options.length > 0" :class="styles.noMore">没有更多了</div>
      <div v-if="!loading && options.length === 0" :class="styles.empty">暂无数据</div>
    </template>
  </el-select>
</template>
