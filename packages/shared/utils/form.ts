/**
 * 表单工具
 *
 * 适配 Element Plus FormInstance → TDesign FormInstanceFunctions
 * 提供统一的表单验证接口
 */

import { ref } from 'vue'
import type { FormInstanceFunctions, FormRules } from 'tdesign-vue-next'

export interface UseFormOptions {
  /** 初始值 */
  defaultValues?: Record<string, any>
  /** 验证规则 */
  rules?: FormRules
}

export function useForm(options: UseFormOptions = {}) {
  const formRef = ref<FormInstanceFunctions | null>(null)
  const formData = ref<Record<string, any>>(options.defaultValues || {})

  /**
   * 验证表单
   */
  const validate = async (): Promise<boolean> => {
    if (!formRef.value) return true

    try {
      const result = await formRef.value.validate()
      return result === true
    } catch {
      return false
    }
  }

  /**
   * 验证指定字段
   */
  const validateField = async (name: string): Promise<boolean> => {
    if (!formRef.value) return true

    try {
      await formRef.value.validate(name)
      return true
    } catch {
      return false
    }
  }

  /**
   * 重置表单
   */
  const reset = () => {
    formRef.value?.reset()
    if (options.defaultValues) {
      formData.value = { ...options.defaultValues }
    }
  }

  /**
   * 清除验证状态
   */
  const clearValidate = (name?: string) => {
    if (name) {
      formRef.value?.clearValidate(name)
    } else {
      formRef.value?.clearValidate()
    }
  }

  /**
   * 设置表单数据
   */
  const setFormData = (data: Record<string, any>) => {
    formData.value = { ...formData.value, ...data }
  }

  /**
   * 获取表单数据
   */
  const getFormData = (): Record<string, any> => {
    return { ...formData.value }
  }

  return {
    formRef,
    formData,
    validate,
    validateField,
    reset,
    clearValidate,
    setFormData,
    getFormData,
  }
}

/**
 * 快速创建表单验证规则
 */
export function createRules(rules: FormRules): FormRules {
  return rules
}

/**
 * 必填规则
 */
export function required(message: string, trigger: 'blur' | 'change' = 'blur') {
  return { required: true, message, trigger }
}

/**
 * 邮箱规则
 */
export function email(message = '请输入正确的邮箱地址') {
  return {
    type: 'email' as const,
    message,
    trigger: 'blur',
  }
}

/**
 * 手机号规则
 */
export function phone(message = '请输入正确的手机号') {
  return {
    pattern: /^1[3-9]\d{9}$/,
    message,
    trigger: 'blur',
  }
}

/**
 * 长度范围规则
 */
export function lengthRange(min: number, max: number, message?: string) {
  return {
    min,
    max,
    message: message || `长度在 ${min} 到 ${max} 个字符`,
    trigger: 'blur',
  }
}
