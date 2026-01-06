"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Shift } from "@/lib/types"
import { MoreHorizontal, Clock, AlertTriangle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ShiftCardProps {
  shift: Shift
  onEdit?: (shiftId: string) => void
  onCancel?: (shiftId: string) => void
  onDelete?: (shiftId: string) => void
  onSelect?: (shiftId: string) => void
}

export function ShiftCard({ shift, onEdit, onCancel, onDelete, onSelect }: ShiftCardProps) {
  const hasWarnings = shift.warnings && shift.warnings.length > 0

  return (
    <Card 
      className={`cursor-pointer transition-colors hover:bg-accent ${hasWarnings ? 'border-amber-500 border-2' : ''}`}
      onClick={() => onSelect?.(shift.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">{shift.employeeName}</h4>
              {hasWarnings && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <div className="space-y-1">
                        {shift.warnings?.map((warning, idx) => (
                          <div key={idx} className="text-xs">
                            {warning.message}
                          </div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                {shift.startTime} – {shift.endTime}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{shift.breakMinutes} min break</Badge>
              <Badge
                variant={
                  shift.status === "PUBLISHED" ? "default" : shift.status === "DRAFT" ? "secondary" : "destructive"
                }
              >
                {shift.status}
              </Badge>
            </div>
            {hasWarnings && (
              <div className="space-y-1 pt-1">
                {shift.warnings?.map((warning, idx) => (
                  <Alert key={idx} variant={warning.severity === 'error' ? 'destructive' : 'default'} className="py-1 px-2">
                    <AlertTriangle className="h-3 w-3" />
                    <AlertDescription className="text-xs">
                      {warning.message}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(shift.id)}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCancel?.(shift.id)}>Cancel shift</DropdownMenuItem>
              {onDelete && (
                <DropdownMenuItem onClick={() => onDelete(shift.id)} className="text-destructive">
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}
