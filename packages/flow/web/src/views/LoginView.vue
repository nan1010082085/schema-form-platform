<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const username = ref('')
const password = ref('')
const loading = ref(false)

async function handleLogin() {
  loading.value = true
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value, password: password.value }),
    })
    const data = await res.json()
    if (data.success) {
      localStorage.setItem('token', data.data.token)
      router.push('/list')
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <h1>流程引擎</h1>
      <p>登录以继续</p>
      <form @submit.prevent="handleLogin">
        <input v-model="username" type="text" placeholder="用户名" required />
        <input v-model="password" type="password" placeholder="密码" required />
        <button type="submit" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-container { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f0f2f5; }
.login-card { background: #fff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); width: 360px; text-align: center; }
.login-card h1 { font-size: 1.5rem; margin-bottom: 8px; }
.login-card p { color: #666; margin-bottom: 24px; }
.login-card input { width: 100%; padding: 10px 12px; border: 1px solid #dcdfe6; border-radius: 6px; margin-bottom: 12px; font-size: 14px; }
.login-card button { width: 100%; padding: 10px; background: #409eff; color: #fff; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; }
.login-card button:disabled { opacity: 0.6; }
</style>
