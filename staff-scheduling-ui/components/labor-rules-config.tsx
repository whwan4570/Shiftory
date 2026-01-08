"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"
import type { LaborRules, UpdateLaborRulesDto } from "@/lib/api"
import { laborRulesApi } from "@/lib/api"

interface LaborRulesConfigProps {
  storeId: string
  userRole: "OWNER" | "MANAGER" | "WORKER"
}

export function LaborRulesConfig({ storeId, userRole }: LaborRulesConfigProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rules, setRules] = useState<LaborRules | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isOwner = userRole === "OWNER"

  useEffect(() => {
    if (storeId) {
      loadRules()
    }
  }, [storeId])

  const loadRules = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await laborRulesApi.getLaborRules(storeId)
      setRules(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load labor rules"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!rules) return

    setSaving(true)
    setError(null)

    try {
      const updateDto: UpdateLaborRulesDto = {
        overtimeDailyEnabled: rules.overtimeDailyEnabled,
        overtimeDailyMinutes: rules.overtimeDailyMinutes,
        overtimeWeeklyEnabled: rules.overtimeWeeklyEnabled,
        overtimeWeeklyMinutes: rules.overtimeWeeklyMinutes,
        breakPaid: rules.breakPaid,
        weekStartsOn: rules.weekStartsOn,
        availabilityDeadlineDays: rules.availabilityDeadlineDays || undefined,
        checkinPrimaryMethod: rules.checkinPrimaryMethod,
        checkinAllowFallback: rules.checkinAllowFallback,
        checkinGpsRadius: rules.checkinGpsRadius,
        checkinRequireBoth: rules.checkinRequireBoth,
        checkinWindowStartMins: rules.checkinWindowStartMins,
        checkinWindowEndMins: rules.checkinWindowEndMins,
        checkoutWindowStartMins: rules.checkoutWindowStartMins,
        checkoutWindowEndMins: rules.checkoutWindowEndMins,
        checkinNoShiftBehavior: rules.checkinNoShiftBehavior,
        checkinOfflineBehavior: rules.checkinOfflineBehavior,
      }

      const updated = await laborRulesApi.updateLaborRules(storeId, updateDto)
      setRules(updated)
      toast.success("Labor rules updated successfully")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update labor rules"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error && !rules) {
    return (
      <Card>
        <CardContent className="flex h-64 items-center justify-center">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!rules) return null

  const updateRule = <K extends keyof LaborRules>(key: K, value: LaborRules[K]) => {
    setRules({ ...rules, [key]: value })
  }

  return (
    <div className="space-y-6">
      {/* Overtime Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Overtime Rules</CardTitle>
          <CardDescription>Configure daily and weekly overtime limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Daily Overtime */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="overtimeDailyEnabled">Daily Overtime Tracking</Label>
              <Switch
                id="overtimeDailyEnabled"
                checked={rules.overtimeDailyEnabled}
                onCheckedChange={(checked) => updateRule("overtimeDailyEnabled", checked)}
                disabled={!isOwner}
              />
            </div>
            {rules.overtimeDailyEnabled && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="overtimeDailyMinutes">Daily Overtime Threshold (minutes)</Label>
                <Input
                  id="overtimeDailyMinutes"
                  type="number"
                  min="0"
                  value={rules.overtimeDailyMinutes}
                  onChange={(e) => updateRule("overtimeDailyMinutes", parseInt(e.target.value) || 0)}
                  disabled={!isOwner}
                />
                <p className="text-xs text-muted-foreground">
                  Default: 480 minutes (8 hours)
                </p>
              </div>
            )}
          </div>

          {/* Weekly Overtime */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="overtimeWeeklyEnabled">Weekly Overtime Tracking</Label>
              <Switch
                id="overtimeWeeklyEnabled"
                checked={rules.overtimeWeeklyEnabled}
                onCheckedChange={(checked) => updateRule("overtimeWeeklyEnabled", checked)}
                disabled={!isOwner}
              />
            </div>
            {rules.overtimeWeeklyEnabled && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="overtimeWeeklyMinutes">Weekly Overtime Threshold (minutes)</Label>
                <Input
                  id="overtimeWeeklyMinutes"
                  type="number"
                  min="0"
                  value={rules.overtimeWeeklyMinutes}
                  onChange={(e) => updateRule("overtimeWeeklyMinutes", parseInt(e.target.value) || 0)}
                  disabled={!isOwner}
                />
                <p className="text-xs text-muted-foreground">
                  Default: 2400 minutes (40 hours)
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Break Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Break Rules</CardTitle>
          <CardDescription>Configure break policies</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="breakPaid">Break Time is Paid</Label>
              <p className="text-xs text-muted-foreground mt-1">
                When enabled, break time counts toward paid hours
              </p>
            </div>
            <Switch
              id="breakPaid"
              checked={rules.breakPaid}
              onCheckedChange={(checked) => updateRule("breakPaid", checked)}
              disabled={!isOwner}
            />
          </div>
        </CardContent>
      </Card>

      {/* Schedule Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule Settings</CardTitle>
          <CardDescription>Configure scheduling preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="weekStartsOn">Week Starts On</Label>
            <Select
              value={String(rules.weekStartsOn)}
              onValueChange={(value) => updateRule("weekStartsOn", parseInt(value))}
              disabled={!isOwner}
            >
              <SelectTrigger id="weekStartsOn">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Sunday</SelectItem>
                <SelectItem value="1">Monday</SelectItem>
                <SelectItem value="2">Tuesday</SelectItem>
                <SelectItem value="3">Wednesday</SelectItem>
                <SelectItem value="4">Thursday</SelectItem>
                <SelectItem value="5">Friday</SelectItem>
                <SelectItem value="6">Saturday</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="availabilityDeadlineDays">Availability Deadline (days before month)</Label>
            <Input
              id="availabilityDeadlineDays"
              type="number"
              min="0"
              value={rules.availabilityDeadlineDays || ""}
              onChange={(e) => updateRule("availabilityDeadlineDays", e.target.value ? parseInt(e.target.value) : null)}
              placeholder="No deadline"
              disabled={!isOwner}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for no deadline
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Check-in Policy */}
      <Card>
        <CardHeader>
          <CardTitle>Check-in Policy</CardTitle>
          <CardDescription>Configure check-in and check-out settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="checkinPrimaryMethod">Primary Check-in Method</Label>
            <Select
              value={rules.checkinPrimaryMethod}
              onValueChange={(value) => updateRule("checkinPrimaryMethod", value)}
              disabled={!isOwner}
            >
              <SelectTrigger id="checkinPrimaryMethod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="QR">QR Code</SelectItem>
                <SelectItem value="GPS">GPS Location</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="checkinAllowFallback">Allow Fallback Method</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Allow using alternative method if primary fails
              </p>
            </div>
            <Switch
              id="checkinAllowFallback"
              checked={rules.checkinAllowFallback}
              onCheckedChange={(checked) => updateRule("checkinAllowFallback", checked)}
              disabled={!isOwner}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="checkinRequireBoth">Require Both Methods</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Require both QR code and GPS verification
              </p>
            </div>
            <Switch
              id="checkinRequireBoth"
              checked={rules.checkinRequireBoth}
              onCheckedChange={(checked) => updateRule("checkinRequireBoth", checked)}
              disabled={!isOwner}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="checkinGpsRadius">GPS Radius (meters)</Label>
            <Input
              id="checkinGpsRadius"
              type="number"
              min="0"
              step="0.01"
              value={rules.checkinGpsRadius}
              onChange={(e) => updateRule("checkinGpsRadius", parseFloat(e.target.value) || 0)}
              disabled={!isOwner}
            />
            <p className="text-xs text-muted-foreground">
              Default: 4828 meters (3 miles)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="checkinWindowStartMins">Check-in Window Start (minutes before shift)</Label>
              <Input
                id="checkinWindowStartMins"
                type="number"
                value={rules.checkinWindowStartMins}
                onChange={(e) => updateRule("checkinWindowStartMins", parseInt(e.target.value) || 0)}
                disabled={!isOwner}
              />
              <p className="text-xs text-muted-foreground">Default: -30</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkinWindowEndMins">Check-in Window End (minutes after shift start)</Label>
              <Input
                id="checkinWindowEndMins"
                type="number"
                value={rules.checkinWindowEndMins}
                onChange={(e) => updateRule("checkinWindowEndMins", parseInt(e.target.value) || 0)}
                disabled={!isOwner}
              />
              <p className="text-xs text-muted-foreground">Default: 10</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="checkoutWindowStartMins">Check-out Window Start (minutes before shift end)</Label>
              <Input
                id="checkoutWindowStartMins"
                type="number"
                value={rules.checkoutWindowStartMins}
                onChange={(e) => updateRule("checkoutWindowStartMins", parseInt(e.target.value) || 0)}
                disabled={!isOwner}
              />
              <p className="text-xs text-muted-foreground">Default: -10</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkoutWindowEndMins">Check-out Window End (minutes after shift end)</Label>
              <Input
                id="checkoutWindowEndMins"
                type="number"
                value={rules.checkoutWindowEndMins}
                onChange={(e) => updateRule("checkoutWindowEndMins", parseInt(e.target.value) || 0)}
                disabled={!isOwner}
              />
              <p className="text-xs text-muted-foreground">Default: 180</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="checkinNoShiftBehavior">Behavior when No Shift</Label>
            <Select
              value={rules.checkinNoShiftBehavior}
              onValueChange={(value) => updateRule("checkinNoShiftBehavior", value)}
              disabled={!isOwner}
            >
              <SelectTrigger id="checkinNoShiftBehavior">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BLOCK">Block Check-in</SelectItem>
                <SelectItem value="ALLOW_FLAG">Allow but Flag</SelectItem>
                <SelectItem value="ALLOW">Allow Check-in</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="checkinOfflineBehavior">Behavior when Offline</Label>
            <Select
              value={rules.checkinOfflineBehavior}
              onValueChange={(value) => updateRule("checkinOfflineBehavior", value)}
              disabled={!isOwner}
            >
              <SelectTrigger id="checkinOfflineBehavior">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BLOCK">Block Check-in</SelectItem>
                <SelectItem value="ALLOW_REQUEST">Allow with Request</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isOwner && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}

      {!isOwner && (
        <div className="rounded-lg border border-dashed p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Only store owners can modify labor rules
          </p>
        </div>
      )}
    </div>
  )
}
