"use client"

import { useMemo } from "react"
import Link from "next/link"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatMinutes } from "@/lib/reportsApi"
import { getMyWeeklySummary, getMyMonthlySummary } from "@/lib/reportsApi"
import { getShifts } from "@/lib/schedulingApi"
import { formatYMD, getWeekRange, getMonthRange } from "@/lib/date"
import { getStoreId } from "@/lib/api"
import { getWeekStartsOn } from "@/lib/settingsApi"
import { Clock, BarChart3, AlertCircle } from "lucide-react"

interface TodayShift {
  startTime: string
  endTime: string
}

interface TimeSummaryData {
  todayShift: TodayShift | null
  weeklyTotal: number | null
  weeklyOT: number | null
  monthlyTotal: number | null
  monthlyOT: number | null
}

// Fetcher function for SWR
async function fetchTimeSummary(storeId: string): Promise<TimeSummaryData> {
  const today = new Date()
  const todayYMD = formatYMD(today)

  // Get week starts on setting
  let weekStartsOn = 1
  try {
    weekStartsOn = await getWeekStartsOn(storeId)
  } catch (err) {
    console.error("Failed to load weekStartsOn:", err)
  }

  // Fetch all data in parallel
  const [shiftsResult, weeklySummaryResult, monthlySummaryResult] = await Promise.allSettled([
    // Get today's shift
    getShifts(storeId, todayYMD, todayYMD).then((shifts) => {
      const myShift = shifts.find((s) => !s.isCanceled && s.status === "PUBLISHED")
      return myShift
        ? {
            startTime: myShift.startTime,
            endTime: myShift.endTime,
          }
        : null
    }),
    // Get weekly summary
    (async () => {
      try {
        const weekRange = getWeekRange(today, weekStartsOn)
        const summary = await getMyWeeklySummary(storeId, weekRange.from, weekRange.to)
        return {
          total: summary.totalMins,
          overtime: summary.overtimeMins,
        }
      } catch (err) {
        console.error("Failed to load weekly summary:", err)
        return { total: null, overtime: null }
      }
    })(),
    // Get monthly summary
    (async () => {
      try {
        const monthRange = getMonthRange(today.getFullYear(), today.getMonth() + 1)
        const summary = await getMyMonthlySummary(storeId, today.getFullYear(), today.getMonth() + 1)
        return {
          total: summary.totalMins,
          overtime: summary.overtimeMins,
        }
      } catch (err) {
        console.error("Failed to load monthly summary:", err)
        return { total: null, overtime: null }
      }
    })(),
  ])

  const todayShift = shiftsResult.status === "fulfilled" ? shiftsResult.value : null
  const weeklySummary = weeklySummaryResult.status === "fulfilled" ? weeklySummaryResult.value : { total: null, overtime: null }
  const monthlySummary = monthlySummaryResult.status === "fulfilled" ? monthlySummaryResult.value : { total: null, overtime: null }

  return {
    todayShift,
    weeklyTotal: weeklySummary.total,
    weeklyOT: weeklySummary.overtime,
    monthlyTotal: monthlySummary.total,
    monthlyOT: monthlySummary.overtime,
  }
}

export function TimeSummaryCard({ collapsed }: { collapsed: boolean }) {
  const storeId = getStoreId()

  // Use SWR for data fetching with caching and retry
  const {
    data,
    error,
    isLoading,
    mutate, // For manual revalidation
  } = useSWR<TimeSummaryData>(
    storeId ? [`time-summary`, storeId] : null, // Key: only fetch if storeId exists
    ([, sid]) => fetchTimeSummary(sid), // Fetcher: receive key array, extract storeId
    {
      // SWR options
      revalidateOnFocus: true, // Revalidate when window gets focused
      revalidateOnReconnect: true, // Revalidate when network reconnects
      dedupingInterval: 60000, // Dedupe requests within 60 seconds
      refreshInterval: 300000, // Refresh every 5 minutes
      errorRetryCount: 3, // Retry up to 3 times on error
      errorRetryInterval: 5000, // Wait 5 seconds between retries
      shouldRetryOnError: (error) => {
        // Don't retry on 401/403 errors (auth errors)
        if (error?.message?.includes("401") || error?.message?.includes("403")) {
          return false
        }
        return true
      },
    }
  )

  const formatTime = useMemo(
    () => (time: string) => {
      // time is in HH:mm format
      const [hours, minutes] = time.split(":")
      const hour12 = parseInt(hours) % 12 || 12
      const ampm = parseInt(hours) >= 12 ? "PM" : "AM"
      return `${hour12}:${minutes} ${ampm}`
    },
    []
  )

  if (collapsed) {
    return null
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="p-4 border-t">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 border-t">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>Failed to load</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={() => mutate()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render data
  const { todayShift, weeklyTotal, weeklyOT, monthlyTotal, monthlyOT } = data || {
    todayShift: null,
    weeklyTotal: null,
    weeklyOT: null,
    monthlyTotal: null,
    monthlyOT: null,
  }

  return (
    <div className="p-4 border-t">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Time Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Today's Shift */}
          {todayShift ? (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Today's Shift</div>
              <div className="text-sm font-medium">
                {formatTime(todayShift.startTime)} - {formatTime(todayShift.endTime)}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Today's Shift</div>
              <div className="text-sm text-muted-foreground">No shift scheduled</div>
            </div>
          )}

          {/* Weekly Summary */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">This Week</div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {weeklyTotal !== null ? formatMinutes(weeklyTotal) : "—"}
              </span>
              {weeklyOT !== null && weeklyOT > 0 && (
                <Badge variant="secondary" className="text-xs">
                  OT: {formatMinutes(weeklyOT)}
                </Badge>
              )}
            </div>
          </div>

          {/* Monthly Summary */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">This Month</div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {monthlyTotal !== null ? formatMinutes(monthlyTotal) : "—"}
              </span>
              {monthlyOT !== null && monthlyOT > 0 && (
                <Badge variant="secondary" className="text-xs">
                  OT: {formatMinutes(monthlyOT)}
                </Badge>
              )}
            </div>
          </div>

          {/* Reports Link */}
          <Link href="/reports" className="block">
            <Button variant="outline" size="sm" className="w-full">
              <BarChart3 className="h-4 w-4 mr-2" />
              View Reports
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
