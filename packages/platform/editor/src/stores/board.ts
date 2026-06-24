/**
 * useBoardStore — 实例信息和画布配置
 *
 * 职责：
 * - 画布实例元数据（id, name, status）
 * - 画布配置（宽高、背景色、内边距、缩放）
 * - 顶层变量集合
 * - 顶层事件集合
 *
 * 变化频率低，与 Widget 数据解耦。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CanvasConfig, BoardVariable, BoardEvent } from '../widgets/base/types'

/** 统一缩放阈值，EditorViewToolbar 和 setZoom 共用 */
export const MIN_ZOOM = 50
export const MAX_ZOOM = 200

export const useBoardStore = defineStore('board', () => {
  // ================================================================
  // 实例信息
  // ================================================================

  const id = ref('')
  const name = ref('')
  const status = ref<'draft' | 'published'>('draft')

  // ================================================================
  // 画布配置
  // ================================================================

  const canvas = ref<CanvasConfig>({
    width: 1920,
    height: 1080,
    backgroundColor: 'var(--bg-color-gray)',
    padding: '0px',
    zoom: 100,
  })

  // ================================================================
  // 顶层变量集合
  // ================================================================

  const variables = ref<BoardVariable[]>([])

  // ================================================================
  // 顶层事件集合
  // ================================================================

  const events = ref<BoardEvent[]>([])

  // ================================================================
  // 画布配置操作
  // ================================================================

  function updateCanvas(patch: Partial<CanvasConfig>): void {
    Object.assign(canvas.value, patch)
  }

  function setZoom(zoom: number): void {
    canvas.value.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
  }

  // ================================================================
  // 变量操作
  // ================================================================

  function addVariable(variable: BoardVariable): void {
    variables.value.push(variable)
  }

  function removeVariable(name: string): void {
    const idx = variables.value.findIndex((v) => v.name === name)
    if (idx >= 0) {
      variables.value.splice(idx, 1)
    }
  }

  function updateVariable(name: string, patch: Partial<BoardVariable>): void {
    const variable = variables.value.find((v) => v.name === name)
    if (variable) {
      Object.assign(variable, patch)
    }
  }

  // ================================================================
  // 事件操作
  // ================================================================

  function addEvent(event: BoardEvent): void {
    events.value.push(event)
  }

  function removeEvent(index: number): void {
    if (index >= 0 && index < events.value.length) {
      events.value.splice(index, 1)
    }
  }

  function updateEvent(index: number, patch: Partial<BoardEvent>): void {
    if (index >= 0 && index < events.value.length) {
      Object.assign(events.value[index], patch)
    }
  }

  // ================================================================
  // 批量初始化（从 API 加载时使用）
  // ================================================================

  function loadBoard(data: {
    id: string
    name: string
    status: 'draft' | 'published'
    canvas?: Partial<CanvasConfig>
    variables?: BoardVariable[]
    events?: BoardEvent[]
  }): void {
    id.value = data.id
    name.value = data.name
    status.value = data.status
    if (data.canvas) {
      Object.assign(canvas.value, data.canvas)
    }
    if (data.variables) {
      variables.value = data.variables
    }
    if (data.events) {
      events.value = data.events
    }
  }

  // ================================================================
  // 导出
  // ================================================================

  return {
    // 实例信息
    id,
    name,
    status,
    // 画布配置
    canvas,
    // 变量
    variables,
    // 事件
    events,
    // 画布配置操作
    updateCanvas,
    setZoom,
    // 变量操作
    addVariable,
    removeVariable,
    updateVariable,
    // 事件操作
    addEvent,
    removeEvent,
    updateEvent,
    // 批量初始化
    loadBoard,
  }
})
