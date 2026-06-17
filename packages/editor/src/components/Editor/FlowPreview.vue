<script setup lang="ts">
/**
 * FlowPreview -- 事件/规则流程预览（垂直时间线）
 *
 * 只读组件，接收标准化的 FlowItem[] 渲染垂直时间线。
 * 每个 FlowItem 可包含子项，支持 trigger / condition / action 三种节点类型。
 */

export interface FlowItem {
  type: 'trigger' | 'condition' | 'action'
  label: string
  description?: string
  children?: FlowItem[]
}

import { ElTooltip } from 'element-plus'
import styles from './FlowPreview.module.scss'

defineProps<{
  items: FlowItem[]
}>()
</script>

<template>
  <div :class="styles.root">
    <div v-if="items.length === 0" :class="styles.empty">
      暂无配置
    </div>
    <div v-for="(item, idx) in items" :key="idx" :class="styles.timeline">
      <!-- 节点 -->
      <div :class="[styles.node, styles[item.type]]">
        <div :class="styles.dot" />
        <div v-if="idx < items.length - 1" :class="styles.line" />
      </div>
      <!-- 内容 -->
      <div :class="styles.content">
        <ElTooltip :content="item.label" placement="top" :show-after="300">
          <div :class="styles.label">{{ item.label }}</div>
        </ElTooltip>
        <ElTooltip v-if="item.description" :content="item.description" placement="top" :show-after="300">
          <div :class="styles.desc">{{ item.description }}</div>
        </ElTooltip>
        <!-- 子节点 -->
        <div v-if="item.children?.length" :class="styles.children">
          <div v-for="(child, ci) in item.children" :key="ci" :class="styles.childRow">
            <span :class="styles.childIcon">{{ child.type === 'condition' ? '◇' : '○' }}</span>
            <ElTooltip :content="child.label" placement="top" :show-after="300">
              <span :class="styles.childLabel">{{ child.label }}</span>
            </ElTooltip>
            <ElTooltip v-if="child.description" :content="child.description" placement="top" :show-after="300">
              <span :class="styles.childDesc">{{ child.description }}</span>
            </ElTooltip>
            <!-- 三级子节点 -->
            <div v-if="child.children?.length" :class="styles.grandChildren">
              <div v-for="(gc, gi) in child.children" :key="gi" :class="styles.gcRow">
                <span :class="styles.gcIcon">○</span>
                <ElTooltip :content="gc.label" placement="top" :show-after="300">
                  <span :class="styles.gcLabel">{{ gc.label }}</span>
                </ElTooltip>
                <ElTooltip v-if="gc.description" :content="gc.description" placement="top" :show-after="300">
                  <span :class="styles.gcDesc">{{ gc.description }}</span>
                </ElTooltip>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
