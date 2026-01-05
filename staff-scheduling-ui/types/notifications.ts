/**
 * Notification types and interfaces
 */

export enum NotificationType {
  DOC_EXPIRING_SOON = "DOC_EXPIRING_SOON",
  DOC_EXPIRED = "DOC_EXPIRED",
  AVAILABILITY_DEADLINE_SOON = "AVAILABILITY_DEADLINE_SOON",
  SHIFT_REMINDER = "SHIFT_REMINDER",
  CHANGE_REQUEST_UPDATED = "CHANGE_REQUEST_UPDATED",
  TIME_ENTRY_PENDING = "TIME_ENTRY_PENDING",
  TIME_ENTRY_APPROVED = "TIME_ENTRY_APPROVED",
  TIME_ENTRY_REJECTED = "TIME_ENTRY_REJECTED",
}

export enum NotificationStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  FAILED = "FAILED",
  CANCELED = "CANCELED",
}

export enum NotificationChannel {
  IN_APP = "IN_APP",
  EMAIL = "EMAIL",
  PUSH = "PUSH",
}

export interface Notification {
  id: string
  storeId: string
  userId: string
  type: NotificationType
  status: NotificationStatus
  channel: NotificationChannel
  title: string
  message: string
  data?: any
  scheduledAt?: string | null
  sentAt?: string | null
  readAt?: string | null
  createdAt: string
}

export interface NotificationListResponse {
  items: Notification[]
  nextCursor?: string | null
}

