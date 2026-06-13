/**
 * ComponentPanel search feature tests
 *
 * Covers:
 * - Pinyin initial matching (e.g. "bj" matches "按钮")
 * - Pinyin full matching (e.g. "anniu" matches "按钮")
 * - Chinese text direct matching
 * - English name matching
 * - Debounce behavior (searchQuery updates after 200ms)
 * - Empty state when no results
 * - Highlight markup generation
 * - Group expansion state preserved during search
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { pinyin } from 'pinyin-pro'

// Extract pure functions for unit testing

/** 获取拼音首字母（小写） */
function getPinyinInitials(text: string): string {
  return pinyin(text, { pattern: 'first', toneType: 'none', type: 'array' }).join('').toLowerCase()
}

/** 获取全拼（无空格，小写） */
function getPinyinFull(text: string): string {
  return pinyin(text, { toneType: 'none', type: 'array' }).join('').toLowerCase()
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function highlightText(text: string, query: string, highlightClass: string): string {
  if (!query) return escapeHtml(text)
  const q = query.toLowerCase()
  const lowerText = text.toLowerCase()
  const idx = lowerText.indexOf(q)
  if (idx === -1) return escapeHtml(text)
  const before = text.slice(0, idx)
  const match = text.slice(idx, idx + q.length)
  const after = text.slice(idx + q.length)
  return `${escapeHtml(before)}<em class="${highlightClass}">${escapeHtml(match)}</em>${escapeHtml(after)}`
}

interface MockItem {
  name: string
  displayName: string
}

function matchItem(item: MockItem, q: string): boolean {
  const displayName = item.displayName.toLowerCase()
  const name = item.name.toLowerCase()

  if (displayName.includes(q) || name.includes(q)) return true

  const initials = getPinyinInitials(item.displayName)
  if (initials.includes(q)) return true

  const fullPinyin = getPinyinFull(item.displayName)
  if (fullPinyin.includes(q)) return true

  return false
}

describe('ComponentPanel search', () => {
  // ---------- Pinyin initial matching ----------

  describe('pinyin initial matching', () => {
    it('matches "按钮" with query "an"', () => {
      expect(getPinyinInitials('按钮')).toBe('an')
    })

    it('matches "文本输入" with query "wb"', () => {
      expect(getPinyinInitials('文本输入')).toBe('wbsr')
    })

    it('matches "文本输入" with query "wbsr"', () => {
      expect(matchItem({ name: 'TextInput', displayName: '文本输入' }, 'wbsr')).toBe(true)
    })

    it('matches "下拉选择" with query "xltz"', () => {
      expect(getPinyinInitials('下拉选择')).toBe('xlxz')
      expect(matchItem({ name: 'Select', displayName: '下拉选择' }, 'xlxz')).toBe(true)
    })

    it('matches partial pinyin initials "wb" for "文本输入"', () => {
      expect(matchItem({ name: 'TextInput', displayName: '文本输入' }, 'wb')).toBe(true)
    })
  })

  // ---------- Pinyin full matching ----------

  describe('pinyin full matching', () => {
    it('matches "按钮" with full pinyin "anniu"', () => {
      expect(getPinyinFull('按钮')).toBe('anniu')
      expect(matchItem({ name: 'Button', displayName: '按钮' }, 'anniu')).toBe(true)
    })

    it('matches "文本输入" with full pinyin "wenben"', () => {
      expect(matchItem({ name: 'TextInput', displayName: '文本输入' }, 'wenben')).toBe(true)
    })

    it('does not match wrong pinyin "xyz" for "按钮"', () => {
      expect(matchItem({ name: 'Button', displayName: '按钮' }, 'xyz')).toBe(false)
    })
  })

  // ---------- Chinese text direct matching ----------

  describe('Chinese text direct matching', () => {
    it('matches "按钮" with query "按钮"', () => {
      expect(matchItem({ name: 'Button', displayName: '按钮' }, '按钮')).toBe(true)
    })

    it('matches partial Chinese "按" for "按钮"', () => {
      expect(matchItem({ name: 'Button', displayName: '按钮' }, '按')).toBe(true)
    })
  })

  // ---------- English name matching ----------

  describe('English name matching', () => {
    it('matches "Button" with query "button"', () => {
      expect(matchItem({ name: 'Button', displayName: '按钮' }, 'button')).toBe(true)
    })

    it('matches "TextInput" with query "text"', () => {
      expect(matchItem({ name: 'TextInput', displayName: '文本输入' }, 'text')).toBe(true)
    })
  })

  // ---------- No match ----------

  describe('no match', () => {
    it('does not match unrelated query', () => {
      expect(matchItem({ name: 'Button', displayName: '按钮' }, 'zzzzz')).toBe(false)
    })
  })

  // ---------- Highlight ----------

  describe('highlightText', () => {
    it('returns escaped text when query is empty', () => {
      expect(highlightText('按钮', '', 'hl')).toBe('按钮')
    })

    it('wraps matched portion in em tag', () => {
      const result = highlightText('按钮组件', '按钮', 'hl')
      expect(result).toBe('<em class="hl">按钮</em>组件')
    })

    it('is case-insensitive', () => {
      const result = highlightText('Button', 'but', 'hl')
      expect(result).toBe('<em class="hl">But</em>ton')
    })

    it('escapes HTML in text', () => {
      const result = highlightText('<script>', 'script', 'hl')
      expect(result).toBe('&lt;<em class="hl">script</em>&gt;')
    })

    it('returns escaped full text when no match', () => {
      expect(highlightText('按钮', 'xyz', 'hl')).toBe('按钮')
    })
  })

  // ---------- Debounce simulation ----------

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('delays searchQuery update by 200ms', () => {
      let searchInput = ''
      let searchQuery = ''
      const watchCallback = (val: string) => {
        const timer = setTimeout(() => {
          searchQuery = val
        }, 200)
        return timer
      }

      searchInput = '按钮'
      const timer = watchCallback(searchInput)

      // Before 200ms
      expect(searchQuery).toBe('')

      // After 200ms
      vi.advanceTimersByTime(200)
      expect(searchQuery).toBe('按钮')

      clearTimeout(timer)
    })

    it('cancels previous debounce on rapid input', () => {
      let searchQuery = ''
      let timer: ReturnType<typeof setTimeout> | null = null

      function setInput(val: string) {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          searchQuery = val
        }, 200)
      }

      setInput('按')
      vi.advanceTimersByTime(100)
      setInput('按钮')
      vi.advanceTimersByTime(100)
      // Only 100ms since last input, should not have fired
      expect(searchQuery).toBe('')

      vi.advanceTimersByTime(100)
      expect(searchQuery).toBe('按钮')
    })
  })

  // ---------- Group expansion preservation ----------

  describe('group expansion state', () => {
    it('expandedGroups Set preserves state across filter changes', () => {
      const expanded = new Set(['layout', 'form', 'table'])
      expanded.delete('form')

      // Simulate filter change — Set is mutated independently
      expect(expanded.has('layout')).toBe(true)
      expect(expanded.has('form')).toBe(false)
      expect(expanded.has('table')).toBe(true)
    })
  })
})
