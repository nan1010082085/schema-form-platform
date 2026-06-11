<script setup lang="ts">
/**
 * AuthCallbackView — SSO 回调处理页
 */
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { SSOClient } from '@schema-form/shared-utils/sso'
import { ElMessage } from 'element-plus'

const router = useRouter()

onMounted(async () => {
  try {
    const sso = new SSOClient({
      clientId: 'workflow',
      redirectUri: `${window.location.origin}/auth/callback`,
      ssoBaseUrl: window.location.origin,
    })
    await sso.handleCallback()
    ElMessage.success('登录成功')
    router.push('/')
  } catch (error) {
    ElMessage.error('登录失败：' + (error instanceof Error ? error.message : '未知错误'))
    router.push('/login')
  }
})
</script>

<template>
  <div class="auth-callback">
    <p>正在完成登录...</p>
  </div>
</template>

<style scoped>
.auth-callback {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 16px;
  color: var(--el-text-color-secondary);
}
</style>
