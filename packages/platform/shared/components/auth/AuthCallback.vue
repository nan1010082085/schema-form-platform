<template>
  <div :class="$style.root">
    <div :class="$style.spinner">
      <AppIcon name="loading" :size="48" />
    </div>
    <p :class="$style.text">{{ statusText }}</p>
  </div>
</template>

<script setup lang="ts">
/**
 * AuthCallback -- SSO 授权回调处理页
 *
 * 从 URL query 中提取 authorization code，
 * 调用 SSOClient.handleCallback() 换取 token，
 * 成功后重定向到首页（或 state 中指定的路径）。
 */
import { ref, onMounted } from 'vue'
import { SSOClient, SSOError } from '../../utils/sso.js'
import { useAuthStore } from '../../utils/stores/authStore.js'
import AppIcon from '@schema-form/platform-shared/components/common/AppIcon.vue'

const props = defineProps<{
  /** SSO 客户端实例 */
  ssoClient: SSOClient
  /** 成功后的重定向路径，默认 '/' */
  redirectPath?: string
}>()

const authStore = useAuthStore()
const statusText = ref('正在处理登录...')

onMounted(async () => {
  try {
    const tokens = await props.ssoClient.handleCallback()
    authStore.setTokens(tokens.accessToken, tokens.refreshToken)

    // 从 state 参数中读取原始重定向路径（login 时写入的）
    const params = new URLSearchParams(window.location.search)
    const state = params.get('state')
    const target = state || props.redirectPath || '/'

    statusText = ref('登录成功，正在跳转...')
    window.location.href = target
  } catch (err) {
    if (err instanceof SSOError) {
      statusText.value = `登录失败：${err.message}`
    } else {
      statusText.value = '登录失败，请重试'
    }
  }
})
</script>

<style module>
.root {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 16px;
}

.spinner {
  animation: spin 1s linear infinite;
  color: var(--color-primary, #409eff);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.text {
  font-size: 16px;
  color: var(--text-color-secondary, #606266);
  margin: 0;
}
</style>
