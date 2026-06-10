/**
 * 通信模块测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { EventMessage } from '../events.js'

// Store the message handler
let messageHandler: ((event: MessageEvent) => void) | null = null

// Mock window before importing the module
const mockPostMessage = vi.fn()

beforeEach(async () => {
  vi.useFakeTimers()
  messageHandler = null
  mockPostMessage.mockReset()

  // Mock window
  vi.stubGlobal('window', {
    addEventListener: vi.fn((type: string, handler: (event: MessageEvent) => void) => {
      if (type === 'message') {
        messageHandler = handler
      }
    }),
    removeEventListener: vi.fn(),
    parent: {
      postMessage: mockPostMessage,
    },
  })

  // Mock console
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})

  // Reset modules to get fresh state
  vi.resetModules()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

// Helper to simulate receiving a message
function simulateMessage(message: EventMessage) {
  if (messageHandler) {
    messageHandler({ data: message } as MessageEvent)
  }
}

describe('Communication Module', () => {
  describe('initCommunication', () => {
    it('should attach message handler on init', async () => {
      const { initCommunication, destroy } = await import('../communication.js')
      initCommunication()
      expect(window.addEventListener).toHaveBeenCalledWith('message', expect.any(Function))
      destroy()
    })

    it('should only attach handler once', async () => {
      const { initCommunication, destroy } = await import('../communication.js')
      initCommunication()
      initCommunication()
      expect(window.addEventListener).toHaveBeenCalledTimes(1)
      destroy()
    })

    it('should call onError callback on handler errors', async () => {
      const { initCommunication, on, destroy } = await import('../communication.js')
      const onError = vi.fn()
      initCommunication({ onError, debug: true })

      // Register a handler that throws
      const handler = vi.fn(() => {
        throw new Error('test error')
      })
      on('child:ready', handler)

      // Simulate message
      simulateMessage({
        type: 'child:ready',
        payload: { appName: 'editor' },
        timestamp: Date.now(),
        source: 'editor',
      })

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'HANDLER_ERROR',
          eventType: 'child:ready',
        })
      )
      destroy()
    })
  })

  describe('send', () => {
    it('should send message to parent window by default', async () => {
      const { initCommunication, send, destroy } = await import('../communication.js')
      initCommunication()

      send('child:ready', { appName: 'editor' })

      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'child:ready',
          payload: { appName: 'editor' },
          source: 'portal',
          timestamp: expect.any(Number),
        }),
        '*'
      )
      destroy()
    })

    it('should send message to target window when specified', async () => {
      const { initCommunication, send, destroy } = await import('../communication.js')
      initCommunication()
      const targetWindow = { postMessage: vi.fn() } as unknown as Window

      send('portal:set-context', { context: {} }, targetWindow, 'portal')

      expect(targetWindow.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'portal:set-context',
          payload: { context: {} },
          source: 'portal',
        }),
        '*'
      )
      destroy()
    })

    it('should handle send errors', async () => {
      const { initCommunication, send, destroy } = await import('../communication.js')
      const onError = vi.fn()
      initCommunication({ onError })

      mockPostMessage.mockImplementation(() => {
        throw new Error('send failed')
      })

      send('child:ready', { appName: 'editor' })

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'SEND_FAILED',
          eventType: 'child:ready',
        })
      )
      destroy()
    })
  })

  describe('on', () => {
    it('should register and call handler for matching events', async () => {
      const { initCommunication, on, destroy } = await import('../communication.js')
      initCommunication()
      const handler = vi.fn()

      on('child:ready', handler)

      simulateMessage({
        type: 'child:ready',
        payload: { appName: 'editor' },
        timestamp: Date.now(),
        source: 'editor',
      })

      expect(handler).toHaveBeenCalledWith({ appName: 'editor' })
      destroy()
    })

    it('should not call handler for non-matching events', async () => {
      const { initCommunication, on, destroy } = await import('../communication.js')
      initCommunication()
      const handler = vi.fn()

      on('child:ready', handler)

      simulateMessage({
        type: 'child:error',
        payload: { code: 'TEST', message: 'test' },
        timestamp: Date.now(),
        source: 'editor',
      })

      expect(handler).not.toHaveBeenCalled()
      destroy()
    })

    it('should return unsubscribe function', async () => {
      const { initCommunication, on, destroy } = await import('../communication.js')
      initCommunication()
      const handler = vi.fn()

      const unsubscribe = on('child:ready', handler)
      unsubscribe()

      simulateMessage({
        type: 'child:ready',
        payload: { appName: 'editor' },
        timestamp: Date.now(),
        source: 'editor',
      })

      expect(handler).not.toHaveBeenCalled()
      destroy()
    })
  })

  describe('once', () => {
    it('should only call handler once', async () => {
      const { initCommunication, once, destroy } = await import('../communication.js')
      initCommunication()
      const handler = vi.fn()

      once('child:ready', handler)

      simulateMessage({
        type: 'child:ready',
        payload: { appName: 'editor' },
        timestamp: Date.now(),
        source: 'editor',
      })

      simulateMessage({
        type: 'child:ready',
        payload: { appName: 'flow' },
        timestamp: Date.now(),
        source: 'flow',
      })

      expect(handler).toHaveBeenCalledTimes(1)
      destroy()
    })
  })

  describe('off', () => {
    it('should remove all handlers for a type', async () => {
      const { initCommunication, on, off, destroy } = await import('../communication.js')
      initCommunication()
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      on('child:ready', handler1)
      on('child:ready', handler2)
      off('child:ready')

      simulateMessage({
        type: 'child:ready',
        payload: { appName: 'editor' },
        timestamp: Date.now(),
        source: 'editor',
      })

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()
      destroy()
    })
  })

  describe('request', () => {
    it('should resolve when response is received', async () => {
      const { initCommunication, request, destroy } = await import('../communication.js')
      initCommunication()

      const promise = request('child:ready', { appName: 'editor' })

      // Get the sent message to extract messageId
      const sentMessage = mockPostMessage.mock.calls[0][0] as EventMessage
      expect(sentMessage.messageId).toBeDefined()

      // Simulate response
      simulateMessage({
        type: 'child:ready',
        payload: { appName: 'editor', version: '1.0.0' },
        timestamp: Date.now(),
        messageId: sentMessage.messageId,
        source: 'portal',
      })

      await expect(promise).resolves.toEqual({ appName: 'editor', version: '1.0.0' })
      destroy()
    })

    it('should reject on timeout', async () => {
      const { initCommunication, request, destroy } = await import('../communication.js')
      initCommunication({ timeout: 1000 })

      const promise = request('child:ready', { appName: 'editor' })

      // Advance timer past timeout
      vi.advanceTimersByTime(1001)

      await expect(promise).rejects.toEqual(
        expect.objectContaining({
          code: 'TIMEOUT',
          eventType: 'child:ready',
        })
      )
      destroy()
    })

    it('should reject on send failure', async () => {
      const { initCommunication, request, destroy } = await import('../communication.js')
      initCommunication()

      mockPostMessage.mockImplementation(() => {
        throw new Error('send failed')
      })

      const promise = request('child:ready', { appName: 'editor' })

      await expect(promise).rejects.toEqual(
        expect.objectContaining({
          code: 'SEND_FAILED',
          eventType: 'child:ready',
        })
      )
      destroy()
    })
  })

  describe('respond', () => {
    it('should send response with original messageId', async () => {
      const { initCommunication, respond, destroy } = await import('../communication.js')
      initCommunication()

      const originalMessage: EventMessage = {
        type: 'portal:set-context',
        payload: { context: {} },
        timestamp: Date.now(),
        messageId: 'test-message-id',
        source: 'portal',
      }

      respond(originalMessage, { context: { success: true } })

      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'portal:set-context',
          payload: { context: { success: true } },
          messageId: 'test-message-id',
        }),
        '*'
      )
      destroy()
    })

    it('should report error if original message has no messageId', async () => {
      const { initCommunication, respond, destroy } = await import('../communication.js')
      const onError = vi.fn()
      initCommunication({ onError })

      const originalMessage: EventMessage = {
        type: 'portal:set-context',
        payload: { context: {} },
        timestamp: Date.now(),
        source: 'portal',
      }

      respond(originalMessage, { context: { success: true } })

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'INVALID_MESSAGE',
        })
      )
      expect(mockPostMessage).not.toHaveBeenCalled()
      destroy()
    })
  })

  describe('destroy', () => {
    it('should clear all listeners', async () => {
      const { initCommunication, on, destroy } = await import('../communication.js')
      initCommunication()
      const handler = vi.fn()

      on('child:ready', handler)
      destroy()

      simulateMessage({
        type: 'child:ready',
        payload: { appName: 'editor' },
        timestamp: Date.now(),
        source: 'editor',
      })

      expect(handler).not.toHaveBeenCalled()
    })

    it('should reject all pending requests', async () => {
      const { initCommunication, request, destroy } = await import('../communication.js')
      initCommunication()

      const promise = request('child:ready', { appName: 'editor' })

      destroy()

      await expect(promise).rejects.toEqual(
        expect.objectContaining({
          code: 'SEND_FAILED',
          message: 'Communication destroyed',
        })
      )
    })
  })

  describe('convenience APIs', () => {
    it('sendToChild should send message with portal source', async () => {
      const { initCommunication, sendToChild, destroy } = await import('../communication.js')
      initCommunication()

      sendToChild('editor', 'portal:set-context', { context: {} })

      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'portal:set-context',
          payload: { context: {} },
          source: 'portal',
        }),
        '*'
      )
      destroy()
    })

    it('reportToPortal should send message with child source', async () => {
      const { initCommunication, reportToPortal, destroy } = await import('../communication.js')
      initCommunication()

      reportToPortal('child:ready', { appName: 'flow' }, 'flow')

      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'child:ready',
          payload: { appName: 'flow' },
          source: 'flow',
        }),
        '*'
      )
      destroy()
    })

    it('listenFromPortal should register handler', async () => {
      const { initCommunication, listenFromPortal, destroy } = await import('../communication.js')
      initCommunication()
      const handler = vi.fn()

      listenFromPortal('portal:set-context', handler)

      simulateMessage({
        type: 'portal:set-context',
        payload: { context: { key: 'value' } },
        timestamp: Date.now(),
        source: 'portal',
      })

      expect(handler).toHaveBeenCalledWith({ context: { key: 'value' } })
      destroy()
    })

    it('respondToPortal should send response with child source', async () => {
      const { initCommunication, respondToPortal, destroy } = await import('../communication.js')
      initCommunication()

      const originalMessage: EventMessage = {
        type: 'portal:set-context',
        payload: { context: {} },
        timestamp: Date.now(),
        messageId: 'test-id',
        source: 'portal',
      }

      respondToPortal(originalMessage, { context: { success: true } }, 'ai')

      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'portal:set-context',
          payload: { context: { success: true } },
          messageId: 'test-id',
          source: 'ai',
        }),
        '*'
      )
      destroy()
    })
  })
})
