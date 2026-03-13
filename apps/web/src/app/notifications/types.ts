import { z } from 'zod'

// TypeScript Interfaces
export interface Notification {
  id: string
  type: string
  title: string
  message: string
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS'
  productId?: string
  listingId?: string
  isRead: boolean
  readAt?: string
  createdAt: string
}

export interface NotificationsResponse {
  success: boolean
  data: Notification[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
  unreadCount: number
}

// Zod Schemas
export const NotificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  severity: z.enum(['INFO', 'WARNING', 'ERROR', 'SUCCESS']),
  productId: z.string().optional(),
  listingId: z.string().optional(),
  isRead: z.boolean(),
  readAt: z.string().optional(),
  createdAt: z.string(),
})

export const NotificationsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(NotificationSchema),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
  }),
  unreadCount: z.number(),
})

// Initial filter values for the UI (exported for tests)
export const INITIAL_FILTER: 'all' | 'unread' = 'all'
export const INITIAL_TYPE_FILTER: string = ''

