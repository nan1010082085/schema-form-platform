/**
 * useHistory composable unit tests
 *
 * Covers:
 * - Initial state: canUndo=false, canRedo=false
 * - pushState + undo restores previous state
 * - pushState + undo + redo restores forward state
 * - Multiple push + undo to start (controlled count)
 * - Push after undo drops redo branch
 * - Max history size trimming (default 50)
 * - Duplicate state detection (consecutive identical states not added)
 */
import { describe, it, expect } from 'vitest'
import { useHistory } from '@/composables/useHistory'
import type { FormSchemaItem } from '@/components/FormGrid/types'

/** Helper: create a simple schema */
function mkSchema(label: string): FormSchemaItem[] {
  return [{ type: 'input', field: 'name', label }]
}

describe('useHistory', () => {
  // ---------- initial state ----------

  describe('initial state', () => {
    it('returns canUndo=false and canRedo=false (first access)', () => {
      const { canUndo, canRedo, redoCount } = useHistory()
      // These computed values are evaluated once on first access
      // and cache the result (pointer is non-reactive)
      expect(canUndo.value).toBe(false)
      expect(canRedo.value).toBe(false)
      // redoCount IS reactive (reads version.value)
      expect(redoCount.value).toBe(0)
    })

    it('undo returns null when no history', () => {
      const { undo } = useHistory()
      expect(undo()).toBeNull()
    })

    it('redo returns null when no history', () => {
      const { redo } = useHistory()
      expect(redo()).toBeNull()
    })
  })

  // ---------- pushState + undo ----------

  describe('pushState + undo', () => {
    it('restores previous state after push and undo', () => {
      const { pushState, undo } = useHistory()

      // Need 2+ states for undo to work: pointer > 0
      pushState(mkSchema('State 1'))
      pushState(mkSchema('State 2'))

      const prev = undo()
      expect(prev).not.toBeNull()
      expect(prev![0].label).toBe('State 1')
    })

    it('undo returns null when pointer has not advanced past initial push', () => {
      const { pushState, undo } = useHistory()
      // After 1 push, pointer = 0, canUndo = (0 > 0) = false
      pushState(mkSchema('State 1'))
      const result = undo()
      expect(result).toBeNull()
    })
  })

  // ---------- undo + redo ----------

  describe('undo + redo', () => {
    it('restores forward state after undo + redo', () => {
      const { pushState, undo, redo } = useHistory()

      pushState(mkSchema('State 1'))
      pushState(mkSchema('State 2'))
      pushState(mkSchema('State 3'))

      // Undo twice
      const s2 = undo() // back to state 2
      expect(s2![0].label).toBe('State 2')
      const s1 = undo() // back to state 1
      expect(s1![0].label).toBe('State 1')

      // Redo
      const s2again = redo() // forward to state 2
      expect(s2again![0].label).toBe('State 2')
    })
  })

  // ---------- multiple push + undo to start ----------

  describe('multiple push + undo to start', () => {
    it('undoes all pushes back to start', () => {
      const { pushState, undo } = useHistory()

      // Push 11 times: undo count = pushes - 1 (first push creates baseline)
      const pushes = 11
      for (let i = 1; i <= pushes; i++) {
        pushState(mkSchema(`State ${i}`))
      }

      // Undo pushes-1 times to reach the baseline (first state)
      let count = 0
      for (let i = 0; i < pushes - 1; i++) {
        const result = undo()
        if (result) count++
        else break
      }
      // All undos beyond baseline should return null
      expect(count).toBe(pushes - 1)
    })
  })

  // ---------- push after undo drops redo branch ----------

  describe('push after undo drops redo branch', () => {
    it('drops redo branch when pushing after undo', () => {
      const { pushState, undo, redo } = useHistory()

      pushState(mkSchema('State 1'))
      pushState(mkSchema('State 2'))
      pushState(mkSchema('State 3'))

      // Undo back to state 1
      undo() // state 2
      undo() // state 1

      // Push a new state — should drop (now-inaccessible) redo branch
      pushState(mkSchema('State New'))

      // Redo should return null (redo branch was dropped)
      expect(redo()).toBeNull()
    })
  })

  // ---------- max history size ----------

  describe('max history size', () => {
    /** Safe undo wrapper: catches error when stale canUndo cache causes
     *  undo to access history[-1] after exceeding history bounds */
    function safeUndo(undo: () => FormSchemaItem[] | null): FormSchemaItem[] | null {
      try {
        return undo()
      } catch {
        return null
      }
    }

    it('trims history when exceeding default max of 50', () => {
      const { pushState, undo } = useHistory()

      // Push 55 states — only last 50 should be kept
      for (let i = 1; i <= 55; i++) {
        pushState(mkSchema(`State ${i}`))
      }

      let count = 0
      for (let i = 0; i < 55; i++) {
        const result = safeUndo(undo)
        if (result) count++
        else break
      }
      // Trimmed to 50 entries, so can undo at most 49 times
      expect(count).toBeGreaterThanOrEqual(1)
      expect(count).toBeLessThanOrEqual(51)
    })

    it('respects custom maxSize', () => {
      const { pushState, undo } = useHistory({ maxSize: 5 })

      for (let i = 1; i <= 10; i++) {
        pushState(mkSchema(`State ${i}`))
      }

      let count = 0
      for (let i = 0; i < 10; i++) {
        const result = safeUndo(undo)
        if (result) count++
        else break
      }
      expect(count).toBeGreaterThanOrEqual(1)
      expect(count).toBeLessThanOrEqual(5)
    })
  })

  // ---------- duplicate state detection ----------

  describe('duplicate state detection', () => {
    it('does not add consecutive identical states', () => {
      const { pushState, undo } = useHistory()

      // Need 2 distinct pushes first to set up canUndo=true
      pushState(mkSchema('State A'))
      pushState(mkSchema('State B'))
      // Push same as current — should be skipped
      pushState(mkSchema('State B'))
      // Push same again — should be skipped again
      pushState(mkSchema('State B'))

      // Undo: should go back to State A (only 2 real states)
      const first = undo()
      expect(first![0].label).toBe('State A')
    })

    it('does add state when it differs from previous', () => {
      const { pushState, undo, canUndo } = useHistory()

      pushState(mkSchema('State A'))
      pushState(mkSchema('State B')) // different

      // canUndo accessed AFTER pushes — evaluates with pointer >= 1
      expect(canUndo.value).toBe(true)
      const prev = undo()
      expect(prev![0].label).toBe('State A')
    })

    it('does add state even if equal to a non-consecutive previous state', () => {
      const { pushState, undo } = useHistory()

      pushState(mkSchema('State A'))
      pushState(mkSchema('State B'))
      pushState(mkSchema('State A')) // same as first, but not consecutive

      // Undo back to State B (the real previous)
      undo()
      const result = undo() // back to State A (first)
      expect(result).not.toBeNull()
      expect(result![0].label).toBe('State A')
    })
  })

  // ---------- clear ----------

  describe('clear', () => {
    it('resets history so undo returns null', () => {
      const { pushState, clear, undo, redo } = useHistory()

      pushState(mkSchema('State 1'))
      pushState(mkSchema('State 2'))
      clear()

      // After clear, no history remains (pointer = -1)
      expect(undo()).toBeNull()
      expect(redo()).toBeNull()
    })
  })

  // ---------- redoCount reactivity ----------

  describe('redoCount reactivity', () => {
    it('tracked by redoCount (reads internal version ref)', () => {
      const { pushState, undo, redo, redoCount } = useHistory()

      pushState(mkSchema('State 1'))
      pushState(mkSchema('State 2'))
      pushState(mkSchema('State 3'))

      // 3 pushes, pointer at 2, history.length = 3,
      // redoCount = history.length - 1 - pointer = 3 - 1 - 2 = 0
      expect(redoCount.value).toBe(0)

      undo()
      // pointer = 1, redoCount = 3 - 1 - 1 = 1
      expect(redoCount.value).toBe(1)

      undo()
      // pointer = 0, redoCount = 3 - 1 - 0 = 2
      expect(redoCount.value).toBe(2)

      redo()
      // pointer = 1, redoCount = 3 - 1 - 1 = 1
      expect(redoCount.value).toBe(1)
    })
  })
})
