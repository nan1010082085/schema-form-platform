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
    errorMsg.value = 'Username is required'
    return
  }
  if (!form.password) {
    errorMsg.value = 'Password is required'
    return
  }
  try {
    await login({ username: form.username, password: form.password })
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : 'Login failed'
  }
}
</script>

<template>
  <div :class="styles.page">
    <div :class="styles.card">
      <div :class="styles.header">
        <h1 :class="styles.logo">Schema Form</h1>
        <p :class="styles.subtitle">Shell Base Container</p>
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
          placeholder="Username"
          size="large"
          @keyup.enter="handleLogin"
        />

        <el-input
          v-model="form.password"
          type="password"
          placeholder="Password"
          size="large"
          show-password
          @keyup.enter="handleLogin"
        />

        <el-button
          type="primary"
          size="large"
          :loading="loading.login"
          @click="handleLogin"
        >
          Sign In
        </el-button>
      </div>
    </div>
  </div>
</template>
