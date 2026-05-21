<script setup lang="ts">
import { inject } from 'vue'
import { widgetDataKey } from '../base/types'
const widgetData = inject(widgetDataKey)!
</script>
<template>
  <el-transfer
    :data="[]"
    :titles="(widgetData.props?.titles as string[]) || ['待选', '已选']"
    :filterable="widgetData.props?.filterable !== false"
  />
</template>
