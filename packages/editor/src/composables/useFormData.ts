/**
 * 表单数据管理 composable
 *
 * 从 FormGrid/index.vue 中抽取的 formData 核心逻辑：
 * - 初始化（从 schema 递归提取默认值）
 * - getFormData / setFormData
 * - resetFields / validate
 *
 * 设计要点：
 * 1. reactive formData 作为单一数据源
 * 2. 初始化逻辑递归遍历 schema 树（含 children）
 * 3. validate / resetFields 依赖外部传入的 FormInstance ref
 */
import { reactive, type Ref } from 'vue'
import type { FormInstance } from 'element-plus'
import type { PartialWidget, FormData } from '@/components/WidgetRenderer/types'

export interface UseFormDataReturn {
  /** 响应式表单数据对象 */
  formData: FormData
  /** 获取表单数据副本 */
  getFormData: () => FormData
  /** 合并设置表单数据 */
  setFormData: (data: FormData) => void
  /** 重置表单字段 */
  resetFields: () => void
  /** 校验整个表单 */
  validate: () => Promise<boolean>
  /** 从 schema 初始化默认值 */
  initFormData: (schema: PartialWidget[]) => void
}

/**
 * 递归遍历 schema 树，提取默认值并初始化 formData
 */
function applyDefaults(schema: PartialWidget[], formData: FormData): void {
  for (const item of schema) {
    if (item.field && item.defaultValue !== undefined) {
      formData[item.field] = item.defaultValue
    } else if (item.field && !(item.field in formData)) {
      switch (item.type) {
        case 'checkbox':
          formData[item.field] = []
          break
        case 'number':
          formData[item.field] = undefined
          break
        default:
          formData[item.field] = undefined
      }
    }
    if (item.children) {
      applyDefaults(item.children, formData)
    }
  }
}

/**
 * useFormData — 表单数据管理
 *
 * @param formRef - el-form 实例 ref，用于 validate / resetFields
 * @returns formData 及操作方法
 */
export function useFormData(formRef: Ref<FormInstance | undefined>): UseFormDataReturn {
  const formData = reactive<FormData>({})

  /** 从 schema 初始化默认值 */
  function initFormData(schema: PartialWidget[]) {
    applyDefaults(schema, formData)
  }

  /** 获取表单数据（浅拷贝） */
  function getFormData(): FormData {
    return { ...formData }
  }

  /** 设置表单数据（合并到现有数据） */
  function setFormData(data: FormData) {
    Object.assign(formData, data)
  }

  /** 重置表单字段 */
  function resetFields() {
    formRef.value?.resetFields()
  }

  /** 校验整个表单 */
  async function validate(): Promise<boolean> {
    return await formRef.value!.validate()
  }

  return {
    formData,
    getFormData,
    setFormData,
    resetFields,
    validate,
    initFormData,
  }
}
