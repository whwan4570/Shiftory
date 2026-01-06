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
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { createRequest } from "@/lib/requestsApi"
import { compareTimes } from "@/lib/date"
import type { ChangeRequestType } from "@/types/requests"
import type { Shift } from "@/lib/types"

interface CreateRequestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  shift: {
    id: string
    date: string
    startTime: string
    endTime: string
    breakMins: number
  }
  myShifts?: Shift[] // For SWAP request - other shifts in the same month (deprecated, use allShifts)
  allShifts?: Shift[] // For SWAP request - all shifts in the same month from all employees
  onSuccess: () => void
}

export function CreateRequestModal({
  open,
  onOpenChange,
  storeId,
  shift,
  myShifts = [],
  allShifts = [],
  onSuccess,
}: CreateRequestModalProps) {
  const [requestType, setRequestType] = useState<ChangeRequestType>("SHIFT_TIME_CHANGE")
  const [proposedStartTime, setProposedStartTime] = useState(shift.startTime)
  const [proposedEndTime, setProposedEndTime] = useState(shift.endTime)
  const [proposedBreakMins, setProposedBreakMins] = useState(String(shift.breakMins))
  const [swapShiftId, setSwapShiftId] = useState("")
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setRequestType("SHIFT_TIME_CHANGE")
      setProposedStartTime(shift.startTime)
      setProposedEndTime(shift.endTime)
      setProposedBreakMins(String(shift.breakMins))
      setSwapShiftId("")
      setReason("")
      setError("")
      setIsLoading(false)
    }
  }, [open, shift])

  const validateForm = () => {
    if (requestType === "SHIFT_TIME_CHANGE") {
      if (!proposedStartTime || !proposedEndTime) {
        setError("Start time and end time are required")
        return false
      }

      const timePattern = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
      if (!timePattern.test(proposedStartTime) || !timePattern.test(proposedEndTime)) {
        setError("Time must be in HH:mm format")
        return false
      }

      if (compareTimes(proposedEndTime, proposedStartTime) <= 0) {
        setError("End time must be after start time")
        return false
      }

      if (Number.parseInt(proposedBreakMins) < 0) {
        setError("Break minutes cannot be negative")
        return false
      }
    }

    if (requestType === "SHIFT_SWAP_REQUEST") {
      if (!swapShiftId) {
        setError("Please select or enter a swap shift ID")
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    try {
      const payload: {
        type: ChangeRequestType
        shiftId: string
        reason?: string
        proposedStartTime?: string
        proposedEndTime?: string
        proposedBreakMins?: number
        swapShiftId?: string
      } = {
        type: requestType,
        shiftId: shift.id,
        reason: reason || undefined,
      }

      if (requestType === "SHIFT_TIME_CHANGE") {
        payload.proposedStartTime = proposedStartTime
        payload.proposedEndTime = proposedEndTime
        payload.proposedBreakMins = Number.parseInt(proposedBreakMins)
      }

      if (requestType === "SHIFT_SWAP_REQUEST") {
        payload.swapShiftId = swapShiftId
      }

      await createRequest(storeId, payload)
      toast.success("Request submitted successfully")
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      console.error("Failed to create change request:", err)
      const errorMessage = err?.message || "Failed to submit change request"
      if (errorMessage.includes("409") || errorMessage.includes("already")) {
        setError("There is already a pending request for this shift.")
      } else if (errorMessage.includes("403")) {
        setError("You don't have permission to create change requests for this shift.")
      } else {
        setError(errorMessage)
      }
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const typeLabels: Record<ChangeRequestType, string> = {
    SHIFT_TIME_CHANGE: "Time Change",
    SHIFT_DROP_REQUEST: "Drop Request",
    SHIFT_COVER_REQUEST: "Cover Request",
    SHIFT_SWAP_REQUEST: "Swap Request",
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Request Change</DialogTitle>
            <DialogDescription>
              Submit a change request for this shift. A manager will review your request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && <p className="text-sm text-red-500">{error}</p>}

            {/* Request type selector */}
            <div className="space-y-2">
              <Label>Request Type</Label>
              <Tabs value={requestType} onValueChange={(v) => setRequestType(v as ChangeRequestType)}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="SHIFT_TIME_CHANGE">Time</TabsTrigger>
                  <TabsTrigger value="SHIFT_DROP_REQUEST">Drop</TabsTrigger>
                  <TabsTrigger value="SHIFT_COVER_REQUEST">Cover</TabsTrigger>
                  <TabsTrigger value="SHIFT_SWAP_REQUEST">Swap</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Current shift info */}
            <div className="space-y-2 p-3 bg-muted rounded">
              <Label className="text-xs">Current Shift</Label>
              <p className="text-sm">
                {new Date(shift.date).toLocaleDateString()} - {shift.startTime} to {shift.endTime} (
                {shift.breakMins} min break)
              </p>
            </div>

            {/* TIME_CHANGE form */}
            {requestType === "SHIFT_TIME_CHANGE" && (
              <TabsContent value="SHIFT_TIME_CHANGE" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="proposedStartTime">Proposed Start Time</Label>
                    <Input
                      id="proposedStartTime"
                      type="time"
                      value={proposedStartTime}
                      onChange={(e) => {
                        setProposedStartTime(e.target.value)
                        setError("")
                      }}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="proposedEndTime">Proposed End Time</Label>
                    <Input
                      id="proposedEndTime"
                      type="time"
                      value={proposedEndTime}
                      onChange={(e) => {
                        setProposedEndTime(e.target.value)
                        setError("")
                      }}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proposedBreakMins">Break Minutes</Label>
                  <Input
                    id="proposedBreakMins"
                    type="number"
                    min="0"
                    step="15"
                    value={proposedBreakMins}
                    onChange={(e) => {
                      setProposedBreakMins(e.target.value)
                      setError("")
                    }}
                    required
                    disabled={isLoading}
                  />
                </div>
              </TabsContent>
            )}

            {/* DROP_REQUEST form */}
            {requestType === "SHIFT_DROP_REQUEST" && (
              <TabsContent value="SHIFT_DROP_REQUEST" className="mt-4">
                <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    This will request to cancel/drop this shift. A manager will review your request.
                  </p>
                </div>
              </TabsContent>
            )}

            {/* COVER_REQUEST form */}
            {requestType === "SHIFT_COVER_REQUEST" && (
              <TabsContent value="SHIFT_COVER_REQUEST" className="mt-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Request someone to cover this shift. Other workers can volunteer to cover it.
                  </p>
                </div>
              </TabsContent>
            )}

            {/* SWAP_REQUEST form */}
            {requestType === "SHIFT_SWAP_REQUEST" && (
              <TabsContent value="SHIFT_SWAP_REQUEST" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="swapShiftId">Swap Shift ID</Label>
                  <Input
                    id="swapShiftId"
                    value={swapShiftId}
                    onChange={(e) => {
                      setSwapShiftId(e.target.value)
                      setError("")
                    }}
                    placeholder="Enter shift ID or select from list"
                    required
                    disabled={isLoading}
                  />
                </div>
                {(allShifts.length > 0 || myShifts.length > 0) && (
                  <div className="space-y-2">
                    <Label>Available Shifts to Swap</Label>
                    <div className="space-y-2 max-h-60 overflow-y-auto border rounded p-2">
                      {(allShifts.length > 0 ? allShifts : myShifts)
                        .filter((s) => s.id !== shift.id)
                        .map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSwapShiftId(s.id)
                              setError("")
                            }}
                            className="w-full text-left p-2 hover:bg-muted rounded text-sm border"
                          >
                            <div className="font-medium">
                              {new Date(s.date).toLocaleDateString()} - {s.startTime} to {s.endTime}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {s.user?.name || "Unknown"} • ID: {s.id}
                            </div>
                          </button>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select a shift to swap with. Both employees and manager/owner approval will be required.
                    </p>
                  </div>
                )}
              </TabsContent>
            )}

            {/* Reason (common to all types) */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you need this change..."
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

