/**
 * useForm - 公共表单管理
 */
import { ref, reactive } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'

export function useForm<T extends Record<string, unknown>>(
  defaultValues: T,
  rules?: FormRules
) {
  const formRef = ref<FormInstance>()
  const formData = reactive<T>({ ...defaultValues })
  const loading = ref(false)

  function resetForm() {
    Object.assign(formData, { ...defaultValues })
    formRef.value?.clearValidate()
  }

  async function validate(): Promise<boolean> {
    if (!formRef.value) return true
    try {
      await formRef.value.validate()
      return true
    } catch {
      return false
    }
  }

  function setLoading(value: boolean) {
    loading.value = value
  }

  return {
    formRef,
    formData,
    loading,
    rules,
    resetForm,
    validate,
    setLoading,
  }
}
