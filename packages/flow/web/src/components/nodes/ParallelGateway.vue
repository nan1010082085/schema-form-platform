<template>
  <div :class="[$style.wrapper, { [$style.selected]: props.selected }]">
    <Handle type="target" :position="Position.Top" :class="$style.handle" />
    <div :class="$style.diamond">
      <span :class="$style.symbol">+</span>
    </div>
    <Handle type="source" :position="Position.Bottom" :class="$style.handle" />
    <Handle type="source" :position="Position.Left" :class="$style.handle" id="left" />
    <Handle type="source" :position="Position.Right" :class="$style.handle" id="right" />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

const props = defineProps<{
  id: string
  data?: { label?: string; [key: string]: unknown }
  selected?: boolean
}>()
</script>

<style module>
.wrapper {
  width: 40px;
  height: 40px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.selected {
  filter: drop-shadow(0 0 2px #3f51b5);
}

.diamond {
  width: 28px;
  height: 28px;
  background: #e8eaf6;
  border: 1.5px solid #3f51b5;
  transform: rotate(45deg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.symbol {
  transform: rotate(-45deg);
  font-size: 16px;
  font-weight: bold;
  color: #283593;
  pointer-events: none;
  user-select: none;
}

.handle {
  width: 8px;
  height: 8px;
  background: #fff;
  border: 1px solid #409eff;
}
</style>
