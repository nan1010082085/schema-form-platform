<script setup lang="ts">
/**
 * LoginView -- login page
 *
 * Standalone layout (no sidebar).
 * Username/password form with validation, calls /api/auth/login.
 */
import { reactive, ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import styles from './LoginView.module.css'

const { login, loading } = useAuth()

const form = reactive({
  username: '',
  password: '',
})

const errorMsg = ref<string | null>(null)

async function handleLogin(): Promise<void> {
  errorMsg.value = null
  if (!form.username.trim()) {
    errorMsg.value = '请输入用户名'
    return
  }
  if (!form.password) {
    errorMsg.value = '请输入密码'
    return
  }
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
        <h1 :class="styles.logo">Schema Form</h1>
        <p :class="styles.subtitle">基础容器</p>
      </div>

      <t-alert
        v-if="errorMsg"
        :class="styles.errorAlert"
        :message="errorMsg"
        theme="error"
        :close="true"
      />

      <div :class="styles.form">
        <t-input
          v-model:value="form.username"
          placeholder="用户名"
          size="large"
          @enter="handleLogin"
        />

        <t-input
          v-model:value="form.password"
          type="password"
          placeholder="密码"
          size="large"
          @enter="handleLogin"
        />

        <t-button
          theme="primary"
          size="large"
          :loading="loading.login"
          @click="handleLogin"
        >
          登录
        </t-button>
      </div>
    </div>
  </div>
</template>
