<template>
  <div :class="$style.callback">
    <LoadingIcon :class="$style.spinner" size="32" />
    <p :class="$style.text">正在完成登录...</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { LoadingIcon } from 'tdesign-icons-vue-next'
import { SSOClient } from '@schema-form/shared-utils/sso'

const router = useRouter()
const route = useRoute()

const TOKEN_KEY = 'sfp_access_token'
const REFRESH_TOKEN_KEY = 'sfp_refresh_token'

onMounted(async () => {
  const origin = window.location.origin
  const client = new SSOClient({
    clientId: 'ai',
    redirectUri: `${origin}/schema-platform/ai/auth/callback`,
    ssoBaseUrl: origin,
  })

  try {
    const tokens = await client.handleCallback()
    localStorage.setItem(TOKEN_KEY, tokens.accessToken)
    if (tokens.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
    }

    const redirect = route.query.redirect as string | undefined
    await router.replace(redirect || '/')
  } catch {
    await router.replace({ name: 'chat' })
  }
})
</script>

<style module>
.callback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 16px;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.text {
  color: var(--td-text-color-secondary);
  font-size: 14px;
}
</style>
