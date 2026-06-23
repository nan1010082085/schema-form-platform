<script setup lang="ts">
import styles from './NotFoundView.module.scss'

const base = import.meta.env.BASE_URL
</script>

<template>
  <div :class="styles.container">
    <div :class="styles.content">
      <h1 :class="styles.code">404</h1>
      <p :class="styles.message">页面不存在</p>
      <a :href="`${base}list`" :class="styles.link">返回流程列表</a>
    </div>
  </div>
</template>
