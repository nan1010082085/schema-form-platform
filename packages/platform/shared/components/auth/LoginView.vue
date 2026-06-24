<script setup lang="ts">
/**
 * LoginView -- 共享登录/注册/修改密码页面
 *
 * 所有子应用（admin、editor、flow、ai）在独立模式下复用此组件。
 * 支持三种模式：login、register、changePassword。
 *
 * Props:
 *   - title: 应用标题（默认 "Schema Form Platform"）
 *   - subtitle: 应用副标题（默认 "基础平台"）
 *   - onSuccess: 登录成功后的回调（用于自定义跳转）
 */
import { reactive, ref, computed } from 'vue'
import { useAuth } from '@schema-form/platform-shared/utils/useAuth'
import { apiClient } from '@schema-form/platform-shared/utils/apiClient'
import styles from './LoginView.module.scss'

interface Props {
  title?: string
  subtitle?: string
  onSuccess?: (redirect: string) => void
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Schema Form Platform',
  subtitle: '基础平台',
})

const { login, loading } = useAuth()

type ViewMode = 'login' | 'register' | 'changePassword'
const mode = ref<ViewMode>('login')

const form = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  oldPassword: '',
  nickname: '',
  phone: '',
})

const errorMsg = ref<string | null>(null)
const successMsg = ref<string | null>(null)

const title = computed(() => {
  switch (mode.value) {
    case 'register': return '注册账号'
    case 'changePassword': return '修改密码'
    default: return props.title
  }
})

const subtitle = computed(() => {
  switch (mode.value) {
    case 'register': return '创建新账号'
    case 'changePassword': return '修改登录密码'
    default: return props.subtitle
  }
})

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
    await login({ username: form.username, password: form.password }, props.onSuccess)
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : '登录失败'
  }
}

async function handleRegister(): Promise<void> {
  errorMsg.value = null
  successMsg.value = null
  if (!form.username.trim()) {
    errorMsg.value = '请输入用户名'
    return
  }
  if (!form.password) {
    errorMsg.value = '请输入密码'
    return
  }
  if (form.password.length < 8) {
    errorMsg.value = '密码至少 8 位'
    return
  }
  if (form.password !== form.confirmPassword) {
    errorMsg.value = '两次密码不一致'
    return
  }
  try {
    await apiClient.post('/auth/register', {
      username: form.username,
      password: form.password,
      nickname: form.nickname || undefined,
      phone: form.phone || undefined,
    })
    successMsg.value = '注册成功，请登录'
    mode.value = 'login'
    form.password = ''
    form.confirmPassword = ''
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : '注册失败'
  }
}

async function handleChangePassword(): Promise<void> {
  errorMsg.value = null
  successMsg.value = null
  if (!form.oldPassword) {
    errorMsg.value = '请输入旧密码'
    return
  }
  if (!form.password) {
    errorMsg.value = '请输入新密码'
    return
  }
  if (form.password.length < 8) {
    errorMsg.value = '新密码至少 8 位'
    return
  }
  if (form.password !== form.confirmPassword) {
    errorMsg.value = '两次密码不一致'
    return
  }
  try {
    await apiClient.post('/auth/change-password', {
      oldPassword: form.oldPassword,
      newPassword: form.password,
    })
    successMsg.value = '密码修改成功，请重新登录'
    mode.value = 'login'
    form.oldPassword = ''
    form.password = ''
    form.confirmPassword = ''
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : '修改失败'
  }
}

function handleSubmit(): Promise<void> {
  switch (mode.value) {
    case 'register': return handleRegister()
    case 'changePassword': return handleChangePassword()
    default: return handleLogin()
  }
}

function switchMode(newMode: ViewMode) {
  mode.value = newMode
  errorMsg.value = null
  successMsg.value = null
  form.password = ''
  form.confirmPassword = ''
  form.oldPassword = ''
}
</script>

<template>
  <div :class="styles['login-page']">
    <div :class="styles['login-card']">
      <div :class="styles['login-header']">
        <h1 :class="styles['login-logo']">{{ title }}</h1>
        <p :class="styles['login-subtitle']">{{ subtitle }}</p>
      </div>

      <div v-if="errorMsg" :class="styles['login-alert'] + ' ' + styles['login-alert-error']">
        {{ errorMsg }}
      </div>

      <div v-if="successMsg" :class="styles['login-alert'] + ' ' + styles['login-alert-success']">
        {{ successMsg }}
      </div>

      <div :class="styles['login-form']">
        <!-- 用户名（登录和注册都需要） -->
        <input
          v-if="mode !== 'changePassword'"
          v-model="form.username"
          type="text"
          placeholder="用户名"
          :class="styles['login-input']"
          @keyup.enter="handleSubmit"
        />

        <!-- 昵称（仅注册） -->
        <input
          v-if="mode === 'register'"
          v-model="form.nickname"
          type="text"
          placeholder="昵称（选填）"
          :class="styles['login-input']"
        />

        <!-- 手机号（仅注册） -->
        <input
          v-if="mode === 'register'"
          v-model="form.phone"
          type="text"
          placeholder="手机号（选填）"
          :class="styles['login-input']"
        />

        <!-- 旧密码（仅修改密码） -->
        <input
          v-if="mode === 'changePassword'"
          v-model="form.oldPassword"
          type="password"
          placeholder="当前密码"
          :class="styles['login-input']"
          @keyup.enter="handleSubmit"
        />

        <!-- 新密码 -->
        <input
          v-model="form.password"
          type="password"
          :placeholder="mode === 'changePassword' ? '新密码' : '密码'"
          :class="styles['login-input']"
          @keyup.enter="handleSubmit"
        />

        <!-- 确认密码（注册和修改密码） -->
        <input
          v-if="mode !== 'login'"
          v-model="form.confirmPassword"
          type="password"
          placeholder="确认密码"
          :class="styles['login-input']"
          @keyup.enter="handleSubmit"
        />

        <button
          :class="styles['login-button']"
          :disabled="loading.login"
          @click="handleSubmit"
        >
          {{ loading.login ? '处理中...' : (mode === 'register' ? '注册' : mode === 'changePassword' ? '修改密码' : '登录') }}
        </button>
      </div>

      <!-- 底部链接 -->
      <div :class="styles['login-links']">
        <template v-if="mode === 'login'">
          <a :class="styles['login-link']" @click="switchMode('register')">注册账号</a>
          <a :class="styles['login-link']" @click="switchMode('changePassword')">修改密码</a>
        </template>
        <template v-else>
          <a :class="styles['login-link']" @click="switchMode('login')">返回登录</a>
        </template>
      </div>
    </div>
  </div>
</template>

