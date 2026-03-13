import { describe, it, expect } from 'vitest'
import {
  NotificationSchema,
  NotificationsResponseSchema,
  type Notification,
  type NotificationsResponse,
  INITIAL_FILTER,
  INITIAL_TYPE_FILTER,
} from '../types'

describe('/notifications types and schemas', () => {
  describe('NotificationSchema validation', () => {
    const base: Notification = {
      id: 'n1',
      type: 'SCRAPE_COMPLETE',
      title: '完了',
      message: 'スクレイピングが完了しました',
      severity: 'SUCCESS',
      isRead: false,
      createdAt: '2024-01-01T00:00:00Z',
    }

    it('parses a minimal valid notification', () => {
      const result = NotificationSchema.safeParse(base)
      expect(result.success).toBe(true)
    })

    it('fails on invalid severity', () => {
      const invalid = { ...base, severity: 'CRITICAL' } as unknown
      const result = NotificationSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('accepts optional fields when provided', () => {
      const withOptionals = {
        ...base,
        productId: 'p1',
        listingId: 'l1',
        readAt: '2024-01-02T00:00:00Z',
      }
      const result = NotificationSchema.safeParse(withOptionals)
      expect(result.success).toBe(true)
    })

    it('fails when required fields are missing', () => {
      const { id, ...rest } = base
      const result = NotificationSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })
  })

  describe('NotificationsResponseSchema validation', () => {
    const validResponse: NotificationsResponse = {
      success: true,
      data: [
        {
          id: 'n1',
          type: 'SCRAPE_COMPLETE',
          title: '完了',
          message: 'スクレイピングが完了しました',
          severity: 'SUCCESS',
          isRead: false,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ],
      pagination: { total: 1, limit: 100, offset: 0 },
      unreadCount: 1,
    }

    it('parses a valid response', () => {
      const result = NotificationsResponseSchema.safeParse(validResponse)
      expect(result.success).toBe(true)
    })

    it('fails when unreadCount is missing', () => {
      // remove unreadCount
      const { unreadCount, ...rest } = validResponse
      const result = NotificationsResponseSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it('fails when data contains invalid notification', () => {
      const bad = {
        ...validResponse,
        data: [{ ...validResponse.data[0], severity: 'INVALID' }],
      }
      const result = NotificationsResponseSchema.safeParse(bad)
      expect(result.success).toBe(false)
    })
  })

  describe('Type exports and defaults', () => {
    it('exports Notification and NotificationsResponse types', () => {
      const n: Notification = {
        id: 'n',
        type: 'SYSTEM',
        title: 't',
        message: 'm',
        severity: 'INFO',
        isRead: true,
        createdAt: '2024-01-01T00:00:00Z',
      }
      const r: NotificationsResponse = {
        success: true,
        data: [n],
        pagination: { total: 1, limit: 100, offset: 0 },
        unreadCount: 0,
      }
      expect(!!n && !!r).toBe(true)
    })

    it('filter defaults are correct', () => {
      expect(INITIAL_FILTER).toBe('all')
      expect(INITIAL_TYPE_FILTER).toBe('')
    })
  })
})

