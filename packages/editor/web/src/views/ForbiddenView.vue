<script setup lang="ts">
import { useRouter } from 'vue-router'
import styles from './ForbiddenView.module.scss'

const router = useRouter()
</script>

<template>
  <div :class="styles.page">
    <div :class="styles.content">
      <h1 :class="styles.code">403</h1>
      <p :class="styles.message">抱歉，您没有权限访问此页面</p>
      <el-button type="primary" @click="router.push('/instances')">返回首页</el-button>
    </div>
  </div>
</template>
