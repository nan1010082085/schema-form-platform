<script setup lang="ts">
defineProps<{
  /** dot size in px */
  size?: number
}>()
</script>

<template>
  <span :class="$style.dots">
    <span :class="$style.dot" :style="size ? { width: size + 'px', height: size + 'px' } : undefined" />
    <span :class="$style.dot" :style="size ? { width: size + 'px', height: size + 'px' } : undefined" />
    <span :class="$style.dot" :style="size ? { width: size + 'px', height: size + 'px' } : undefined" />
  </span>
</template>

<style module src="./AiLoadingDots.module.scss" />
