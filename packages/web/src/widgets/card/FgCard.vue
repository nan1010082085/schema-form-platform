<script setup lang="ts">
/**
 * FgCard — 卡片容器 Widget
 *
 * 职责：
 * - el-card 包裹，提供卡片视觉容器
 * - 渲染标题和子组件
 */
import { inject } from 'vue'
import { widgetDataKey } from '../base/types'
import styles from './style.module.scss'

const widgetData = inject(widgetDataKey)!
</script>

<template>
  <el-card
    :class="styles.cardContainer"
    :shadow="(widgetData.props?.shadow as 'always' | 'hover' | 'never') || 'hover'"
  >
    <template v-if="widgetData.props?.showHeader !== false" #header>
      {{ (widgetData.props?.title as string) || '卡片标题' }}
    </template>
    <div :class="styles.body">
      <slot />
    </div>
  </el-card>
</template>
