import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useLogger } from '@/composables/useLogger'

describe('useLogger', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>
    warn: ReturnType<typeof vi.spyOn>
    error: ReturnType<typeof vi.spyOn>
    debug: ReturnType<typeof vi.spyOn>
  }

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
    }
  })

  it('returns a logger with all methods', () => {
    const logger = useLogger('Test')
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.debug).toBe('function')
    expect(typeof logger.event).toBe('function')
    expect(typeof logger.rule).toBe('function')
    expect(typeof logger.api).toBe('function')
  })

  it('info calls console.log with scope prefix', () => {
    const logger = useLogger('MyScope')
    logger.info('hello', 123)
    expect(consoleSpy.log).toHaveBeenCalledWith(
      expect.stringContaining('[MyScope]'),
      'hello',
      123
    )
  })

  it('warn calls console.warn', () => {
    const logger = useLogger('Test')
    logger.warn('warning')
    expect(consoleSpy.warn).toHaveBeenCalledWith(
      expect.stringContaining('[Test]'),
      'warning'
    )
  })

  it('error calls console.error', () => {
    const logger = useLogger('Test')
    logger.error('err')
    expect(consoleSpy.error).toHaveBeenCalledWith(
      expect.stringContaining('[Test]'),
      'err'
    )
  })

  it('event uses blue color prefix', () => {
    const logger = useLogger('EventEngine')
    logger.event('triggered')
    expect(consoleSpy.log).toHaveBeenCalledWith(
      expect.stringContaining('%c[EventEngine]'),
      expect.stringContaining('color: #409eff'),
      'triggered'
    )
  })

  it('rule uses purple color prefix', () => {
    const logger = useLogger('RuleEngine')
    logger.rule('evaluated')
    expect(consoleSpy.log).toHaveBeenCalledWith(
      expect.stringContaining('%c[RuleEngine]'),
      expect.stringContaining('color: #9c27b0'),
      'evaluated'
    )
  })

  it('api uses green color prefix', () => {
    const logger = useLogger('DataSource')
    logger.api('fetched')
    expect(consoleSpy.log).toHaveBeenCalledWith(
      expect.stringContaining('%c[DataSource]'),
      expect.stringContaining('color: #67c23a'),
      'fetched'
    )
  })
})
