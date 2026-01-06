"use client"

import type React from "react"
import { useState } from "react"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { formatYMD, extractYMD } from "@/lib/date"
import { toast } from "sonner"
import type { Shift } from "@/lib/types"

// Helper to extract date string from shift
function getShiftDateString(shift: Shift): string {
  if (typeof shift.date === 'string') {
    // Check if it's already YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(shift.date)) {
      return shift.date
    }
    // Otherwise parse and extract
    return extractYMD(new Date(shift.date))
  }
  return extractYMD(new Date(shift.date))
}

interface BulkAdjustModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  year: number
  month: number
  shifts: Shift[]
  selectedDateRange?: { from: Date; to: Date } | null
  onSuccess?: () => void
  isPublished?: boolean
}

export function BulkAdjustModal({
  open,
  onOpenChange,
  storeId,
  year,
  month,
  shifts,
  selectedDateRange,
  onSuccess,
  isPublished = false,
}: BulkAdjustModalProps) {
  const [adjustmentMinutes, setAdjustmentMinutes] = useState("0")
  const [selectedFromDate, setSelectedFromDate] = useState(
    selectedDateRange ? formatYMD(selectedDateRange.from) : ""
  )
  const [selectedToDate, setSelectedToDate] = useState(
    selectedDateRange ? formatYMD(selectedDateRange.to) : ""
  )
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Filter shifts by date range
  const filteredShifts =
    selectedFromDate && selectedToDate
      ? shifts.filter((shift) => {
          const shiftDate = getShiftDateString(shift)
          return shiftDate >= selectedFromDate && shiftDate <= selectedToDate
        })
      : []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!selectedFromDate || !selectedToDate) {
      setError("Please select both start and end dates")
      return
    }

    if (selectedFromDate > selectedToDate) {
      setError("Start date must be before end date")
      return
    }

    const adjustment = Number.parseInt(adjustmentMinutes, 10)
    if (Number.isNaN(adjustment) || adjustment === 0) {
      setError("Please enter a non-zero adjustment value")
      return
    }

    if (filteredShifts.length === 0) {
      setError("No shifts found in the selected date range")
      return
    }

    setIsLoading(true)
    try {
      const { updateShift } = await import("@/lib/schedulingApi")

      // Update all shifts in the range
      let successCount = 0
      let errorCount = 0

      for (const shift of filteredShifts) {
        try {
          // Parse current times
          const [startHours, startMins] = shift.startTime.split(":").map(Number)
          const [endHours, endMins] = shift.endTime.split(":").map(Number)

          // Calculate new times
          let newStartTotal = startHours * 60 + startMins + adjustment
          let newEndTotal = endHours * 60 + endMins + adjustment

          // Normalize to 24-hour format
          newStartTotal = ((newStartTotal % (24 * 60)) + 24 * 60) % (24 * 60)
          newEndTotal = ((newEndTotal % (24 * 60)) + 24 * 60) % (24 * 60)

          const newStartHours = Math.floor(newStartTotal / 60)
          const newStartMins = newStartTotal % 60
          const newEndHours = Math.floor(newEndTotal / 60)
          const newEndMins = newEndTotal % 60

          const newStartTime = `${newStartHours.toString().padStart(2, "0")}:${newStartMins.toString().padStart(2, "0")}`
          const newEndTime = `${newEndHours.toString().padStart(2, "0")}:${newEndMins.toString().padStart(2, "0")}`

          await updateShift(storeId, shift.id, {
            startTime: newStartTime,
            endTime: newEndTime,
          })

          successCount++
        } catch (err) {
          console.error(`Failed to update shift ${shift.id}:`, err)
          errorCount++
        }
      }

      if (errorCount > 0) {
        toast.warning(
          `Updated ${successCount} shifts, ${errorCount} failed`,
        )
      } else {
        toast.success(`Successfully adjusted ${successCount} shifts`)
      }

      // Reset form
      setAdjustmentMinutes("0")
      setError("")
      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to adjust shifts"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setError("")
      setAdjustmentMinutes("0")
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Bulk Adjust Shift Times</DialogTitle>
            <DialogDescription>
              Adjust all shifts in a date range by adding or subtracting minutes.
              Positive values move shifts later, negative values move them earlier.
            </DialogDescription>
            {isPublished && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This month is published. Changes require approval.
                </AlertDescription>
              </Alert>
            )}
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromDate">From Date</Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={selectedFromDate}
                  onChange={(e) => setSelectedFromDate(e.target.value)}
                  required
                  disabled={isPublished || isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="toDate">To Date</Label>
                <Input
                  id="toDate"
                  type="date"
                  value={selectedToDate}
                  onChange={(e) => setSelectedToDate(e.target.value)}
                  required
                  disabled={isPublished || isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjustmentMinutes">
                Adjustment (minutes)
              </Label>
              <Input
                id="adjustmentMinutes"
                type="number"
                value={adjustmentMinutes}
                onChange={(e) => setAdjustmentMinutes(e.target.value)}
                required
                disabled={isPublished || isLoading}
                placeholder="e.g., 30 or -30"
              />
              <p className="text-xs text-muted-foreground">
                Positive: move shifts later. Negative: move shifts earlier.
                Example: +30 moves all shifts 30 minutes later.
              </p>
            </div>

            {selectedFromDate && selectedToDate && filteredShifts.length > 0 && (
              <Alert>
                <AlertDescription>
                  {filteredShifts.length} shift
                  {filteredShifts.length !== 1 ? "s" : ""} will be adjusted in
                  the selected date range.
                </AlertDescription>
              </Alert>
            )}

            {selectedFromDate &&
              selectedToDate &&
              filteredShifts.length === 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No shifts found in the selected date range.
                  </AlertDescription>
                </Alert>
              )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading ||
                isPublished ||
                filteredShifts.length === 0 ||
                !selectedFromDate ||
                !selectedToDate
              }
            >
              {isLoading
                ? "Adjusting..."
                : `Adjust ${filteredShifts.length} Shift${
                    filteredShifts.length !== 1 ? "s" : ""
                  }`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

