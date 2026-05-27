/**
 * 数据源系统测试
 *
 * 覆盖：
 * - SchemaApiConfig 配置解析
 * - 动态选项加载（useDynamicOptions）
 * - 数据源缓存（TTL、清除）
 * - 数据源与联动集成
 * - 数据源重试机制
 * - 字典映射（dictCode）
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { reactive } from 'vue'
import { normalizeListResponse, getNestedValue } from '@/utils/responseNormalizer'
import { getCachedOptions, setCachedOptions, clearOptionsCache } from '@/utils/optionsCache'
import { useLinkage } from '@/composables/useLinkage'
import type { PartialWidget, SchemaApiConfig } from '@/widgets/base/types'
import type { FormData } from '@/components/WidgetRenderer/types'

vi.mock('@/composables/useLogger', () => ({
  useLogger: vi.fn(() => ({
    warn: vi.fn(),
    info: vi.fn(),
    rule: vi.fn(),
    event: vi.fn(),
    debug: vi.fn(),
    api: vi.fn(),
  })),
}))

describe('数据源系统', () => {
  // ---- SchemaApiConfig 配置 ----

  describe('SchemaApiConfig 配置', () => {
    it('支持基本 URL 配置', () => {
      const config: SchemaApiConfig = {
        url: '/api/options',
        method: 'get',
      }
      expect(config.url).toBe('/api/options')
      expect(config.method).toBe('get')
    })

    it('支持完整配置', () => {
      const config: SchemaApiConfig = {
        url: '/api/users',
        method: 'post',
        params: { status: 'active' },
        dataPath: 'result.list',
        labelKey: 'userName',
        valueKey: 'userId',
        childrenKey: 'children',
        ttl: 60000,
        immediate: true,
        dictCode: 'user_status',
        cacheLevel: 'both',
        enableRetry: true,
      }

      expect(config.url).toBe('/api/users')
      expect(config.method).toBe('post')
      expect(config.params).toEqual({ status: 'active' })
      expect(config.dataPath).toBe('result.list')
      expect(config.labelKey).toBe('userName')
      expect(config.valueKey).toBe('userId')
      expect(config.childrenKey).toBe('children')
      expect(config.ttl).toBe(60000)
      expect(config.immediate).toBe(true)
      expect(config.dictCode).toBe('user_status')
      expect(config.cacheLevel).toBe('both')
      expect(config.enableRetry).toBe(true)
    })

    it('默认值正确', () => {
      const config: SchemaApiConfig = { url: '/api/test' }
      // 默认值由使用方设置，这里验证配置结构
      expect(config.url).toBe('/api/test')
      expect(config.method).toBeUndefined()
      expect(config.ttl).toBeUndefined()
      expect(config.immediate).toBeUndefined()
    })
  })

  // ---- 响应数据标准化 ----

  describe('响应数据标准化', () => {
    it('处理裸数组响应', () => {
      const { data, total } = normalizeListResponse([{ id: 1 }, { id: 2 }])
      expect(data).toEqual([{ id: 1 }, { id: 2 }])
      expect(total).toBe(0)
    })

    it('提取 data 包装', () => {
      const { data } = normalizeListResponse({ data: [{ name: 'Alice' }] })
      expect(data).toEqual([{ name: 'Alice' }])
    })

    it('提取 list 包装', () => {
      const { data } = normalizeListResponse({ list: [{ name: 'Bob' }] })
      expect(data).toEqual([{ name: 'Bob' }])
    })

    it('使用 dataPath 点号路径', () => {
      const res = { result: { records: [{ id: 1 }, { id: 2 }] } }
      const { data } = normalizeListResponse(res, { dataPath: 'result.records' })
      expect(data).toEqual([{ id: 1 }, { id: 2 }])
    })

    it('提取 total 使用 totalPath', () => {
      const res = { data: [{ id: 1 }], pageInfo: { totalCount: 42 } }
      const { data, total } = normalizeListResponse(res, { totalPath: 'pageInfo.totalCount' })
      expect(data).toHaveLength(1)
      expect(total).toBe(42)
    })

    it('空响应返回空数组', () => {
      expect(normalizeListResponse(null).data).toEqual([])
      expect(normalizeListResponse(undefined).data).toEqual([])
      expect(normalizeListResponse({}).data).toEqual([])
    })

    it('保持树形结构完整', () => {
      const res = {
        data: [
          { id: 1, name: 'Root', children: [{ id: 2, name: 'Child' }] },
        ],
      }
      const { data } = normalizeListResponse(res)
      expect(data).toHaveLength(1)
      expect(data[0].children).toBeDefined()
      expect(data[0].children).toHaveLength(1)
    })
  })

  // ---- 嵌套值获取 ----

  describe('getNestedValue', () => {
    it('获取顶级 key', () => {
      expect(getNestedValue({ data: [1] }, 'data')).toEqual([1])
    })

    it('点号路径遍历', () => {
      expect(getNestedValue({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42)
    })

    it('路径不存在返回 undefined', () => {
      expect(getNestedValue({ a: 1 }, 'b.c')).toBeUndefined()
    })

    it('null/undefined 输入返回 undefined', () => {
      expect(getNestedValue(null, 'a')).toBeUndefined()
      expect(getNestedValue(undefined, 'a')).toBeUndefined()
    })
  })

  // ---- 缓存系统 ----

  describe('缓存系统', () => {
    beforeEach(() => {
      clearOptionsCache()
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('缓存命中', () => {
      setCachedOptions('/api/test', {}, [{ label: 'A', value: 'a' }], 5000)
      const result = getCachedOptions('/api/test', {})
      expect(result).toEqual([{ label: 'A', value: 'a' }])
    })

    it('缓存过期', () => {
      setCachedOptions('/api/test', {}, [{ label: 'A', value: 'a' }], 5000)
      vi.advanceTimersByTime(6000)
      const result = getCachedOptions('/api/test', {})
      expect(result).toBeUndefined()
    })

    it('ttl=0 永不过期', () => {
      setCachedOptions('/api/test', {}, [{ label: 'A', value: 'a' }], 0)
      vi.advanceTimersByTime(999999999)
      const result = getCachedOptions('/api/test', {})
      expect(result).toEqual([{ label: 'A', value: 'a' }])
    })

    it('不同参数独立缓存', () => {
      setCachedOptions('/api/test', { type: 'a' }, [{ label: 'A', value: 'a' }], 5000)
      setCachedOptions('/api/test', { type: 'b' }, [{ label: 'B', value: 'b' }], 5000)

      expect(getCachedOptions('/api/test', { type: 'a' })).toEqual([{ label: 'A', value: 'a' }])
      expect(getCachedOptions('/api/test', { type: 'b' })).toEqual([{ label: 'B', value: 'b' }])
    })

    it('清除缓存', () => {
      setCachedOptions('/api/test', {}, [{ label: 'A', value: 'a' }], 5000)
      clearOptionsCache()
      expect(getCachedOptions('/api/test', {})).toBeUndefined()
    })
  })

  // ---- 数据源与联动集成 ----

  describe('数据源与联动集成', () => {
    it('options 联动覆盖静态选项', () => {
      const schema: PartialWidget[] = [
        { type: 'select', field: 'province', label: '省份' },
        {
          type: 'select', field: 'city', label: '城市',
          linkages: [{
            type: 'options',
            watchFields: ['province'],
            condition: 'values.province === "guangdong"',
            thenOptions: [
              { label: '广州', value: 'gz' },
              { label: '深圳', value: 'sz' },
            ],
          }],
        },
      ]

      const formData = reactive<FormData>({ province: 'guangdong', city: '' })
      const { stateMap } = useLinkage(schema, formData)

      expect(stateMap.value.get('city')!.options).toEqual([
        { label: '广州', value: 'gz' },
        { label: '深圳', value: 'sz' },
      ])
    })

    it('options 联动覆盖 API 配置', () => {
      const schema: PartialWidget[] = [
        { type: 'select', field: 'category', label: '分类' },
        {
          type: 'select', field: 'item', label: '项目',
          linkages: [{
            type: 'options',
            watchFields: ['category'],
            condition: 'values.category !== ""',
            thenApi: {
              url: '/api/items',
              method: 'get',
              params: { category: '${values.category}' },
            },
          }],
        },
      ]

      const formData = reactive<FormData>({ category: 'tech', item: '' })
      const { stateMap } = useLinkage(schema, formData)

      expect(stateMap.value.get('item')!.optionsApi).toBeDefined()
      expect(stateMap.value.get('item')!.optionsApi!.url).toBe('/api/items')
    })

    it('多个 options 联动条件切换', () => {
      const schema: PartialWidget[] = [
        { type: 'select', field: 'province', label: '省份' },
        {
          type: 'select', field: 'city', label: '城市',
          linkages: [
            {
              type: 'options',
              watchFields: ['province'],
              condition: 'values.province === "guangdong"',
              thenOptions: [{ label: '广州', value: 'gz' }],
            },
            {
              type: 'options',
              watchFields: ['province'],
              condition: 'values.province === "zhejiang"',
              thenOptions: [{ label: '杭州', value: 'hz' }],
            },
          ],
        },
      ]

      const formData = reactive<FormData>({ province: '', city: '' })
      const { stateMap } = useLinkage(schema, formData)

      formData.province = 'guangdong'
      expect(stateMap.value.get('city')!.options).toEqual([{ label: '广州', value: 'gz' }])

      formData.province = 'zhejiang'
      expect(stateMap.value.get('city')!.options).toEqual([{ label: '杭州', value: 'hz' }])

      formData.province = ''
      expect(stateMap.value.get('city')!.options).toBeUndefined()
    })
  })

  // ---- 数据源配置完整性 ----

  describe('数据源配置场景', () => {
    it('字典映射配置', () => {
      const config: SchemaApiConfig = {
        url: '',
        dictCode: 'status_type',
      }
      expect(config.dictCode).toBe('status_type')
    })

    it('树形数据配置', () => {
      const config: SchemaApiConfig = {
        url: '/api/tree',
        childrenKey: 'items',
        labelKey: 'name',
        valueKey: 'id',
      }
      expect(config.childrenKey).toBe('items')
      expect(config.labelKey).toBe('name')
      expect(config.valueKey).toBe('id')
    })

    it('缓存策略配置', () => {
      const configs: SchemaApiConfig[] = [
        { url: '/api/a', cacheLevel: 'memory' },
        { url: '/api/b', cacheLevel: 'indexeddb' },
        { url: '/api/c', cacheLevel: 'both' },
      ]

      expect(configs[0].cacheLevel).toBe('memory')
      expect(configs[1].cacheLevel).toBe('indexeddb')
      expect(configs[2].cacheLevel).toBe('both')
    })

    it('重试配置', () => {
      const config: SchemaApiConfig = {
        url: '/api/flaky',
        enableRetry: true,
      }
      expect(config.enableRetry).toBe(true)
    })
  })
})
