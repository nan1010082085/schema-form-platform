<script setup lang="ts">
/**
 * SSOCallbackView -- SSO 授权码回调页面
 *
 * 流程：
 * 1. 外部应用 → /api/auth/sso/authorize → 用户授权
 * 2. 服务器重定向到 /sso/callback?code=xxx
 * 3. 本页面用 code 换取 token → 完成登录
 */
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { Loading, CircleCloseFilled } from '@element-plus/icons-vue'

const route = useRoute()
const { ssoLogin } = useAuth()

const error = ref<string | null>(null)
const loading = ref(true)

onMounted(async () => {
  const code = route.query.code as string | undefined

  if (!code) {
    error.value = '缺少授权码（code 参数）'
    loading.value = false
    return
  }

  try {
    await ssoLogin(code)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'SSO 登录失败'
    loading.value = false
  }
})
</script>

<template>
  <div :class="$style.container">
    <div v-if="loading" :class="$style.card">
      <el-icon :class="$style.spin" :size="32"><Loading /></el-icon>
      <p :class="$style.text">正在完成登录...</p>
    </div>

    <div v-else-if="error" :class="$style.card">
      <el-icon :size="32" color="#f56c6c"><CircleCloseFilled /></el-icon>
      <p :class="$style.text">{{ error }}</p>
      <el-button type="primary" @click="$router.push('/login')">返回登录</el-button>
    </div>
  </div>
</template>

<style module>
.container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: var(--bg-color-page);
}

.card {
  text-align: center;
  padding: 40px;
  background: var(--bg-color-white);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.text {
  margin: 16px 0;
  font-size: 16px;
  color: var(--text-color-primary);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
