<script setup lang="ts">
/**
 * GlobalSearch -- global search placeholder
 *
 * Placeholder component for global search functionality.
 */
import { ref } from 'vue'

const searchQuery = ref('')
const isExpanded = ref(false)

function toggleSearch(): void {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <div :class="$style.searchWrapper">
    <t-input
      v-if="isExpanded"
      v-model:value="searchQuery"
      placeholder="Search..."
      :class="$style.searchInput"
      size="small"
      @blur="isExpanded = false"
    />
    <t-button
      v-else
      variant="text"
      shape="square"
      size="small"
      @click="toggleSearch"
    >
      <t-icon name="search" />
    </t-button>
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
