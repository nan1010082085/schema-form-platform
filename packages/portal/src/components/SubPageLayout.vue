<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'

defineProps<{
  title: string
}>()

const router = useRouter()
</script>

<template>
  <div :class="$style.layout">
    <header :class="$style.header">
      <el-button :icon="ArrowLeft" text :class="$style.backBtn" @click="router.push('/')">
        返回
      </el-button>
      <span :class="$style.title">{{ title }}</span>
    </header>
    <main :class="$style.content">
      <slot />
    </main>
  </div>
</template>

<style module>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-color-page);
}

.header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 24px;
  height: 52px;
  background: var(--bg-color-white);
  border-bottom: 1px solid var(--border-color-light);
  flex-shrink: 0;
}

.backBtn {
  font-size: 14px;
  color: var(--text-color-secondary);
}

.backBtn:hover {
  color: var(--color-primary);
}

.title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-color-primary);
}

.content {
  flex: 1;
  padding: 24px;
}
</style>
