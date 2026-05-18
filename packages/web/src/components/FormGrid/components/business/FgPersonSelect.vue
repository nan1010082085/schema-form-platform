<script setup lang="ts">
/**
 * FgPersonSelect — 人员选择组件
 * 左侧部门树 + 右侧待选/已选面板
 */

interface PersonItem {
  id: string | number
  name: string
  deptId?: string | number
  deptName?: string
  [key: string]: any
}

interface TreeNode {
  id: string | number
  label: string
  children?: TreeNode[]
  isLeaf?: boolean
}



withDefaults(defineProps<{
  modelValue?: PersonItem[]
  treeData?: TreeNode[]
  personList?: PersonItem[]
  multiple?: boolean
  title?: string
}>(), {
  modelValue: () => [],
  personList: () => [],
})

/** Fall back to mock person list when no data provided */

/** Fall back to mock department tree when no data provided */

const emit = defineEmits<{
  'update:modelValue': [value: PersonItem[]]
  'confirm': [selected: PersonItem[]]
  'treeNodeClick': [node: TreeNode]
}>()

function handleRemove(person: PersonItem, selected: PersonItem[]) {
  const idx = selected.findIndex((p) => p.id === person.id)
  if (idx > -1) {
    const newVal = [...selected]
    newVal.splice(idx, 1)
    emit('update:modelValue', newVal)
  }
}

function handleSelect(person: PersonItem, selected: PersonItem[], multiple: boolean) {
  if (multiple) {
    const exists = selected.some((p) => p.id === person.id)
    if (!exists) {
      emit('update:modelValue', [...selected, person])
    }
  } else {
    emit('update:modelValue', [person])
  }
}
</script>

<template>
  <div class="fg-person-select">
    <!-- 左侧树 -->
    <div class="fg-person-select__tree">
      <el-input placeholder="搜索部门" size="small" clearable />
      <el-tree
        :data="treeData"
        :props="{ children: 'children', label: 'label' }"
        default-expand-all
        highlight-current
        @node-click="emit('treeNodeClick', $event as any)"
      />
    </div>

    <!-- 右侧选择面板 -->
    <div class="fg-person-select__panel">
      <!-- 待选 -->
      <div class="fg-person-select__list">
        <div class="fg-person-select__header">待选人员</div>
        <div class="fg-person-select__body">
          <div
            v-for="p in personList"
            :key="p.id"
            class="fg-person-select__item"
            @click="handleSelect(p, modelValue, multiple ?? true)"
          >
            {{ p.name }}
            <span v-if="p.deptName" class="fg-person-select__dept">({{ p.deptName }})</span>
          </div>
          <el-empty v-if="!personList?.length" description="暂无人员" :image-size="48" />
        </div>
      </div>

      <!-- 已选 -->
      <div class="fg-person-select__list">
        <div class="fg-person-select__header">已选人员</div>
        <div class="fg-person-select__body">
          <el-tag
            v-for="p in modelValue"
            :key="p.id"
            closable
            class="fg-person-select__tag"
            @close="handleRemove(p, modelValue)"
          >
            {{ p.name }}
          </el-tag>
          <span v-if="!modelValue?.length" class="fg-person-select__empty">未选择</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.fg-person-select {
  display: flex;
  height: 423px;
  border: 1px solid #d7d7d7;
  border-radius: 10px;
  overflow: hidden;

  &__tree {
    width: 280px;
    border-right: 1px solid #d7d7d7;
    background: #fafafa;
    padding: 10px;
    overflow-y: auto;
  }

  &__panel {
    flex: 1;
    display: flex;
  }

  &__list {
    flex: 1;
    display: flex;
    flex-direction: column;
    border-right: 1px solid #eee;

    &:last-child {
      border-right: none;
    }
  }

  &__header {
    padding: 10px 12px;
    font-weight: 500;
    font-size: 14px;
    border-bottom: 1px solid #eee;
    background: #fafafa;
  }

  &__body {
    flex: 1;
    padding: 8px;
    overflow-y: auto;
  }

  &__item {
    padding: 6px 8px;
    cursor: pointer;
    border-radius: 4px;
    font-size: 14px;

    &:hover {
      background: #eef5ff;
    }
  }

  &__dept {
    color: #999;
    font-size: 12px;
    margin-left: 4px;
  }

  &__tag {
    margin: 2px 4px 2px 0;
  }

  &__empty {
    color: #999;
    font-size: 14px;
  }
}
</style>
