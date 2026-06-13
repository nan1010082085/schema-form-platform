<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDownIcon, ChevronRightIcon } from 'tdesign-icons-vue-next'
import styles from './SectionToggle.module.scss'

const props = withDefaults(defineProps<{
  title: string
  count?: number
  defaultOpen?: boolean
}>(), {
  defaultOpen: true,
})

const isOpen = ref(props.defaultOpen)

function toggle() {
  isOpen.value = !isOpen.value
}
</script>

<template>
  <div :class="styles.section">
    <div :class="styles.header" @click="toggle">
      <ChevronDownIcon v-if="isOpen" :class="styles.arrow" :size="12" />
      <ChevronRightIcon v-else :class="styles.arrow" :size="12" />
      <span :class="styles.label">{{ title }}</span>
      <span v-if="count !== undefined" :class="styles.count">{{ count }}</span>
    </div>
    <div v-show="isOpen" :class="styles.body">
      <slot />
    </div>
  </div>
</template>
