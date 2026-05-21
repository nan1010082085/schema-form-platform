/**
 * Microapp 独立入口
 *
 * 将 schema-form 渲染引擎打包为独立 JS 文件，通过 <script> 标签加载到宿主页面。
 * 加载后调用 loadMicroapp() 即可在指定容器中渲染已发布的表单。
 *
 * 使用方式：
 *
 * ```html
 * <!-- 宿主页面 -->
 * <div id="my-form"></div>
 * <script src="https://cdn.example.com/schema-form-microapp.umd.js"></script>
 * <script>
 *   SchemaFormMicroapp.loadMicroapp({
 *     publishId: 'your-publish-id',
 *     container: '#my-form',
 *     baseUrl: 'https://schema-form-platform.vercel.app/api',
 *   }).then(api => {
 *     // api.getValues()  — 获取表单数据
 *     // api.setValues()  — 设置表单数据
 *     // api.validate()   — 校验表单
 *     // api.submit()     — 提交表单
 *     // api.destroy()    — 销毁实例
 *   })
 * </script>
 * ```
 *
 * postMessage 通信（iframe 嵌入场景）：
 * 加载完成后自动向 parent window 发送 'ready' 事件。
 * 宿主可通过 createMicroappHost(iframe) 发送命令、监听事件。
 */

import { createApp, h, type App as VueApp } from 'vue'
import { createPinia, type Pinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

import { configureApiClient, fetchPublishedSchema, ApiError } from '@/utils/apiClient'
import { useBoardStore } from '@/stores/board'
import { useWidgetStore } from '@/stores/widget'
import SchemaRender from '@/components/FormGrid/SchemaRender.vue'
import type { Widget, FormFieldValue } from '@/widgets/base/types'
import { initMicroappGuest, emitToHost } from './postMessage'

// ============================================================
// 类型定义
// ============================================================

/** Microapp 配置 */
export interface MicroappConfig {
  /** 已发布的 Schema publishId */
  publishId: string
  /** 渲染容器 — DOM 元素或 CSS 选择器 */
  container: HTMLElement | string
  /** API 基础 URL，默认使用 apiClient 已配置的值 */
  baseUrl?: string
  /** 认证 token */
  token?: string
}

/** Microapp 对外 API */
export interface MicroappApi {
  /** 获取当前表单所有字段值 */
  getValues(): Record<string, unknown>
  /** 设置表单字段值（合并覆盖） */
  setValues(values: Record<string, unknown>): void
  /** 校验表单，返回是否通过 */
  validate(): Promise<boolean>
  /** 提交表单（校验 + 触发 submit 事件） */
  submit(): Promise<void>
  /** 销毁 microapp 实例，清理 DOM 和事件 */
  destroy(): void
}

// ============================================================
// 内部状态
// ============================================================

let app: VueApp | null = null
let pinia: Pinia | null = null
let hostContainer: HTMLElement | null = null

// ============================================================
// Schema 转 Widget
// ============================================================

/**
 * 将 FormSchemaItem[] 转换为 Widget[]。
 *
 * FormSchemaItem 是后端存储格式，Widget 是前端渲染格式。
 * 此函数做最小化映射，确保 SchemaRender 能正确渲染。
 */
function schemaToWidgets(schemaItems: Array<Record<string, unknown>>): Widget[] {
  return schemaItems.map((item, index) => {
    const widget: Record<string, unknown> = {
      id: (item.componentId as string) ?? `${item.type}_${index}_${Math.random().toString(36).slice(2, 7)}`,
      name: `Fg${String(item.type).replace(/-(\w)/g, (_, c: string) => c.toUpperCase()).replace(/^./, (s: string) => s.toUpperCase())}`,
      type: item.type as string,
      position: {
        x: 0,
        y: index * 60,
        w: 800,
        h: 50,
        zIndex: index + 1,
      },
    }

    // 透传所有 schema 属性
    if (item.field) widget.field = item.field
    if (item.label) widget.label = item.label
    if (item.props) widget.props = item.props
    if (item.options) widget.options = item.options
    if (item.defaultValue !== undefined) widget.defaultValue = item.defaultValue
    if (item.style) widget.style = item.style
    if (item.hidden) widget.hidden = item.hidden
    if (item.rules) widget.validationRules = item.rules
    if (item.events) widget.events = item.events
    if (item.rules && Array.isArray(item.rules) && item.rules.length > 0) {
      widget.rules = item.rules
    }

    // 递归处理 children
    if (item.children && Array.isArray(item.children)) {
      widget.children = schemaToWidgets(item.children as Array<Record<string, unknown>>)
    }

    return widget as unknown as Widget
  })
}

// ============================================================
// 渲染应用
// ============================================================

/** 创建 Vue 应用并挂载 SchemaRender */
function createMicroappVueApp(container: HTMLElement, widgets: Widget[]): void {
  app = createApp({
    setup() {
      return () =>
        h('div', { style: 'position: relative; width: 100%; min-height: 100vh;' }, [
          h(SchemaRender, { widgets, mode: 'preview' }),
        ])
    },
  })

  pinia = createPinia()
  app.use(pinia)
  app.use(ElementPlus, { locale: zhCn })

  // 初始化 stores
  const boardStore = useBoardStore(pinia)
  const widgetStore = useWidgetStore(pinia)

  boardStore.loadBoard({
    id: 'microapp',
    name: 'Microapp',
    status: 'published',
  })
  widgetStore.loadWidgets(widgets)

  app.mount(container)
}

// ============================================================
// 主入口
// ============================================================

/**
 * 加载并渲染 microapp。
 *
 * 流程：
 * 1. 解析容器 DOM 元素
 * 2. 配置 API 客户端
 * 3. 通过 publishId 从后端获取已发布的 Schema
 * 4. 将 Schema 转换为 Widget 树
 * 5. 创建 Vue 应用并挂载到容器
 * 6. 初始化 postMessage 通信
 * 7. 返回 formApi 供外部调用
 *
 * @param config - Microapp 配置
 * @returns MicroappApi 表单操作接口
 */
export async function loadMicroapp(config: MicroappConfig): Promise<MicroappApi> {
  // 1. 解析容器
  const container = typeof config.container === 'string'
    ? document.querySelector(config.container) as HTMLElement
    : config.container

  if (!container) {
    throw new Error(`[Microapp] Container not found: ${config.container}`)
  }

  // 2. 清理已有实例
  destroyMicroapp()

  // 3. 配置 API 客户端
  if (config.baseUrl || config.token) {
    configureApiClient({
      baseUrl: config.baseUrl,
      getToken: config.token ? () => config.token! : undefined,
    })
  }

  // 4. 获取已发布 Schema
  let publishedSchema
  try {
    publishedSchema = await fetchPublishedSchema(config.publishId)
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(`[Microapp] Failed to fetch schema (publishId=${config.publishId}): ${err.message}`)
    }
    throw err
  }

  if (!publishedSchema) {
    throw new Error(`[Microapp] Published schema not found: ${config.publishId}`)
  }

  // 5. Schema → Widget 树
  const widgets = schemaToWidgets(publishedSchema.json as unknown as Array<Record<string, unknown>>)

  // 6. 挂载 Vue 应用
  hostContainer = container
  createMicroappVueApp(container, widgets)

  // 7. 构建 formApi
  const widgetStore = useWidgetStore(pinia!)

  const formApi: MicroappApi = {
    getValues() {
      // 收集所有有 field 的 widget 的值
      const values: Record<string, unknown> = {}
      function walk(list: Widget[]) {
        for (const w of list) {
          if (w.field) {
            values[w.field] = w.defaultValue ?? null
          }
          if (w.children) walk(w.children)
        }
      }
      walk(widgetStore.widgets)
      return values
    },

    setValues(values) {
      function walk(list: Widget[]) {
        for (const w of list) {
          if (w.field && w.field in values) {
            w.defaultValue = values[w.field] as FormFieldValue
          }
          if (w.children) walk(w.children)
        }
      }
      walk(widgetStore.widgets)
    },

    async validate() {
      // 基础校验：检查必填字段
      const values = formApi.getValues()
      function walkRules(list: Widget[]): boolean {
        for (const w of list) {
          if (w.validationRules) {
            for (const rule of w.validationRules) {
              if (rule.required) {
                const val = w.field ? values[w.field] : undefined
                if (val === undefined || val === null || val === '') {
                  return false
                }
              }
            }
          }
          if (w.children && !walkRules(w.children)) return false
        }
        return true
      }
      return walkRules(widgetStore.widgets)
    },

    async submit() {
      const valid = await formApi.validate()
      if (!valid) {
        emitToHost('validationError', { message: 'Validation failed' })
        throw new Error('[Microapp] Validation failed')
      }
      const values = formApi.getValues()
      emitToHost('submitSuccess', values)
    },

    destroy() {
      destroyMicroapp()
    },
  }

  // 8. 初始化 postMessage 通信
  initMicroappGuest(formApi)

  return formApi
}

/**
 * 销毁 microapp 实例。
 */
function destroyMicroapp(): void {
  if (app) {
    app.unmount()
    app = null
  }
  if (pinia) {
    pinia = null
  }
  if (hostContainer) {
    hostContainer.innerHTML = ''
    hostContainer = null
  }
}
