<script setup lang="ts">
import { useRouter } from 'vue-router'
import styles from './NotFoundView.module.scss'

const router = useRouter()
</script>

<template>
  <div :class="styles.page">
    <div :class="styles.content">
      <h1 :class="styles.code">404</h1>
      <p :class="styles.message">页面不存在</p>
      <t-button theme="primary" @click="router.push('/instances')">返回首页</t-button>
    </div>
  </div>
</template>
