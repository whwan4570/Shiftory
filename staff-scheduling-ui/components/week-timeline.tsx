"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatYMD, compareTimes, timeToMinutes, minutesToTime } from "@/lib/date"
import type { Shift } from "@/lib/types"
import type { Member } from "@/lib/types"

interface WeekTimelineProps {
  days: Date[]
  shifts: Shift[]
  members: Member[]
  weekStartsOn: number
  onShiftMove?: (shiftId: string, newDate: Date, newStartTime: string, newEndTime: string) => void
  onShiftResize?: (shiftId: string, newStartTime: string, newEndTime: string) => void
  onShiftCreate?: (date: Date, startTime: string, endTime: string, userId: string) => void
  onShiftClick?: (shift: Shift) => void
  canEdit?: boolean
}

// Generate time slots (30-minute intervals from 00:00 to 23:30)
const timeSlots: string[] = []
for (let hour = 0; hour < 24; hour++) {
  for (let minute = 0; minute < 60; minute += 30) {
    timeSlots.push(`${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`)
  }
}

export function WeekTimeline({
  days,
  shifts,
  members,
  weekStartsOn,
  onShiftMove,
  onShiftResize,
  onShiftCreate,
  onShiftClick,
  canEdit = false,
}: WeekTimelineProps) {
  const [draggedShift, setDraggedShift] = useState<Shift | null>(null)
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null)
  const [resizingShift, setResizingShift] = useState<{ shift: Shift; edge: "start" | "end" } | null>(null)
  const [hoveredSlot, setHoveredSlot] = useState<{ day: Date; time: string } | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  // Group shifts by date
  const shiftsByDate: Record<string, Shift[]> = {}
  for (const shift of shifts) {
    const dateKey = formatYMD(new Date(shift.date))
    if (!shiftsByDate[dateKey]) {
      shiftsByDate[dateKey] = []
    }
    shiftsByDate[dateKey].push(shift)
  }

  // Calculate shift position and height
  function getShiftStyle(shift: Shift, day: Date): {
    top: number
    height: number
    left: number
    width: number
  } | null {
    const dateKey = formatYMD(day)
    const shiftDate = typeof shift.date === 'string' 
      ? (shift.date.includes('T') ? new Date(shift.date) : new Date(shift.date + 'T00:00:00'))
      : new Date(shift.date)
    const shiftDateKey = formatYMD(shiftDate)
    if (dateKey !== shiftDateKey) return null

    const startMinutes = timeToMinutes(shift.startTime)
    const endMinutes = timeToMinutes(shift.endTime)
    const duration = endMinutes - startMinutes

    // Calculate position (each 30-min slot = 40px)
    const top = (startMinutes / 30) * 40
    const height = (duration / 30) * 40

    // Find member index for horizontal positioning
    const dayShifts = shiftsByDate[dateKey] || []
    const uniqueMembers = Array.from(new Set(dayShifts.map((s) => s.userId)))
    const memberIndex = uniqueMembers.indexOf(shift.userId)
    const totalMembers = Math.max(uniqueMembers.length, 1)

    const leftPercent = (100 / totalMembers) * memberIndex
    const widthPercent = 100 / totalMembers

    return { top, height, left: leftPercent, width: widthPercent }
  }

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent, shift: Shift) => {
    if (!canEdit) return
    e.preventDefault()
    setDraggedShift(shift)
    setDragStartPos({ x: e.clientX, y: e.clientY })
  }

  // Handle drag
  useEffect(() => {
    if (!draggedShift || !dragStartPos) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return

      const rect = timelineRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // Calculate which day and time slot
      const dayWidth = rect.width / days.length
      const dayIndex = Math.floor(x / dayWidth)
      if (dayIndex < 0 || dayIndex >= days.length) return

      const day = days[dayIndex]
      const slotHeight = 40 // 30 minutes = 40px
      const slotIndex = Math.floor(y / slotHeight)
      if (slotIndex < 0 || slotIndex >= timeSlots.length) return

      const time = timeSlots[slotIndex]
      const newStartTime = time
      const duration = timeToMinutes(draggedShift.endTime) - timeToMinutes(draggedShift.startTime)
      const newEndMinutes = timeToMinutes(time) + duration
      const newEndTime = minutesToTime(newEndMinutes)

      setDragOffset({ x: e.clientX - dragStartPos.x, y: e.clientY - dragStartPos.y })
      setHoveredSlot({ day, time: newStartTime })
    }

    const handleMouseUp = () => {
      if (draggedShift && hoveredSlot && onShiftMove) {
        const duration =
          timeToMinutes(draggedShift.endTime) - timeToMinutes(draggedShift.startTime)
        const newEndTime = minutesToTime(timeToMinutes(hoveredSlot.time) + duration)

        onShiftMove(draggedShift.id, hoveredSlot.day, hoveredSlot.time, newEndTime)
      }
      setDraggedShift(null)
      setDragStartPos(null)
      setDragOffset(null)
      setHoveredSlot(null)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [draggedShift, dragStartPos, hoveredSlot, days, onShiftMove])

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent, shift: Shift, edge: "start" | "end") => {
    if (!canEdit) return
    e.preventDefault()
    e.stopPropagation()
    setResizingShift({ shift, edge })
  }

  // Handle resize
  useEffect(() => {
    if (!resizingShift) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return

      const rect = timelineRef.current.getBoundingClientRect()
      const y = e.clientY - rect.top

      const slotHeight = 40
      const slotIndex = Math.max(0, Math.min(Math.floor(y / slotHeight), timeSlots.length - 1))
      const newTime = timeSlots[slotIndex]

      // Update preview (visual only, actual update on mouseup)
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (!timelineRef.current || !resizingShift) return

      const rect = timelineRef.current.getBoundingClientRect()
      const y = e.clientY - rect.top

      const slotHeight = 40
      const slotIndex = Math.max(0, Math.min(Math.floor(y / slotHeight), timeSlots.length - 1))
      const newTime = timeSlots[slotIndex]

      if (onShiftResize) {
        const { shift, edge } = resizingShift
        if (edge === "start") {
          if (compareTimes(newTime, shift.endTime) < 0) {
            onShiftResize(shift.id, newTime, shift.endTime)
          }
        } else {
          if (compareTimes(newTime, shift.startTime) > 0) {
            onShiftResize(shift.id, shift.startTime, newTime)
          }
        }
      }

      setResizingShift(null)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [resizingShift, onShiftResize])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Week Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={timelineRef} className="relative overflow-x-auto">
          <div className="flex min-w-full">
            {/* Time column */}
            <div className="w-20 flex-shrink-0">
              <div className="h-8"></div>
              <div className="relative">
                {timeSlots.map((time, index) => (
                  <div
                    key={time}
                    className="h-10 border-b border-border text-xs text-muted-foreground flex items-center"
                    style={{ height: "40px" }}
                  >
                    {index % 2 === 0 && (
                      <span className="pl-2">{time}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Days columns */}
            {days.map((day) => {
              const dateKey = formatYMD(day)
              const dayShifts = shiftsByDate[dateKey] || []

              return (
                <div key={dateKey} className="flex-1 min-w-[150px] border-l border-border">
                  {/* Day header */}
                  <div className="h-8 border-b border-border p-2 text-sm font-medium text-center sticky top-0 bg-background z-10">
                    <div>{day.toLocaleDateString("en-US", { weekday: "short" })}</div>
                    <div className="text-xs text-muted-foreground">
                      {day.getDate()}/{day.getMonth() + 1}
                    </div>
                  </div>

                  {/* Time slots */}
                  <div className="relative" style={{ height: `${timeSlots.length * 40}px` }}>
                    {/* Grid lines */}
                    {timeSlots.map((time, index) => (
                      <div
                        key={time}
                        className="absolute border-b border-border"
                        style={{
                          top: `${index * 40}px`,
                          left: 0,
                          right: 0,
                          height: "1px",
                        }}
                      />
                    ))}

                    {/* Shifts */}
                    {dayShifts.map((shift) => {
                      const style = getShiftStyle(shift, day)
                      if (!style) return null

                      const member = members.find((m) => m.id === shift.userId)
                      const isDragging = draggedShift?.id === shift.id

                      return (
                        <div
                          key={shift.id}
                          className={cn(
                            "absolute rounded border-l-2 bg-primary/20 hover:bg-primary/30 cursor-move transition-all",
                            isDragging && "opacity-50 z-50",
                            !canEdit && "cursor-default"
                          )}
                          style={{
                            top: `${style.top}px`,
                            left: `${style.left}%`,
                            width: `${style.width}%`,
                            height: `${style.height}px`,
                            transform: isDragging && dragOffset
                              ? `translate(${dragOffset.x}px, ${dragOffset.y}px)`
                              : undefined,
                          }}
                          onClick={() => onShiftClick?.(shift)}
                          onMouseDown={(e) => handleDragStart(e, shift)}
                        >
                          <div className="p-1 text-xs h-full flex flex-col justify-between">
                            <div className="font-semibold truncate">
                              {member?.name || shift.employeeName}
                            </div>
                            <div className="text-muted-foreground">
                              {shift.startTime} - {shift.endTime}
                            </div>
                          </div>

                          {/* Resize handles */}
                          {canEdit && (
                            <>
                              <div
                                className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-primary/50"
                                onMouseDown={(e) => handleResizeStart(e, shift, "start")}
                              />
                              <div
                                className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-primary/50"
                                onMouseDown={(e) => handleResizeStart(e, shift, "end")}
                              />
                            </>
                          )}
                        </div>
                      )
                    })}

                    {/* Drop zone highlight */}
                    {hoveredSlot && formatYMD(hoveredSlot.day) === dateKey && (
                      <div
                        className="absolute border-2 border-dashed border-primary bg-primary/10"
                        style={{
                          top: `${(timeSlots.indexOf(hoveredSlot.time) * 40)}px`,
                          left: 0,
                          right: 0,
                          height: "40px",
                        }}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

