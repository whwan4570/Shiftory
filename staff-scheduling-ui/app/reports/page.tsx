"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Sidebar } from "@/components/sidebar"
import { Topbar } from "@/components/topbar"
import { useAuth } from "@/hooks/useAuth"
import {
  getMyWeeklySummary,
  getMyMonthlySummary,
  getStaffMonthlySummary,
  formatMinutes,
  minutesToDecimalHours,
  type WeeklySummary,
  type MonthlySummary,
  type StaffMonthlySummary,
} from "@/lib/reportsApi"
import { storesApi } from "@/lib/api"
import { getWeekStartsOn } from "@/lib/settingsApi"
import { getWeekRange, formatYMD, addMonths } from "@/lib/date"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, AlertCircle, RefreshCw, Download } from "lucide-react"
import { downloadCSV, formatMinutesForCSV, formatDateForCSV } from "@/lib/csvExport"

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

type ReportTab = "WEEKLY" | "MONTHLY" | "STAFF"

export default function ReportsPage() {
  const router = useRouter()
  const { storeId, isLoading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<ReportTab>("WEEKLY")
  const [userRole, setUserRole] = useState<"OWNER" | "MANAGER" | "WORKER" | null>(null)
  const [weekStartsOn, setWeekStartsOn] = useState<number>(1)

  // Weekly state
  const [weekAnchor, setWeekAnchor] = useState<Date>(new Date())
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null)
  const [loadingWeekly, setLoadingWeekly] = useState(false)

  // Monthly state
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1)
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null)
  const [loadingMonthly, setLoadingMonthly] = useState(false)

  // Staff monthly state
  const [staffSummary, setStaffSummary] = useState<StaffMonthlySummary | null>(null)
  const [loadingStaff, setLoadingStaff] = useState(false)

  const [error, setError] = useState<string | null>(null)

  // Redirect if no storeId
  useEffect(() => {
    if (!authLoading && !storeId) {
      router.replace("/stores")
    }
  }, [storeId, authLoading, router])

  // Load user role and weekStartsOn
  useEffect(() => {
    if (storeId && !authLoading) {
      loadUserRole()
      loadWeekStartsOn()
    }
  }, [storeId, authLoading])

  // Load weekly summary
  useEffect(() => {
    if (storeId && !authLoading && activeTab === "WEEKLY") {
      loadWeeklySummary()
    }
  }, [storeId, authLoading, activeTab, weekAnchor, weekStartsOn])

  // Load monthly summary
  useEffect(() => {
    if (storeId && !authLoading && activeTab === "MONTHLY") {
      loadMonthlySummary()
    }
  }, [storeId, authLoading, activeTab, viewYear, viewMonth])

  // Load staff monthly summary
  useEffect(() => {
    if (storeId && !authLoading && activeTab === "STAFF" && (userRole === "OWNER" || userRole === "MANAGER")) {
      loadStaffSummary()
    }
  }, [storeId, authLoading, activeTab, viewYear, viewMonth, userRole])

  const loadUserRole = async () => {
    if (!storeId) return
    try {
      const stores = await storesApi.getStores()
      const store = stores.find((s) => s.id === storeId)
      if (store && store.role) {
        setUserRole(store.role as "OWNER" | "MANAGER" | "WORKER")
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
      setWeekStartsOn(value)
    } catch (err) {
      console.error("Failed to load weekStartsOn:", err)
      setWeekStartsOn(1) // Default to Monday
    }
  }

  const loadWeeklySummary = async () => {
    if (!storeId) return

    setLoadingWeekly(true)
    setError(null)

    try {
      const weekRange = getWeekRange(weekAnchor, weekStartsOn)
      const summary = await getMyWeeklySummary(storeId, weekRange.from, weekRange.to)
      setWeeklySummary(summary)
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to load weekly summary"
      setError(errorMessage)
      console.error("Failed to load weekly summary:", err)
    } finally {
      setLoadingWeekly(false)
    }
  }

  const loadMonthlySummary = async () => {
    if (!storeId) return

    setLoadingMonthly(true)
    setError(null)

    try {
      const summary = await getMyMonthlySummary(storeId, viewYear, viewMonth)
      setMonthlySummary(summary)
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to load monthly summary"
      setError(errorMessage)
      console.error("Failed to load monthly summary:", err)
    } finally {
      setLoadingMonthly(false)
    }
  }

  const loadStaffSummary = async () => {
    if (!storeId) return

    setLoadingStaff(true)
    setError(null)

    try {
      const summary = await getStaffMonthlySummary(storeId, viewYear, viewMonth)
      setStaffSummary(summary)
    } catch (err: any) {
      if (err?.message?.includes("403") || err?.statusCode === 403) {
        // Hide staff tab if not authorized
        setError("You don't have permission to view staff reports")
      } else {
        const errorMessage = err?.message || "Failed to load staff summary"
        setError(errorMessage)
      }
      console.error("Failed to load staff summary:", err)
    } finally {
      setLoadingStaff(false)
    }
  }

  const handlePrevWeek = () => {
    const newDate = new Date(weekAnchor)
    newDate.setDate(weekAnchor.getDate() - 7)
    setWeekAnchor(newDate)
  }

  const handleNextWeek = () => {
    const newDate = new Date(weekAnchor)
    newDate.setDate(weekAnchor.getDate() + 7)
    setWeekAnchor(newDate)
  }

  const handlePrevMonth = () => {
    const { year, month } = addMonths(viewYear, viewMonth, -1)
    setViewYear(year)
    setViewMonth(month)
  }

  const handleNextMonth = () => {
    const { year, month } = addMonths(viewYear, viewMonth, 1)
    setViewYear(year)
    setViewMonth(month)
  }

  const weekRange = getWeekRange(weekAnchor, weekStartsOn)

  const handleExportWeeklyCSV = () => {
    if (!weeklySummary) return

    const currentWeekRange = getWeekRange(weekAnchor, weekStartsOn)
    const headers = ["Date", "Paid Hours", "Overtime"]
    const rows = weeklySummary.byDay.map((day) => [
      formatDateForCSV(day.date),
      formatMinutesForCSV(day.paidMins),
      formatMinutesForCSV(day.overtimeMins),
    ])
    
    // Add totals row
    rows.push([
      "Total",
      formatMinutesForCSV(weeklySummary.paidMins),
      formatMinutesForCSV(weeklySummary.overtimeMins),
    ])

    const filename = `weekly-report-${formatDateForCSV(currentWeekRange.from)}-to-${formatDateForCSV(currentWeekRange.to)}.csv`
    downloadCSV({ headers, rows }, filename)
  }

  const handleExportMonthlyCSV = () => {
    if (!monthlySummary) return

    const headers = ["Metric", "Value"]
    const rows = [
      ["Total Hours", formatMinutesForCSV(monthlySummary.totalMins)],
      ["Paid Hours", formatMinutesForCSV(monthlySummary.paidMins)],
      ["Break Total", formatMinutesForCSV(monthlySummary.breakMins)],
      ["Overtime", formatMinutesForCSV(monthlySummary.overtimeMins)],
    ]

    const filename = `monthly-report-${viewYear}-${String(viewMonth).padStart(2, "0")}.csv`
    downloadCSV({ headers, rows }, filename)
  }

  const handleExportStaffCSV = () => {
    if (!staffSummary) return

    const headers = ["Employee", "Email", "Total Hours", "Paid Hours", "Break Total", "Overtime"]
    const rows = staffSummary.users.map((user) => [
      user.userName,
      user.userEmail,
      formatMinutesForCSV(user.totalMins),
      formatMinutesForCSV(user.paidMins),
      formatMinutesForCSV(user.breakMins),
      formatMinutesForCSV(user.overtimeMins),
    ])

    const filename = `staff-report-${viewYear}-${String(viewMonth).padStart(2, "0")}.csv`
    downloadCSV({ headers, rows }, filename)
  }

  const weekRange = getWeekRange(weekAnchor, weekStartsOn)
  const weekLabel = `Week of ${new Date(weekRange.from).toLocaleDateString()} - ${new Date(weekRange.to).toLocaleDateString()}`

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

  const isManagerOrOwner = userRole === "OWNER" || userRole === "MANAGER"

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 pl-64">
        <Topbar />
        <main className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Reports</h1>
            <p className="text-muted-foreground mt-2">View hours and overtime summaries</p>
          </div>

          {/* Error state */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportTab)} className="mb-6">
            <TabsList>
              <TabsTrigger value="WEEKLY">My Weekly</TabsTrigger>
              <TabsTrigger value="MONTHLY">My Monthly</TabsTrigger>
              {isManagerOrOwner && <TabsTrigger value="STAFF">Staff Monthly</TabsTrigger>}
            </TabsList>
          </Tabs>

          {/* Weekly Summary */}
          <TabsContent value="WEEKLY" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={handlePrevWeek} disabled={loadingWeekly}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-semibold min-w-[300px] text-center">{weekLabel}</span>
                <Button variant="outline" size="icon" onClick={handleNextWeek} disabled={loadingWeekly}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleExportWeeklyCSV}
                  disabled={!weeklySummary || loadingWeekly}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" size="icon" onClick={loadWeeklySummary} disabled={loadingWeekly}>
                  <RefreshCw className={`h-4 w-4 ${loadingWeekly ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {loadingWeekly ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : weeklySummary ? (
              <div className="space-y-4">
                {/* Summary cards */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatMinutes(weeklySummary.totalMins)}</div>
                      <p className="text-xs text-muted-foreground">
                        {minutesToDecimalHours(weeklySummary.totalMins)}h
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Paid Hours</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatMinutes(weeklySummary.paidMins)}</div>
                      <p className="text-xs text-muted-foreground">
                        {minutesToDecimalHours(weeklySummary.paidMins)}h
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Break Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatMinutes(weeklySummary.breakMins)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Overtime</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatMinutes(weeklySummary.overtimeMins)}</div>
                      <p className="text-xs text-muted-foreground">
                        {minutesToDecimalHours(weeklySummary.overtimeMins)}h
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Daily breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Paid Hours</TableHead>
                          <TableHead>Overtime</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {weeklySummary.byDay.map((day) => (
                          <TableRow key={day.date}>
                            <TableCell>{new Date(day.date).toLocaleDateString()}</TableCell>
                            <TableCell>{formatMinutes(day.paidMins)}</TableCell>
                            <TableCell>{formatMinutes(day.overtimeMins)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold">
                          <TableCell>Total</TableCell>
                          <TableCell>{formatMinutes(weeklySummary.paidMins)}</TableCell>
                          <TableCell>{formatMinutes(weeklySummary.overtimeMins)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No data available</div>
            )}
          </TabsContent>

          {/* Monthly Summary */}
          <TabsContent value="MONTHLY" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={handlePrevMonth} disabled={loadingMonthly}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-semibold min-w-[200px] text-center">
                  {monthNames[viewMonth - 1]} {viewYear}
                </span>
                <Button variant="outline" size="icon" onClick={handleNextMonth} disabled={loadingMonthly}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleExportMonthlyCSV}
                  disabled={!monthlySummary || loadingMonthly}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" size="icon" onClick={loadMonthlySummary} disabled={loadingMonthly}>
                  <RefreshCw className={`h-4 w-4 ${loadingMonthly ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {loadingMonthly ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : monthlySummary ? (
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatMinutes(monthlySummary.totalMins)}</div>
                    <p className="text-xs text-muted-foreground">
                      {minutesToDecimalHours(monthlySummary.totalMins)}h
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Paid Hours</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatMinutes(monthlySummary.paidMins)}</div>
                    <p className="text-xs text-muted-foreground">
                      {minutesToDecimalHours(monthlySummary.paidMins)}h
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Break Total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatMinutes(monthlySummary.breakMins)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Overtime</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatMinutes(monthlySummary.overtimeMins)}</div>
                    <p className="text-xs text-muted-foreground">
                      {minutesToDecimalHours(monthlySummary.overtimeMins)}h
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No data available</div>
            )}
          </TabsContent>

          {/* Staff Monthly Summary */}
          {isManagerOrOwner && (
            <TabsContent value="STAFF" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={handlePrevMonth} disabled={loadingStaff}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-semibold min-w-[200px] text-center">
                    {monthNames[viewMonth - 1]} {viewYear}
                  </span>
                  <Button variant="outline" size="icon" onClick={handleNextMonth} disabled={loadingStaff}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleExportStaffCSV}
                    disabled={!staffSummary || loadingStaff}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button variant="outline" size="icon" onClick={loadStaffSummary} disabled={loadingStaff}>
                    <RefreshCw className={`h-4 w-4 ${loadingStaff ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>

              {loadingStaff ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : staffSummary ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Staff Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Total Hours</TableHead>
                          <TableHead>Paid Hours</TableHead>
                          <TableHead>Break Total</TableHead>
                          <TableHead>Overtime</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {staffSummary.users.map((user) => (
                          <TableRow key={user.userId}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{user.userName}</div>
                                <div className="text-xs text-muted-foreground">{user.userEmail}</div>
                              </div>
                            </TableCell>
                            <TableCell>{formatMinutes(user.totalMins)}</TableCell>
                            <TableCell>{formatMinutes(user.paidMins)}</TableCell>
                            <TableCell>{formatMinutes(user.breakMins)}</TableCell>
                            <TableCell>
                              {user.overtimeMins > 0 ? (
                                <Badge variant="destructive">{formatMinutes(user.overtimeMins)}</Badge>
                              ) : (
                                formatMinutes(user.overtimeMins)
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No data available</div>
              )}
            </TabsContent>
          )}
        </main>
      </div>
    </div>
  )
}

