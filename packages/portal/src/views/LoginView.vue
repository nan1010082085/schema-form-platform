<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import styles from './LoginView.module.css'

const { login, loading } = useAuth()

const form = reactive({
  username: '',
  password: '',
  remember: false,
})

const errorMsg = ref<string | null>(null)

async function handleLogin(): Promise<void> {
  errorMsg.value = null
  try {
    await login({ username: form.username, password: form.password })
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : '登录失败'
  }
}
</script>

<template>
  <div :class="styles.page">
    <div :class="styles.card">
      <div :class="styles.header">
        <h1 :class="styles.logo">PyFlow</h1>
        <p :class="styles.subtitle">Schema 驱动的可视化表单平台</p>
      </div>

      <el-alert
        v-if="errorMsg"
        :class="styles.errorAlert"
        :title="errorMsg"
        type="error"
        show-icon
        :closable="false"
      />

      <div :class="styles.form">
        <el-input
          v-model="form.username"
          placeholder="请输入用户名"
          size="large"
          @keyup.enter="handleLogin"
        />

        <el-input
          v-model="form.password"
          type="password"
          placeholder="请输入密码"
          size="large"
          show-password
          @keyup.enter="handleLogin"
        />

        <div :class="styles.rememberRow">
          <el-checkbox v-model="form.remember">记住我</el-checkbox>
        </div>

        <el-button
          type="primary"
          size="large"
          :loading="loading.login"
          @click="handleLogin"
        >
          登 录
        </el-button>
      </div>
    </div>
  </div>
</template>
