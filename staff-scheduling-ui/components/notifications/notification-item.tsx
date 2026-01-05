"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import type { Notification } from "@/types/notifications"

interface NotificationItemProps {
  notification: Notification
  onMarkRead?: (notificationId: string) => void
  onClick?: (notification: Notification) => void
  onApproveTimeEntry?: (timeEntryId: string) => Promise<void>
}

export function NotificationItem({ 
  notification, 
  onMarkRead, 
  onClick,
  onApproveTimeEntry 
}: NotificationItemProps) {
  const isUnread = !notification.readAt
  const [isApproving, setIsApproving] = useState(false)
  // Check for TIME_ENTRY_PENDING type (handle both enum and string)
  // Also check if the notification message/title indicates a pending time entry
  const isTimeEntryPending = notification.type === "TIME_ENTRY_PENDING" || 
                            (typeof notification.type === 'string' && notification.type.includes('TIME_ENTRY_PENDING')) ||
                            (notification.title?.toLowerCase().includes('pending') && 
                             (notification.message?.toLowerCase().includes('check_in') || 
                              notification.message?.toLowerCase().includes('check_out') ||
                              notification.message?.toLowerCase().includes('check-in') ||
                              notification.message?.toLowerCase().includes('check-out')))
  
  // Extract timeEntryId from various possible data structures
  const timeEntryId = notification.data?.timeEntryId || 
                      notification.data?.timeEntry?.id ||
                      (typeof notification.data === 'object' && notification.data !== null && 'timeEntryId' in notification.data ? (notification.data as any).timeEntryId : null)

  const typeLabels: Record<string, string> = {
    DOC_EXPIRING_SOON: "Document Expiring",
    DOC_EXPIRED: "Document Expired",
    AVAILABILITY_DEADLINE_SOON: "Availability Deadline",
    SHIFT_REMINDER: "Shift Reminder",
    CHANGE_REQUEST_UPDATED: "Request Updated",
    TIME_ENTRY_PENDING: "Time Entry Pending",
    TIME_ENTRY_APPROVED: "Time Entry Approved",
    TIME_ENTRY_REJECTED: "Time Entry Rejected",
  }

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    SENT: { label: "Sent", variant: "default" },
    PENDING: { label: "Pending", variant: "secondary" },
    FAILED: { label: "Failed", variant: "destructive" },
    CANCELED: { label: "Canceled", variant: "outline" },
  }

  const statusInfo = statusConfig[notification.status] || {
    label: notification.status,
    variant: "outline" as const,
  }

  const handleClick = () => {
    if (isUnread && onMarkRead) {
      onMarkRead(notification.id)
    }
    if (onClick) {
      onClick(notification)
    }
  }

  const handleCheckboxChange = async (checked: boolean) => {
    if (checked && isTimeEntryPending && timeEntryId && onApproveTimeEntry) {
      setIsApproving(true)
      try {
        await onApproveTimeEntry(timeEntryId)
        // Mark notification as read after approval
        if (onMarkRead) {
          onMarkRead(notification.id)
        }
      } catch (err) {
        console.error("Failed to approve time entry:", err)
      } finally {
        setIsApproving(false)
      }
    }
  }

  return (
    <Card
      className={`transition-colors ${isUnread ? "bg-muted border-l-4 border-l-primary" : ""} ${isTimeEntryPending ? "" : "cursor-pointer"}`}
      onClick={!isTimeEntryPending ? handleClick : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {!isTimeEntryPending && isUnread && (
            <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
          )}
          {isTimeEntryPending ? (
            <div className="mt-1 shrink-0">
              <Checkbox
                checked={false}
                onCheckedChange={handleCheckboxChange}
                disabled={isApproving || !timeEntryId || !onApproveTimeEntry}
                className="h-5 w-5"
                aria-label={notification.data?.type === 'CHECK_OUT' || notification.message?.toLowerCase().includes('check-out') || notification.message?.toLowerCase().includes('check_out')
                  ? 'Approve check-out'
                  : 'Approve time entry'}
              />
            </div>
          ) : null}
          <div className="flex-1 space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm">{notification.title}</h4>
              <Badge variant="outline" className="text-xs">
                {typeLabels[notification.type] || notification.type}
              </Badge>
              <Badge variant={statusInfo.variant} className="text-xs">
                {statusInfo.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{notification.message}</p>
            {isTimeEntryPending && (
              <p className="text-xs text-muted-foreground italic">
                {notification.data?.type === 'CHECK_OUT' || notification.message?.toLowerCase().includes('check-out') || notification.message?.toLowerCase().includes('check_out')
                  ? 'Check the box to approve this check-out'
                  : 'Check the box to approve this time entry'}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {new Date(notification.createdAt).toLocaleDateString()} {new Date(notification.createdAt).toLocaleTimeString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

