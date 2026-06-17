<script setup lang="ts">
import { ref } from 'vue'
import styles from './SectionToggle.module.scss'
import AppIcon from '@schema-form/shared-components/common/AppIcon.vue'

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
      <AppIcon name="arrow-down" v-if="isOpen" :class="styles.arrow" :size="12" />
      <AppIcon name="arrow-right" v-else :class="styles.arrow" :size="12" />
      <span :class="styles.label">{{ title }}</span>
      <span v-if="count !== undefined" :class="styles.count">{{ count }}</span>
    </div>
    <div v-show="isOpen" :class="styles.body">
      <slot />
    </div>
  </div>
</template>
