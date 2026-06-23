<script setup lang="ts">
/**
 * StandaloneEntry — entry 模式容器
 *
 * 通过 URL 参数直接加载微应用 entry 地址（iframe）。
 * 适用于未注册的微应用或外部系统嵌入。
 *
 * 用法：/standalone?entry=http://localhost:5100/schema-platform/editor/
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const entryUrl = computed(() => (route.query.entry as string) || '')
</script>

<template>
  <div v-if="entryUrl" :class="$style.container">
    <iframe
      :src="entryUrl"
      :class="$style.iframe"
      frameborder="0"
    />
  </div>

  <div v-else :class="$style.error">
    <p>缺少 entry 参数</p>
    <p :class="$style.hint">用法：/standalone?entry=微应用地址</p>
  </div>
</template>

<style module>
.container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.error {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-color-secondary);
}

.hint {
  font-size: 13px;
  margin-top: 8px;
  opacity: 0.7;
}
</style>
