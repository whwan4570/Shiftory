"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Sidebar } from "@/components/sidebar"
import { Topbar } from "@/components/topbar"
import { NotificationList } from "@/components/notifications/notification-list"
import { NotificationFilters } from "@/components/notifications/notification-filters"
import { useAuth } from "@/hooks/useAuth"
import { listMy, markRead, markAllRead } from "@/lib/notificationsApi"
import { reviewTimeEntry } from "@/lib/timeEntriesApi"
import type { Notification, NotificationStatus } from "@/types/notifications"
import { toast } from "sonner"
import { AlertCircle, RefreshCw, CheckCheck } from "lucide-react"

export default function NotificationsPage() {
  const router = useRouter()
  const { storeId, isLoading: authLoading } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unreadOnly, setUnreadOnly] = useState(true)
  // Removed statusFilter - backend doesn't support status filtering
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [markingAllRead, setMarkingAllRead] = useState(false)

  // Redirect if no storeId
  useEffect(() => {
    if (!authLoading && !storeId) {
      router.replace("/stores")
    }
  }, [storeId, authLoading, router])

  // Load notifications when filters change
  useEffect(() => {
    if (storeId && !authLoading) {
      loadNotifications(true)
    }
  }, [storeId, authLoading, unreadOnly])

  const loadNotifications = async (reset: boolean = false) => {
    if (!storeId) return

    if (reset) {
      setLoading(true)
      setError(null)
      setNextCursor(null)
    } else {
      setLoadingMore(true)
    }

    try {
      const params: {
        unread?: boolean
        limit?: number
        cursor?: string
      } = {
        limit: 20,
      }

      if (unreadOnly) {
        params.unread = true
      }

      if (!reset && nextCursor) {
        params.cursor = nextCursor
      }

      const response = await listMy(storeId, params)
      
      if (reset) {
        setNotifications(response.items)
      } else {
        setNotifications((prev) => [...prev, ...response.items])
      }

      setNextCursor(response.nextCursor || null)
    } catch (err: any) {
      console.error("Failed to load notifications:", err)
      const errorMessage = err?.message || "Failed to load notifications"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const handleMarkRead = async (notificationId: string) => {
    if (!storeId) return

    try {
      await markRead(storeId, notificationId)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n))
      )
      toast.success("Marked as read")
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark as read")
    }
  }

  const handleMarkAllRead = async () => {
    if (!storeId) return

    setMarkingAllRead(true)
    try {
      await markAllRead(storeId)
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
      )
      toast.success("All notifications marked as read")
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark all as read")
    } finally {
      setMarkingAllRead(false)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    // Navigate based on notification type
    switch (notification.type) {
      case "CHANGE_REQUEST_UPDATED":
        router.push("/requests")
        break
      case "DOC_EXPIRING_SOON":
      case "DOC_EXPIRED":
        router.push("/documents")
        break
      case "AVAILABILITY_DEADLINE_SOON":
      case "SHIFT_REMINDER":
        router.push("/schedule")
        break
      default:
        // Stay on notifications page
        break
    }
  }

  const handleLoadMore = () => {
    if (nextCursor && !loadingMore) {
      loadNotifications(false)
    }
  }

  const handleApproveTimeEntry = async (timeEntryId: string) => {
    if (!storeId) return

    try {
      await reviewTimeEntry(storeId, timeEntryId, {
        status: "APPROVED",
      })
      toast.success("Time entry approved")
      // Reload notifications to update the list
      await loadNotifications(true)
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve time entry")
      throw err
    }
  }

  if (authLoading || !storeId) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 pl-64">
          <Topbar />
          <main className="p-6">
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  const unreadCount = notifications.filter((n) => !n.readAt).length

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 pl-64">
        <Topbar />
        <main className="p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Notifications</h1>
                <p className="text-muted-foreground mt-2">
                  {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up!"}
                </p>
              </div>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    onClick={handleMarkAllRead}
                    disabled={markingAllRead}
                  >
                    <CheckCheck className="h-4 w-4 mr-2" />
                    {markingAllRead ? "Marking..." : "Mark all as read"}
                  </Button>
                )}
                <Button variant="outline" size="icon" onClick={() => loadNotifications(true)} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-4">
            <NotificationFilters
              unreadOnly={unreadOnly}
              onUnreadOnlyChange={setUnreadOnly}
            />
          </div>

          {/* Error state */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Notifications list */}
          <NotificationList
            notifications={notifications}
            onMarkRead={handleMarkRead}
            onClick={handleNotificationClick}
            onApproveTimeEntry={handleApproveTimeEntry}
            loading={loading}
            emptyMessage={unreadOnly ? "You're all caught up!" : "No notifications"}
          />

          {/* Load more */}
          {nextCursor && !loading && (
            <div className="mt-4 text-center">
              <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

