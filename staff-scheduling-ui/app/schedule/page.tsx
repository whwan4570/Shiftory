"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sidebar } from "@/components/sidebar"
import { Topbar } from "@/components/topbar"
import { ScheduleCalendar } from "@/components/schedule-calendar"
import { ShiftCard } from "@/components/shift-card"
import { AvailabilityEditor } from "@/components/availability-editor"
import { AddShiftModal } from "@/components/modals/add-shift-modal"
import { CreateMonthModal } from "@/components/modals/create-month-modal"
import { CopyMonthModal } from "@/components/modals/copy-month-modal"
import { PublishConfirmationModal } from "@/components/modals/publish-confirmation-modal"
import { CreateRequestModal } from "@/components/modals/create-request-modal"
import { ChevronLeft, ChevronRight, Plus, AlertCircle, RefreshCw, Clock, Copy } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"
import { getShifts, publishMonth, getMonth, createMonth, copyMonth, type Shift, type ScheduleMonth } from "@/lib/schedulingApi"
import { listAvailability } from "@/lib/availabilityApi"
import type { Availability } from "@/types/availability"
import { storesApi, authApi } from "@/lib/api"
import {
  getMonthRange,
  getWeekRange,
  formatYMD,
  extractYMD,
  addMonths,
  formatWeekRange,
} from "@/lib/date"
import { getWeekStartsOn, setWeekStartsOn } from "@/lib/settingsApi"
import { toast } from "sonner"

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

type ViewMode = "MONTH" | "WEEK"
type ContentTab = "SHIFTS" | "AVAILABILITY"

/**
 * Group shifts by date (YYYY-MM-DD)
 */
function groupShiftsByDate(shifts: Shift[]): Record<string, Shift[]> {
  const grouped: Record<string, Shift[]> = {}
  if (!shifts || !Array.isArray(shifts)) {
    return grouped
  }
  for (const shift of shifts) {
    const dateKey = extractYMD(shift.date)
    if (!grouped[dateKey]) {
      grouped[dateKey] = []
    }
    grouped[dateKey].push(shift)
  }
  return grouped
}

/**
 * Group availability by date (YYYY-MM-DD)
 */
function groupAvailabilityByDate(availability: Availability[]): Record<string, Availability[]> {
  const grouped: Record<string, Availability[]> = {}
  if (!availability || !Array.isArray(availability)) {
    return grouped
  }
  for (const avail of availability) {
    const dateKey = extractYMD(avail.date)
    if (!grouped[dateKey]) {
      grouped[dateKey] = []
    }
    grouped[dateKey].push(avail)
  }
  return grouped
}

export default function SchedulePage() {
  const router = useRouter()
  const { storeId, isLoading: authLoading } = useAuth()
  const [viewMode, setViewMode] = useState<ViewMode>("MONTH")
  const [contentTab, setContentTab] = useState<ContentTab>("SHIFTS")
  // Initialize with next month
  const getNextMonth = () => {
    const nextMonth = addMonths(new Date().getFullYear(), new Date().getMonth() + 1, 1)
    return nextMonth
  }
  const nextMonth = getNextMonth()
  const [viewYear, setViewYear] = useState(nextMonth.year)
  const [viewMonth, setViewMonth] = useState(nextMonth.month)
  const [anchorDate, setAnchorDate] = useState<Date>(new Date()) // For WEEK view
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [availabilityList, setAvailabilityList] = useState<Availability[]>([])
  const [loading, setLoading] = useState(true)
  const [availLoading, setAvailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availError, setAvailError] = useState<string | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isCopying, setIsCopying] = useState(false)
  const [monthStatus, setMonthStatus] = useState<"OPEN" | "DRAFT" | "PUBLISHED" | "unknown">("unknown")
  const [monthExists, setMonthExists] = useState<boolean | null>(null)
  const [lockAt, setLockAt] = useState<string | null>(null)
  const [showCanceled, setShowCanceled] = useState(false)
  const [weekStartsOn, setWeekStartsOnState] = useState<number>(1)
  const [userRole, setUserRole] = useState<"OWNER" | "MANAGER" | "WORKER" | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userInfo, setUserInfo] = useState<{ id: string; email: string; name: string } | null>(null)
  const [shiftModalOpen, setShiftModalOpen] = useState(false)
  const [quickAddDate, setQuickAddDate] = useState<Date | null>(null)
  const [createMonthModalOpen, setCreateMonthModalOpen] = useState(false)
  const [copyMonthModalOpen, setCopyMonthModalOpen] = useState(false)
  const [publishModalOpen, setPublishModalOpen] = useState(false)
  const [requestChangeModalOpen, setRequestChangeModalOpen] = useState(false)
  const [selectedShiftForRequest, setSelectedShiftForRequest] = useState<Shift | null>(null)
  const [myShiftsForSwap, setMyShiftsForSwap] = useState<Shift[]>([])

  // Redirect if no storeId
  useEffect(() => {
    if (!authLoading && !storeId) {
      router.replace("/stores")
    }
  }, [storeId, authLoading, router])

  // Load user role and ID
  useEffect(() => {
    if (storeId && !authLoading) {
      loadUserRole()
    }
  }, [storeId, authLoading])

  // Load weekStartsOn setting
  useEffect(() => {
    if (storeId && !authLoading) {
      loadWeekStartsOn()
    }
  }, [storeId, authLoading])

  // Load month status when view changes
  useEffect(() => {
    if (storeId && !authLoading && viewMode === "MONTH") {
      loadMonthStatus()
    }
  }, [storeId, viewYear, viewMonth, viewMode, authLoading])

  // Load shifts and availability when view changes
  useEffect(() => {
    if (storeId && !authLoading) {
      loadShifts()
      loadAvailability()
    }
  }, [storeId, viewYear, viewMonth, viewMode, anchorDate, weekStartsOn, authLoading])

  // Initialize selected date
  useEffect(() => {
    if (!selectedDate) {
      const today = new Date()
      if (viewMode === "MONTH") {
        const isCurrentMonth = today.getFullYear() === viewYear && today.getMonth() + 1 === viewMonth
        setSelectedDate(isCurrentMonth ? today : new Date(viewYear, viewMonth - 1, 1))
      } else {
        // WEEK mode: use anchorDate or today
        setSelectedDate(anchorDate)
      }
    }
  }, [viewYear, viewMonth, viewMode, anchorDate, selectedDate])

  const loadUserRole = async () => {
    if (!storeId) return
    try {
      // Load user info to get userId
      try {
        const user = await authApi.getMe()
        setUserId(user.id)
      } catch (err) {
        console.error("Failed to load user info:", err)
      }

      // Load user role from stores
      const stores = await storesApi.getStores()
      if (stores && Array.isArray(stores)) {
        const store = stores.find((s) => s.id === storeId)
        if (store && store.role) {
          setUserRole(store.role as "OWNER" | "MANAGER" | "WORKER")
        } else {
          setUserRole("WORKER")
        }
      } else {
        setUserRole("WORKER")
      }
    } catch (err) {
      console.error("Failed to load user role:", err)
      setUserRole("WORKER")
    }
  }

  const loadWeekStartsOn = async () => {
    if (!storeId) return
    try {
      const value = await getWeekStartsOn(storeId)
      setWeekStartsOnState(value)
    } catch (err) {
      console.error("Failed to load weekStartsOn:", err)
      // Fallback to default (1 = Monday)
      setWeekStartsOnState(1)
    }
  }

  const loadMonthStatus = async () => {
    if (!storeId) return

    try {
      const month = await getMonth(storeId, viewYear, viewMonth)
      if (month) {
        setMonthExists(true)
        setMonthStatus(month.status)
        setLockAt(month.lockAt)
      } else {
        setMonthExists(false)
        setMonthStatus("unknown")
        setLockAt(null)
      }
    } catch (err: any) {
      // If 404, month doesn't exist
      if (err?.message?.includes("404") || err?.message?.includes("not found")) {
        setMonthExists(false)
        setMonthStatus("unknown")
        setLockAt(null)
      } else {
        console.error("Failed to load month status:", err)
        setMonthExists(null)
        setMonthStatus("unknown")
      }
    }
  }

  const loadShifts = async () => {
    if (!storeId) return

    setLoading(true)
    setError(null)

    try {
      let from: string
      let to: string

      if (viewMode === "MONTH") {
        const range = getMonthRange(viewYear, viewMonth)
        from = range.from
        to = range.to
      } else {
        // WEEK mode
        const range = getWeekRange(anchorDate, weekStartsOn)
        from = range.from
        to = range.to
      }

      const data = await getShifts(storeId, from, to)
      setShifts(data)

      // Load my shifts for SWAP feature (if userId is available)
      if (userId && viewMode === "MONTH") {
        const myShifts = data.filter((s) => s.userId === userId)
        setMyShiftsForSwap(myShifts)
      } else {
        setMyShiftsForSwap([])
      }
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to load shifts"
      setError(errorMessage)
      console.error("Failed to load shifts:", err)
    } finally {
      setLoading(false)
    }
  }

  const loadAvailability = async () => {
    if (!storeId) return

    setAvailLoading(true)
    setAvailError(null)

    try {
      // Only load for MONTH mode (availability is month-scoped)
      if (viewMode === "MONTH") {
        const data = await listAvailability(storeId, viewYear, viewMonth)
        setAvailabilityList(data)
      } else {
        // For WEEK mode, we could filter the month's availability
        // For now, load the month that contains the week
        const weekRange = getWeekRange(anchorDate, weekStartsOn)
        const weekStart = new Date(weekRange.from)
        const data = await listAvailability(
          storeId,
          weekStart.getFullYear(),
          weekStart.getMonth() + 1
        )
        setAvailabilityList(data)
      }
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to load availability"
      setAvailError(errorMessage)
      console.error("Failed to load availability:", err)
    } finally {
      setAvailLoading(false)
    }
  }

  const handlePrev = () => {
    if (viewMode === "MONTH") {
      const { year, month } = addMonths(viewYear, viewMonth, -1)
      setViewYear(year)
      setViewMonth(month)
      setSelectedDate(null)
    } else {
      // WEEK mode: subtract 7 days
      const newDate = new Date(anchorDate)
      newDate.setDate(anchorDate.getDate() - 7)
      setAnchorDate(newDate)
      setSelectedDate(newDate)
    }
  }

  const handleNext = () => {
    if (viewMode === "MONTH") {
      const { year, month } = addMonths(viewYear, viewMonth, 1)
      setViewYear(year)
      setViewMonth(month)
      setSelectedDate(null)
    } else {
      // WEEK mode: add 7 days
      const newDate = new Date(anchorDate)
      newDate.setDate(anchorDate.getDate() + 7)
      setAnchorDate(newDate)
      setSelectedDate(newDate)
    }
  }

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    if (mode === "WEEK" && !selectedDate) {
      setAnchorDate(new Date())
      setSelectedDate(new Date())
    }
  }

  const handleWeekStartsOnChange = (value: string) => {
    const newValue = Number.parseInt(value, 10)
    setWeekStartsOnState(newValue)
    setWeekStartsOn(newValue)
    // Reload shifts to recalculate week range
    if (viewMode === "WEEK") {
      loadShifts()
      loadAvailability()
    }
  }

  const handleCreateMonth = async () => {
    if (!storeId) return

    try {
      await loadMonthStatus()
      await loadShifts()
      await loadAvailability()
      toast.success("Month created successfully")
      setCreateMonthModalOpen(false)
    } catch (err) {
      console.error("Failed to refresh after creating month:", err)
    }
  }

  const handleCreateShift = async () => {
    try {
      // Reload shifts to show the newly created shift
      await loadShifts()
      toast.success("Shift created successfully")
    } catch (err: any) {
      console.error("Failed to refresh shifts:", err)
      const errorMessage = err?.message || "Failed to refresh shifts"
      toast.error(errorMessage)
    }
  }

  const handleAvailabilitySuccess = async () => {
    await loadAvailability()
  }

  const handlePublish = async () => {
    if (!storeId) return

    setIsPublishing(true)
    try {
      await publishMonth(storeId, viewYear, viewMonth)
      setMonthStatus("PUBLISHED")
      await loadMonthStatus() // Reload to get updated lockAt
      toast.success("Schedule published successfully")
      setPublishModalOpen(false)
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to publish schedule"
      if (errorMessage.includes("403") || errorMessage.includes("OWNER")) {
        toast.error("Only OWNER can publish schedules")
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setIsPublishing(false)
    }
  }

  const handleCopyMonth = async (fromYear: number, fromMonth: number) => {
    if (!storeId) return

    setIsCopying(true)
    try {
      const result = await copyMonth(storeId, {
        fromYear,
        fromMonth,
        toYear: viewYear,
        toMonth: viewMonth,
      })
      toast.success(`Copied ${result.copied} shifts from previous month`)
      await loadShifts()
      setCopyMonthModalOpen(false)
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to copy month"
      toast.error(errorMessage)
    } finally {
      setIsCopying(false)
    }
  }

  // Filter shifts
  const filteredShifts = shifts && Array.isArray(shifts)
    ? showCanceled
      ? shifts
      : shifts.filter((shift) => !shift.isCanceled)
    : []

  // Group shifts by date
  const shiftsByDate = filteredShifts.length > 0 ? groupShiftsByDate(filteredShifts) : {}

  // Group availability by date
  const availabilityByDate = availabilityList && Array.isArray(availabilityList) ? groupAvailabilityByDate(availabilityList) : {}

  // Get shifts for selected date
  const selectedDateKey = selectedDate ? formatYMD(selectedDate) : null
  const shiftsForSelectedDate = selectedDateKey ? shiftsByDate[selectedDateKey] || [] : []

  // Get my availability for selected date
  const myAvailabilityForSelectedDate =
    selectedDateKey && userId
      ? availabilityList.find(
          (avail) => extractYMD(avail.date) === selectedDateKey && avail.userId === userId
        ) || null
      : null

  // Get all availability for selected date (for admin view)
  const allAvailabilityForSelectedDate = selectedDateKey
    ? availabilityByDate[selectedDateKey] || []
    : []

  // Get week range for display
  const weekRange = viewMode === "WEEK" ? getWeekRange(anchorDate, weekStartsOn) : null

  // Get display label
  const displayLabel =
    viewMode === "MONTH"
      ? `${monthNames[viewMonth - 1]} ${viewYear}`
      : weekRange
      ? formatWeekRange(weekRange.from, weekRange.to)
      : "Select a week"

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

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 pl-64">
        <Topbar />
        <main className="p-6">
          {/* Header */}
          <div className="mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">Schedule</h1>
              <div className="flex items-center gap-2">
                {monthStatus !== "unknown" && (
                  <Badge
                    variant={
                      monthStatus === "PUBLISHED"
                        ? "default"
                        : monthStatus === "DRAFT"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {monthStatus}
                  </Badge>
                )}
                {monthStatus === "unknown" && viewMode === "MONTH" && (
                  <Badge variant="outline">Status: unknown</Badge>
                )}
                {viewMode === "MONTH" && (
                  <Button
                    onClick={() => setPublishModalOpen(true)}
                    disabled={monthStatus === "PUBLISHED" || isPublishing || monthExists === false}
                  >
                    {isPublishing ? "Publishing..." : "Publish Month"}
                  </Button>
                )}
              </div>
            </div>

            {/* Month not exists alert */}
            {viewMode === "MONTH" && monthExists === false && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>This month is not created yet. Create it to manage scheduling.</span>
                  <Button size="sm" onClick={() => setCreateMonthModalOpen(true)}>
                    Create Month
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* LockAt display */}
            {lockAt && (
              <Alert>
                <AlertDescription>
                  Availability deadline: {new Date(lockAt).toLocaleString()}
                </AlertDescription>
              </Alert>
            )}

            {/* View mode toggle and navigation */}
            <div className="flex items-center gap-4 flex-wrap">
              <Tabs value={viewMode} onValueChange={(v) => handleViewModeChange(v as ViewMode)}>
                <TabsList>
                  <TabsTrigger value="MONTH">Month</TabsTrigger>
                  <TabsTrigger value="WEEK">Week</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={handlePrev} disabled={loading || availLoading}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[200px] text-center font-semibold">{displayLabel}</span>
                <Button variant="outline" size="icon" onClick={handleNext} disabled={loading || availLoading}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Week starts on selector */}
              {viewMode === "WEEK" && (
                <div className="flex items-center gap-2">
                  <label htmlFor="weekStartsOn" className="text-sm text-muted-foreground">
                    Week starts on:
                  </label>
                  <Select value={String(weekStartsOn)} onValueChange={handleWeekStartsOnChange}>
                    <SelectTrigger id="weekStartsOn" className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sunday</SelectItem>
                      <SelectItem value="1">Monday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showCanceled"
                  checked={showCanceled}
                  onChange={(e) => setShowCanceled(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="showCanceled" className="text-sm text-muted-foreground cursor-pointer">
                  Show canceled
                </label>
              </div>

              {(userRole === "OWNER" || userRole === "MANAGER") && contentTab === "SHIFTS" && (
                <Button
                  onClick={() => {
                    setQuickAddDate(null)
                    setShiftModalOpen(true)
                  }}
                  disabled={monthStatus === "PUBLISHED" || (viewMode === "MONTH" && monthExists === false)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Shift
                </Button>
              )}

              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  loadShifts()
                  loadAvailability()
                }}
                disabled={loading || availLoading}
              >
                <RefreshCw className={`h-4 w-4 ${loading || availLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Error state */}
          {(error || availError) && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error || availError}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    loadShifts()
                    loadAvailability()
                  }}
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Loading state */}
          {(loading || availLoading) && shifts.length === 0 && availabilityList.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Loading...</p>
              </div>
            </div>
          ) : (
            /* Three-column layout */
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Left: Mini calendar or week days */}
              <div className="lg:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {viewMode === "MONTH" ? "Calendar" : "Week Days"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {viewMode === "MONTH" ? (
                      <ScheduleCalendar
                        year={viewYear}
                        month={viewMonth}
                        selectedDate={selectedDate || new Date()}
                        onSelectDate={setSelectedDate}
                        availabilityByDate={availabilityByDate}
                        userId={userId}
                      />
                    ) : (
                      <div className="space-y-2">
                        {weekRange?.days.map((day) => {
                          const dayKey = formatYMD(day)
                          const dayShifts = shiftsByDate[dayKey] || []
                          const dayAvailability = availabilityByDate[dayKey] || []
                          const myAvail = userId
                            ? dayAvailability.find((avail) => avail.userId === userId)
                            : null
                          const isSelected = selectedDate && formatYMD(selectedDate) === dayKey
                          return (
                            <button
                              key={dayKey}
                              onClick={() => setSelectedDate(day)}
                              className={`w-full text-left p-2 rounded border ${
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "hover:bg-muted"
                              }`}
                            >
                              <div className="font-medium flex items-center justify-between">
                                <span>
                                  {day.toLocaleDateString("en-US", { weekday: "short", day: "numeric" })}
                                </span>
                                {myAvail && (
                                  <Badge variant="outline" className="text-xs">
                                    Unavailable
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {dayShifts.length} shift{dayShifts.length !== 1 ? "s" : ""}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Middle: Shifts or Availability */}
              <div className="lg:col-span-5">
                <Card>
                  <CardHeader>
                    <Tabs value={contentTab} onValueChange={(v) => setContentTab(v as ContentTab)}>
                      <TabsList>
                        <TabsTrigger value="SHIFTS">Shifts</TabsTrigger>
                        <TabsTrigger value="AVAILABILITY">Availability</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={contentTab} onValueChange={(v) => setContentTab(v as ContentTab)}>
                      <TabsContent value="SHIFTS" className="mt-4">
                        <div className="space-y-2">
                          {shiftsForSelectedDate.length > 0 ? (
                            shiftsForSelectedDate.map((shift) => {
                              const isMyShift = shift.userId === userId
                              const isPublished = shift.status === "PUBLISHED"
                              const canRequestChange = isMyShift && isPublished && monthStatus === "PUBLISHED"

                              return (
                                <div key={shift.id} className="relative">
                                  <ShiftCard
                                    shift={{
                                      id: shift.id,
                                      employeeId: shift.userId,
                                      employeeName: shift.user?.name || "Unknown",
                                      date: extractYMD(shift.date),
                                      startTime: shift.startTime,
                                      endTime: shift.endTime,
                                      breakMinutes: shift.breakMins,
                                      status: shift.status,
                                    }}
                                    onSelect={() => {}}
                                  />
                                  {canRequestChange && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="mt-2 w-full"
                                      onClick={() => {
                                        setSelectedShiftForRequest(shift)
                                        setRequestChangeModalOpen(true)
                                      }}
                                    >
                                      Request Change
                                    </Button>
                                  )}
                                </div>
                              )
                            })
                          ) : (
                            <div className="rounded-lg border border-dashed p-12 text-center">
                              <p className="text-sm text-muted-foreground mb-4">
                                {selectedDate
                                  ? "No shifts scheduled for this day."
                                  : "Select a date to view shifts."}
                              </p>
                              {selectedDate &&
                                monthStatus !== "PUBLISHED" &&
                                !(viewMode === "MONTH" && monthExists === false) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-transparent"
                                    onClick={() => setShiftModalOpen(true)}
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Shift
                                  </Button>
                                )}
                              {monthStatus === "PUBLISHED" && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  This month is published. Changes require approval.
                                </p>
                              )}
                              {viewMode === "MONTH" && monthExists === false && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Create the month first to add shifts.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </TabsContent>
                      <TabsContent value="AVAILABILITY" className="mt-4">
                        <AvailabilityEditor
                          storeId={storeId!}
                          year={viewYear}
                          month={viewMonth}
                          selectedDate={selectedDate}
                          currentAvailability={myAvailabilityForSelectedDate}
                          lockAt={lockAt}
                          monthStatus={monthStatus}
                          onSuccess={handleAvailabilitySuccess}
                          userId={userId || undefined}
                        />
                        {/* Admin view: Show all unavailable people */}
                        {(userRole === "OWNER" || userRole === "MANAGER") &&
                          allAvailabilityForSelectedDate.length > 0 && (
                            <div className="mt-6 pt-6 border-t">
                              <h3 className="text-sm font-medium mb-3">Unavailable Team Members</h3>
                              <div className="space-y-2">
                                {allAvailabilityForSelectedDate.map((avail) => (
                                  <div
                                    key={avail.id}
                                    className="flex items-center justify-between p-2 rounded border"
                                  >
                                    <div>
                                      <p className="text-sm font-medium">
                                        {avail.user?.name || "Unknown"}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {avail.startTime && avail.endTime
                                          ? `${avail.startTime} - ${avail.endTime}`
                                          : "All day"}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Shift details placeholder */}
              <div className="lg:col-span-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border border-dashed p-12 text-center">
                      <p className="text-sm text-muted-foreground">
                        {contentTab === "SHIFTS"
                          ? "Select a shift to view details"
                          : "Availability information"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <AddShiftModal
        open={shiftModalOpen}
        onOpenChange={(open) => {
          setShiftModalOpen(open)
          if (!open) {
            setQuickAddDate(null)
          }
        }}
        storeId={storeId!}
        year={viewYear}
        month={viewMonth}
        defaultDate={quickAddDate || selectedDate || undefined}
        onSuccess={handleCreateShift}
        isPublished={monthStatus === "PUBLISHED"}
      />
      <CreateMonthModal
        open={createMonthModalOpen}
        onOpenChange={setCreateMonthModalOpen}
        storeId={storeId!}
        year={viewYear}
        month={viewMonth}
        onSuccess={handleCreateMonth}
      />
      <CopyMonthModal
        open={copyMonthModalOpen}
        onOpenChange={setCopyMonthModalOpen}
        storeId={storeId!}
        toYear={viewYear}
        toMonth={viewMonth}
        onCopy={handleCopyMonth}
        isCopying={isCopying}
      />
      <PublishConfirmationModal
        open={publishModalOpen}
        onOpenChange={setPublishModalOpen}
        onConfirm={handlePublish}
      />
      {selectedShiftForRequest && (
        <CreateRequestModal
          open={requestChangeModalOpen}
          onOpenChange={setRequestChangeModalOpen}
          storeId={storeId!}
          shift={{
            id: selectedShiftForRequest.id,
            date: selectedShiftForRequest.date,
            startTime: selectedShiftForRequest.startTime,
            endTime: selectedShiftForRequest.endTime,
            breakMins: selectedShiftForRequest.breakMins,
          }}
          myShifts={myShiftsForSwap}
          allShifts={shifts.filter((s) => s.id !== selectedShiftForRequest.id)}
          onSuccess={() => {
            toast.success("Change request submitted. You can view it in the Requests page.")
            loadShifts() // Refresh to see any updates
          }}
        />
      )}
    </div>
  )
}
