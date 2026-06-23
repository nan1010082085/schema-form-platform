<script setup lang="ts">
import { inject } from 'vue'
import { widgetDataKey } from '../base/types'
import styles from './style.module.scss'
const widgetData = inject(widgetDataKey)!
</script>
<template>
  <div :class="styles.container">
    <div :class="styles.header">{{ (widgetData.props?.title as string) || '树形布局' }}</div>
    <el-input v-if="widgetData.props?.showSearch" placeholder="搜索" size="small" :class="styles.search" />
    <div :class="styles.body">树形内容区域</div>
  </div>
</template>