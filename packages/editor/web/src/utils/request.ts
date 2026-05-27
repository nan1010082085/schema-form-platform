/**
 * Axios 请求实例
 * 支持独立运行和 qiankun 子应用模式
 */
import axios, { type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import { useLogger } from '@/composables/useLogger'

const logger = useLogger('Request')

let instance: AxiosInstance | null = null
let tokenGetter: (() => string) | null = null

/** 创建请求实例 */
export function createRequestInstance(config: {
  baseUrl?: string
  token?: string
  headers?: Record<string, string>
} = {}) {
  instance = axios.create({
    baseURL: config.baseUrl ?? '',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      ...config.headers
    }
  })

  // 请求拦截器
  instance.interceptors.request.use((req: InternalAxiosRequestConfig) => {
    const token = tokenGetter?.() ?? config.token ?? ''
    if (token) {
      req.headers.Authorization = `Bearer ${token}`
    }
    return req
  })

  // 响应拦截器
  instance.interceptors.response.use(
    (res) => res.data,
    (err) => {
      const msg = err.response?.data?.message ?? err.message ?? '请求失败'
      logger.api(msg)
      return Promise.reject(err)
    }
  )

  return instance
}

/** 获取请求实例（未初始化时返回裸实例） */
export function getRequestInstance(): AxiosInstance {
  if (!instance) {
    instance = axios.create({ timeout: 30000 })
    instance.interceptors.response.use((res) => res.data)
  }
  return instance
}

/** 注册 token 读取函数 */
export function setTokenGetter(fn: () => string) {
  tokenGetter = fn
}

/** 发起请求的便捷方法 */
export async function request<T = any>(config: AxiosRequestConfig): Promise<T> {
  return getRequestInstance()(config) as Promise<T>
}
