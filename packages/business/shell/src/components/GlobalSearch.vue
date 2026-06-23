<script setup lang="ts">
/**
 * GlobalSearch -- global search placeholder
 *
 * Placeholder component for global search functionality.
 */
import { ref } from 'vue'
import AppIcon from '@schema-form/platform-shared/components/common/AppIcon.vue'

const searchQuery = ref('')
const isExpanded = ref(false)

function toggleSearch(): void {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <div :class="$style.searchWrapper">
    <el-input
      v-if="isExpanded"
      v-model="searchQuery"
      placeholder="搜索..."
      :class="$style.searchInput"
      size="small"
      @blur="isExpanded = false"
    />
    <el-button
      v-else
      text
      size="small"
      @click="toggleSearch"
    >
      <AppIcon name="search" />
    </el-button>
  </div>
</template>

<style module>
.searchWrapper {
  display: flex;
  align-items: center;
}

.searchInput {
  width: 200px;
}
</style>
