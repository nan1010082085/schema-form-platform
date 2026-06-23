<script setup lang="ts">
import styles from './HintText.module.scss'

withDefaults(defineProps<{
  indent?: boolean
}>(), {
  indent: true,
})
</script>

<template>
  <div :class="[styles.hint, indent && styles.indented]">
    <slot />
  </div>
</template>
