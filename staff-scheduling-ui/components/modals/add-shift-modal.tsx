"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { formatYMD, extractYMD, compareTimes } from "@/lib/date"
import { membershipsApi } from "@/lib/api"
import type { Member } from "@/lib/types"

interface AddShiftModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  year: number
  month: number
  defaultDate?: Date
  onSuccess?: () => void
  isPublished?: boolean
}

export function AddShiftModal({
  open,
  onOpenChange,
  storeId,
  year,
  month,
  defaultDate,
  onSuccess,
  isPublished = false,
}: AddShiftModalProps) {
  const [step, setStep] = useState<"selectEmployee" | "setTime">("selectEmployee")
  const [userId, setUserId] = useState("")
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [date, setDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [breakMins, setBreakMins] = useState("0")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [members, setMembers] = useState<Member[]>([])

  // Load members when modal opens
  useEffect(() => {
    if (open && storeId) {
      loadMembers()
    }
  }, [open, storeId])

  // Set default date when modal opens
  useEffect(() => {
    if (open && defaultDate) {
      setDate(formatYMD(defaultDate))
    }
    // Reset step when modal opens
    if (open) {
      setStep("selectEmployee")
      setUserId("")
      setSelectedMember(null)
      setStartTime("")
      setEndTime("")
      setBreakMins("0")
      setError("")
    }
  }, [open, defaultDate])

  const handleEmployeeSelect = (member: Member) => {
    setUserId(member.id)
    setSelectedMember(member)
    setStep("setTime")
    setError("")
  }

  const loadMembers = async () => {
    try {
      const data = await membershipsApi.getStoreMembers(storeId)
      const formattedMembers: Member[] = data.map((membership) => ({
        id: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
        role: membership.role,
        status: "ACTIVE" as const,
      }))
      setMembers(formattedMembers)
    } catch (err) {
      console.error("Failed to load members:", err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validation
    if (!userId) {
      setError("Please select an employee")
      return
    }

    if (!date) {
      setError("Please select a date")
      return
    }

    if (!startTime || !endTime) {
      setError("Please enter both start and end times")
      return
    }

    // Validate time format (HH:mm)
    const timePattern = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
    if (!timePattern.test(startTime) || !timePattern.test(endTime)) {
      setError("Time must be in HH:mm format")
      return
    }

    // Validate endTime > startTime
    if (compareTimes(endTime, startTime) <= 0) {
      setError("End time must be after start time")
      return
    }

    setIsLoading(true)
    try {
      const { createShift } = await import("@/lib/schedulingApi")
      await createShift(storeId, year, month, {
        userId,
        date: extractYMD(date),
        startTime,
        endTime,
        breakMins: Number.parseInt(breakMins) || 0,
      })

      // Reset form
      setUserId("")
      setSelectedMember(null)
      setDate(defaultDate ? formatYMD(defaultDate) : "")
      setStartTime("")
      setEndTime("")
      setBreakMins("0")
      setError("")
      setStep("selectEmployee")

      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to create shift"
      if (errorMessage.includes("403") || errorMessage.includes("published")) {
        setError("Month is published. Changes require approval.")
      } else {
        setError(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setError("")
      setStep("selectEmployee")
      setUserId("")
      setSelectedMember(null)
      onOpenChange(false)
    }
  }

  const handleBack = () => {
    setStep("selectEmployee")
    setError("")
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {step === "selectEmployee" ? "Select Employee" : "Set Shift Time"}
            </DialogTitle>
            <DialogDescription>
              {step === "selectEmployee" 
                ? `Select an employee to create a shift${defaultDate ? ` for ${formatYMD(defaultDate)}` : ""}.`
                : `Set working hours for ${selectedMember?.name || "employee"}.`
              }
              {isPublished && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This month is published. Changes require approval.
                  </AlertDescription>
                </Alert>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {step === "selectEmployee" ? (
              <div className="space-y-2">
                <Label>Select Employee</Label>
                {members.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading members...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto">
                    {members.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => handleEmployeeSelect(member)}
                        disabled={isPublished}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent hover:border-primary transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {member.role}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    disabled={isPublished}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      disabled={isPublished}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      disabled={isPublished}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="breakMins">Break Minutes</Label>
                  <Input
                    id="breakMins"
                    type="number"
                    min="0"
                    step="15"
                    value={breakMins}
                    onChange={(e) => setBreakMins(e.target.value)}
                    required
                    disabled={isPublished}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter break time in minutes (e.g., 30 for 30 minutes)
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            {step === "setTime" && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isLoading}
              >
                Back
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            {step === "setTime" && (
              <Button type="submit" disabled={isLoading || isPublished}>
                {isLoading ? "Creating..." : "Create Shift"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

