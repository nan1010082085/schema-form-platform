<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div :class="$style.page">
    <div :class="$style.content">
      <h1 :class="$style.code">404</h1>
      <p :class="$style.message">页面不存在</p>
      <el-button type="primary" @click="router.push('/instances')">返回首页</el-button>
    </div>
  </div>
</template>

<style module>
.page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #f0f2f5;
}

.content {
  text-align: center;
}

.code {
  font-size: 72px;
  font-weight: 700;
  color: #dcdfe6;
  margin: 0 0 8px;
}

.message {
  font-size: 16px;
  color: #909399;
  margin: 0 0 24px;
}
</style>
