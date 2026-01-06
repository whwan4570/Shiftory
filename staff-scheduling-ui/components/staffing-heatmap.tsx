"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatYMD } from "@/lib/date"
import type { Shift } from "@/lib/types"

interface StaffingHeatmapProps {
  shifts: Shift[]
  year: number
  month: number
  onSelectDate?: (date: Date) => void
  selectedDate?: Date | null
}

/**
 * Calculate staffing level for a date
 * Returns: { count, level: 'under' | 'optimal' | 'over' }
 */
function getStaffingLevel(shifts: Shift[], date: Date): {
  count: number
  level: "under" | "optimal" | "over"
} {
  const dateKey = formatYMD(date)
  const dayShifts = shifts.filter((shift) => {
    const shiftDate = typeof shift.date === 'string' 
      ? (shift.date.includes('T') ? new Date(shift.date) : new Date(shift.date + 'T00:00:00'))
      : new Date(shift.date)
    return formatYMD(shiftDate) === dateKey
  })

  const count = dayShifts.length
  // Define thresholds (can be customized)
  const optimalMin = 2
  const optimalMax = 5

  if (count < optimalMin) {
    return { count, level: "under" }
  } else if (count > optimalMax) {
    return { count, level: "over" }
  } else {
    return { count, level: "optimal" }
  }
}

export function StaffingHeatmap({
  shifts,
  year,
  month,
  onSelectDate,
  selectedDate,
}: StaffingHeatmapProps) {
  // Get all days in the month
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()
  const emptyDays = Array.from({ length: firstDayOfWeek }, (_, i) => i)

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Calculate max count for normalization
  const maxCount = Math.max(
    ...days.map((day) => {
      const date = new Date(year, month - 1, day)
      return getStaffingLevel(shifts, date).count
    }),
    1
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Staffing Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-green-100 border border-green-300" />
              <span>Optimal</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-amber-100 border border-amber-300" />
              <span>Understaffed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-red-100 border border-red-300" />
              <span>Overstaffed</span>
            </div>
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
                {day}
              </div>
            ))}

            {/* Empty cells before first day */}
            {emptyDays.map((i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Days with heatmap */}
            {days.map((day) => {
              const date = new Date(year, month - 1, day)
              const { count, level } = getStaffingLevel(shifts, date)
              const isSelected =
                selectedDate &&
                selectedDate.getDate() === day &&
                selectedDate.getMonth() === month - 1 &&
                selectedDate.getFullYear() === year
              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === month - 1 &&
                new Date().getFullYear() === year

              // Calculate intensity based on count
              const intensity = maxCount > 0 ? count / maxCount : 0

              return (
                <button
                  key={day}
                  onClick={() => onSelectDate?.(date)}
                  className={cn(
                    "aspect-square rounded-md text-xs transition-all hover:scale-105 relative flex flex-col items-center justify-center border",
                    level === "under" &&
                      `bg-amber-${Math.max(50, Math.min(500, Math.floor(100 + intensity * 400)))} border-amber-300`,
                    level === "optimal" &&
                      `bg-green-${Math.max(50, Math.min(500, Math.floor(100 + intensity * 400)))} border-green-300`,
                    level === "over" &&
                      `bg-red-${Math.max(50, Math.min(500, Math.floor(100 + intensity * 400)))} border-red-300`,
                    isSelected && "ring-2 ring-primary ring-offset-2",
                    isToday && !isSelected && "ring-1 ring-primary"
                  )}
                  style={{
                    backgroundColor:
                      level === "under"
                        ? `rgba(251, 191, 36, ${0.2 + intensity * 0.6})`
                        : level === "optimal"
                        ? `rgba(34, 197, 94, ${0.2 + intensity * 0.6})`
                        : `rgba(239, 68, 68, ${0.2 + intensity * 0.6})`,
                    borderColor:
                      level === "under"
                        ? "rgb(252, 211, 77)"
                        : level === "optimal"
                        ? "rgb(74, 222, 128)"
                        : "rgb(248, 113, 113)",
                  }}
                  title={`${day}/${month}/${year}: ${count} staff`}
                >
                  <span className={cn("font-semibold", isSelected && "text-primary-foreground")}>
                    {day}
                  </span>
                  <span className={cn("text-[10px]", isSelected && "text-primary-foreground")}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

