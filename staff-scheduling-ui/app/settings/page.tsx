"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sidebar } from "@/components/sidebar"
import { Topbar } from "@/components/topbar"
import { authApi, storesApi } from "@/lib/api"
import { getLaborRules, updateLaborRules, type LaborRules } from "@/lib/settingsApi"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"

export default function SettingsPage() {
  const router = useRouter()
  const { storeId, isAuthenticated, isLoading: authLoading } = useAuth()
  const [user, setUser] = useState<{
    id: string
    email: string
    name: string
  } | null>(null)
  const [laborRules, setLaborRules] = useState<LaborRules>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [userRole, setUserRole] = useState<"OWNER" | "MANAGER" | "WORKER" | null>(null)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return
    
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
      return
    }
    
    if (isAuthenticated && !authLoading) {
      loadUserData()
      if (storeId) {
        loadSettings()
        loadUserRole()
      }
    }
  }, [router, storeId, isAuthenticated, authLoading])

  const loadUserData = async () => {
    try {
      setIsLoading(true)
      const userData = await authApi.getMe()
      setUser(userData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user data")
      if (err instanceof Error && err.message.includes("401")) {
        router.push("/login")
      }
    } finally {
      setIsLoading(false)
    }
  }

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

  const loadSettings = async () => {
    if (!storeId) return
    try {
      const rules = await getLaborRules(storeId)
      setLaborRules(rules)
    } catch (err) {
      console.error("Failed to load settings:", err)
    }
  }

  const handleSaveLaborRules = async () => {
    if (!storeId) return

    try {
      setIsSaving(true)
      setError("")
      setSuccess("")

      await updateLaborRules(storeId, laborRules)
      toast.success("Labor rules saved successfully")
      setSuccess("Settings saved successfully")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save settings"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const isOwner = userRole === "OWNER"

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 pl-64">
          <Topbar />
          <main className="p-6">
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Loading settings...</p>
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
        <main className="p-6 max-w-4xl">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="mb-4 border-green-500 bg-green-50">
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
          </div>

          <Tabs defaultValue="profile" className="space-y-4">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
              {isOwner && <TabsTrigger value="labor-rules">Labor Rules</TabsTrigger>}
              {isOwner && <TabsTrigger value="checkin-policy">Check-in Policy</TabsTrigger>}
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Your account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={user?.name || ""}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">Name cannot be changed</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userId">User ID</Label>
                    <Input
                      id="userId"
                      value={user?.id || ""}
                      disabled
                      className="bg-muted font-mono text-xs"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences">
              <Card>
                <CardHeader>
                  <CardTitle>Preferences</CardTitle>
                  <CardDescription>Customize your experience</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="weekStartsOn">Week Starts On</Label>
                    <Select
                      value={String(laborRules.weekStartsOn ?? 1)}
                      onValueChange={(value) => {
                        setLaborRules({ ...laborRules, weekStartsOn: Number.parseInt(value, 10) })
                        handleSaveLaborRules()
                      }}
                      disabled={isSaving || !storeId || !isOwner}
                    >
                      <SelectTrigger id="weekStartsOn">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sunday</SelectItem>
                        <SelectItem value="1">Monday</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Choose which day your work week starts
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Labor Rules Tab (Owner only) */}
            {isOwner && (
              <TabsContent value="labor-rules">
                <Card>
                  <CardHeader>
                    <CardTitle>Labor Rules</CardTitle>
                    <CardDescription>
                      Configure overtime and break rules for your store
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Daily Overtime */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Daily Overtime</Label>
                          <p className="text-sm text-muted-foreground">
                            Enable daily overtime calculations
                          </p>
                        </div>
                        <Switch
                          checked={laborRules.overtimeDailyEnabled ?? false}
                          onCheckedChange={(checked) => {
                            setLaborRules({ ...laborRules, overtimeDailyEnabled: checked })
                          }}
                          disabled={isSaving}
                        />
                      </div>
                      {laborRules.overtimeDailyEnabled && (
                        <div className="space-y-2 pl-4">
                          <Label htmlFor="overtimeDailyMinutes">Daily Overtime Threshold (minutes)</Label>
                          <Input
                            id="overtimeDailyMinutes"
                            type="number"
                            min="0"
                            value={laborRules.overtimeDailyMinutes ?? 480}
                            onChange={(e) => {
                              setLaborRules({
                                ...laborRules,
                                overtimeDailyMinutes: Number.parseInt(e.target.value, 10) || 0,
                              })
                            }}
                            disabled={isSaving}
                          />
                          <p className="text-xs text-muted-foreground">
                            Hours worked beyond this threshold in a day will be counted as overtime (default: 8 hours = 480 minutes)
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Weekly Overtime */}
                    <div className="space-y-4 border-t pt-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Weekly Overtime</Label>
                          <p className="text-sm text-muted-foreground">
                            Enable weekly overtime calculations
                          </p>
                        </div>
                        <Switch
                          checked={laborRules.overtimeWeeklyEnabled ?? false}
                          onCheckedChange={(checked) => {
                            setLaborRules({ ...laborRules, overtimeWeeklyEnabled: checked })
                          }}
                          disabled={isSaving}
                        />
                      </div>
                      {laborRules.overtimeWeeklyEnabled && (
                        <div className="space-y-2 pl-4">
                          <Label htmlFor="overtimeWeeklyMinutes">Weekly Overtime Threshold (minutes)</Label>
                          <Input
                            id="overtimeWeeklyMinutes"
                            type="number"
                            min="0"
                            value={laborRules.overtimeWeeklyMinutes ?? 2400}
                            onChange={(e) => {
                              setLaborRules({
                                ...laborRules,
                                overtimeWeeklyMinutes: Number.parseInt(e.target.value, 10) || 0,
                              })
                            }}
                            disabled={isSaving}
                          />
                          <p className="text-xs text-muted-foreground">
                            Hours worked beyond this threshold in a week will be counted as overtime (default: 40 hours = 2400 minutes)
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Break Rules */}
                    <div className="space-y-4 border-t pt-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Paid Breaks</Label>
                          <p className="text-sm text-muted-foreground">
                            Breaks are paid (counted toward work hours)
                          </p>
                        </div>
                        <Switch
                          checked={laborRules.breakPaid ?? true}
                          onCheckedChange={(checked) => {
                            setLaborRules({ ...laborRules, breakPaid: checked })
                          }}
                          disabled={isSaving}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        When enabled, break time is included in total work hours. When disabled, break time is deducted from work hours.
                      </p>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-4 border-t">
                      <Button onClick={handleSaveLaborRules} disabled={isSaving || !storeId}>
                        {isSaving ? "Saving..." : "Save Labor Rules"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Check-in Policy Tab (Owner only) */}
            {isOwner && (
              <TabsContent value="checkin-policy">
                <Card>
                  <CardHeader>
                    <CardTitle>Check-in Policy</CardTitle>
                    <CardDescription>
                      Configure how employees check in and out
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Primary Method */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="checkinPrimaryMethod">Primary Method</Label>
                          <p className="text-xs text-muted-foreground">
                            Choose the primary check-in method
                          </p>
                        </div>
                        <Select
                          value={laborRules.checkinPrimaryMethod || 'GPS'}
                          onValueChange={(value) => {
                            setLaborRules({ ...laborRules, checkinPrimaryMethod: value as 'QR' | 'GPS' })
                          }}
                          disabled={isSaving}
                        >
                          <SelectTrigger id="checkinPrimaryMethod" className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="QR">QR Code</SelectItem>
                            <SelectItem value="GPS">GPS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Allow Fallback */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="checkinAllowFallback">Allow Fallback</Label>
                          <p className="text-xs text-muted-foreground">
                            Allow fallback to alternative method if primary fails
                          </p>
                        </div>
                        <Switch
                          id="checkinAllowFallback"
                          checked={laborRules.checkinAllowFallback ?? true}
                          onCheckedChange={(checked) => {
                            setLaborRules({ ...laborRules, checkinAllowFallback: checked })
                          }}
                          disabled={isSaving}
                        />
                      </div>
                    </div>

                    {/* GPS Radius */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="checkinGpsRadius">GPS Radius</Label>
                          <p className="text-xs text-muted-foreground">
                            Maximum distance from store location for GPS check-in
                          </p>
                        </div>
                        <Select
                          value={String(laborRules.checkinGpsRadius || 4828.032)}
                          onValueChange={(value) => {
                            const radiusMap: Record<string, number> = {
                              '50': 50,
                              '100': 100,
                              '200': 200,
                              '804.672': 804.672, // 0.5 miles
                              '1609.344': 1609.344, // 1 mile
                              '4828.032': 4828.032, // 3 miles
                            }
                            setLaborRules({ ...laborRules, checkinGpsRadius: radiusMap[value] })
                          }}
                          disabled={isSaving}
                        >
                          <SelectTrigger id="checkinGpsRadius" className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="50">50m</SelectItem>
                            <SelectItem value="100">100m</SelectItem>
                            <SelectItem value="200">200m</SelectItem>
                            <SelectItem value="804.672">0.5 mi</SelectItem>
                            <SelectItem value="1609.344">1 mi</SelectItem>
                            <SelectItem value="4828.032">3 mi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Require Both */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="checkinRequireBoth">Require Both (Advanced)</Label>
                          <p className="text-xs text-muted-foreground">
                            Require both QR and GPS for maximum security
                          </p>
                        </div>
                        <Switch
                          id="checkinRequireBoth"
                          checked={laborRules.checkinRequireBoth ?? false}
                          onCheckedChange={(checked) => {
                            setLaborRules({ ...laborRules, checkinRequireBoth: checked })
                          }}
                          disabled={isSaving}
                        />
                      </div>
                    </div>

                    {/* Time Windows */}
                    <div className="space-y-4 border-t pt-4">
                      <h3 className="text-sm font-semibold">Time Windows</h3>
                      
                      <div className="space-y-2">
                        <Label>Check-in Window</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={laborRules.checkinWindowStartMins ?? -30}
                            onChange={(e) => {
                              setLaborRules({ ...laborRules, checkinWindowStartMins: Number.parseInt(e.target.value, 10) || -30 })
                            }}
                            disabled={isSaving}
                            className="w-24"
                          />
                          <span className="text-sm text-muted-foreground">minutes before shift start</span>
                          <span className="text-sm">to</span>
                          <Input
                            type="number"
                            value={laborRules.checkinWindowEndMins ?? 10}
                            onChange={(e) => {
                              setLaborRules({ ...laborRules, checkinWindowEndMins: Number.parseInt(e.target.value, 10) || 10 })
                            }}
                            disabled={isSaving}
                            className="w-24"
                          />
                          <span className="text-sm text-muted-foreground">minutes after shift start</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Check-out Window</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={laborRules.checkoutWindowStartMins ?? -10}
                            onChange={(e) => {
                              setLaborRules({ ...laborRules, checkoutWindowStartMins: Number.parseInt(e.target.value, 10) || -10 })
                            }}
                            disabled={isSaving}
                            className="w-24"
                          />
                          <span className="text-sm text-muted-foreground">minutes before shift end</span>
                          <span className="text-sm">to</span>
                          <Input
                            type="number"
                            value={laborRules.checkoutWindowEndMins ?? 180}
                            onChange={(e) => {
                              setLaborRules({ ...laborRules, checkoutWindowEndMins: Number.parseInt(e.target.value, 10) || 180 })
                            }}
                            disabled={isSaving}
                            className="w-24"
                          />
                          <span className="text-sm text-muted-foreground">minutes after shift end</span>
                        </div>
                      </div>
                    </div>

                    {/* No Shift Behavior */}
                    <div className="space-y-4 border-t pt-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="checkinNoShiftBehavior">No-Shift Check-in Behavior</Label>
                          <p className="text-xs text-muted-foreground">
                            What to do when employee checks in without a scheduled shift
                          </p>
                        </div>
                        <Select
                          value={laborRules.checkinNoShiftBehavior || 'ALLOW_FLAG'}
                          onValueChange={(value) => {
                            setLaborRules({ ...laborRules, checkinNoShiftBehavior: value as 'BLOCK' | 'ALLOW_FLAG' | 'ALLOW' })
                          }}
                          disabled={isSaving}
                        >
                          <SelectTrigger id="checkinNoShiftBehavior" className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BLOCK">Block</SelectItem>
                            <SelectItem value="ALLOW_FLAG">Allow but Flag</SelectItem>
                            <SelectItem value="ALLOW">Allow</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Offline Behavior */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="checkinOfflineBehavior">Offline/Permission Denied Behavior</Label>
                          <p className="text-xs text-muted-foreground">
                            What to do when GPS permission is denied or unavailable
                          </p>
                        </div>
                        <Select
                          value={laborRules.checkinOfflineBehavior || 'ALLOW_REQUEST'}
                          onValueChange={(value) => {
                            setLaborRules({ ...laborRules, checkinOfflineBehavior: value as 'BLOCK' | 'ALLOW_REQUEST' })
                          }}
                          disabled={isSaving}
                        >
                          <SelectTrigger id="checkinOfflineBehavior" className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BLOCK">Block</SelectItem>
                            <SelectItem value="ALLOW_REQUEST">Allow Request</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-4 border-t">
                      <Button onClick={handleSaveLaborRules} disabled={isSaving || !storeId}>
                        {isSaving ? "Saving..." : "Save Check-in Policy"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </main>
      </div>
    </div>
  )
}
