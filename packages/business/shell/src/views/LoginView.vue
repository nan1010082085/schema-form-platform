<script setup lang="ts">
/**
 * LoginView -- login / register / change password page
 *
 * Standalone layout (no sidebar).
 * Supports three modes: login, register, changePassword.
 */
import { reactive, ref, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { apiClient } from '@schema-form/platform-shared/utils/apiClient'
import styles from './LoginView.module.scss'

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
    default: return '表单设计器'
  }
})

const subtitle = computed(() => {
  switch (mode.value) {
    case 'register': return '创建新账号'
    case 'changePassword': return '修改登录密码'
    default: return '基础容器'
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
    await login({ username: form.username, password: form.password })
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
  <div :class="styles.page">
    <div :class="styles.card">
      <div :class="styles.header">
        <h1 :class="styles.logo">{{ title }}</h1>
        <p :class="styles.subtitle">{{ subtitle }}</p>
      </div>

      <el-alert
        v-if="errorMsg"
        :class="styles.errorAlert"
        :title="errorMsg"
        type="error"
        show-icon
        :closable="true"
      />

      <el-alert
        v-if="successMsg"
        :class="styles.errorAlert"
        :title="successMsg"
        type="success"
        show-icon
        :closable="true"
      />

      <div :class="styles.form">
        <!-- 用户名（登录和注册都需要） -->
        <el-input
          v-if="mode !== 'changePassword'"
          v-model="form.username"
          placeholder="用户名"
          size="large"
          @keyup.enter="handleSubmit"
        />

        <!-- 昵称（仅注册） -->
        <el-input
          v-if="mode === 'register'"
          v-model="form.nickname"
          placeholder="昵称（选填）"
          size="large"
        />

        <!-- 手机号（仅注册） -->
        <el-input
          v-if="mode === 'register'"
          v-model="form.phone"
          placeholder="手机号（选填）"
          size="large"
        />

        <!-- 旧密码（仅修改密码） -->
        <el-input
          v-if="mode === 'changePassword'"
          v-model="form.oldPassword"
          show-password
          placeholder="当前密码"
          size="large"
          @keyup.enter="handleSubmit"
        />

        <!-- 新密码 -->
        <el-input
          v-model="form.password"
          show-password
          :placeholder="mode === 'changePassword' ? '新密码' : '密码'"
          size="large"
          @keyup.enter="handleSubmit"
        />

        <!-- 确认密码（注册和修改密码） -->
        <el-input
          v-if="mode !== 'login'"
          v-model="form.confirmPassword"
          show-password
          placeholder="确认密码"
          size="large"
          @keyup.enter="handleSubmit"
        />

        <el-button
          type="primary"
          size="large"
          :loading="loading.login"
          @click="handleSubmit"
        >
          {{ mode === 'register' ? '注册' : mode === 'changePassword' ? '修改密码' : '登录' }}
        </el-button>
      </div>

      <!-- 底部链接 -->
      <div :class="styles.links">
        <template v-if="mode === 'login'">
          <el-link type="primary" @click="switchMode('register')">注册账号</el-link>
          <el-link type="primary" @click="switchMode('changePassword')">修改密码</el-link>
        </template>
        <template v-else>
          <el-link type="primary" @click="switchMode('login')">返回登录</el-link>
        </template>
      </div>
    </div>
  </div>
</template>
