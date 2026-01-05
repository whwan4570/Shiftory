"use client"

import { NotificationItem } from "./notification-item"
import { Card, CardContent } from "@/components/ui/card"
import type { Notification } from "@/types/notifications"

interface NotificationListProps {
  notifications: Notification[]
  onMarkRead?: (notificationId: string) => void
  onClick?: (notification: Notification) => void
  onApproveTimeEntry?: (timeEntryId: string) => Promise<void>
  loading?: boolean
  emptyMessage?: string
}

export function NotificationList({
  notifications,
  onMarkRead,
  onClick,
  onApproveTimeEntry,
  loading,
  emptyMessage = "No notifications",
}: NotificationListProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onMarkRead={onMarkRead}
          onClick={onClick}
          onApproveTimeEntry={onApproveTimeEntry}
        />
      ))}
    </div>
  )
}

