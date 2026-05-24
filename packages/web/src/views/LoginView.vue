<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formRef = ref<FormInstance>()
const form = ref({ username: '', password: '' })

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  try {
    await authStore.login(form.value.username, form.value.password)
    const redirect = (route.query.redirect as string) || '/instances'
    router.push(redirect)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '登录失败'
    ElMessage.error(message)
  }
}
</script>

<template>
  <div :class="$style.page">
    <div :class="$style.card">
      <h1 :class="$style.title">Schema 表单平台</h1>
      <p :class="$style.subtitle">请登录以继续</p>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        :class="$style.form"
        @submit.prevent="handleSubmit"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入用户名"
            size="large"
            @keyup.enter="handleSubmit"
          />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            show-password
            @keyup.enter="handleSubmit"
          />
        </el-form-item>

        <el-button
          type="primary"
          size="large"
          :loading="authStore.loading"
          :class="$style.submitBtn"
          @click="handleSubmit"
        >
          登录
        </el-button>
      </el-form>
    </div>
  </div>
</template>

<style module>
.page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f0f2f5;
}

.card {
  width: 400px;
  padding: 40px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.title {
  margin: 0 0 4px;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  text-align: center;
}

.subtitle {
  margin: 0 0 32px;
  font-size: 14px;
  color: #909399;
  text-align: center;
}

.form {
  margin-top: 8px;
}

.submitBtn {
  width: 100%;
  margin-top: 8px;
}
</style>
