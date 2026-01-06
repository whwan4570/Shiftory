"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import type { Member } from "@/lib/types"
import type { Availability } from "@/types/availability"

interface EmployeeFiltersProps {
  members: Member[]
  selectedPosition?: string | null
  selectedSkills: string[]
  availableSkills: string[]
  onPositionChange: (position: string | null) => void
  onSkillsChange: (skills: string[]) => void
}

export function EmployeeFilters({
  members,
  selectedPosition,
  selectedSkills,
  availableSkills,
  onPositionChange,
  onSkillsChange,
}: EmployeeFiltersProps) {
  const [positionInput, setPositionInput] = useState(selectedPosition || "")

  // Get unique positions from members
  const positions = Array.from(
    new Set(members.map((m) => m.position).filter((p): p is string => !!p))
  )

  const handlePositionSelect = (position: string) => {
    if (selectedPosition === position) {
      onPositionChange(null)
      setPositionInput("")
    } else {
      onPositionChange(position)
      setPositionInput(position)
    }
  }

  const handlePositionInputChange = (value: string) => {
    setPositionInput(value)
    onPositionChange(value || null)
  }

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      onSkillsChange(selectedSkills.filter((s) => s !== skill))
    } else {
      onSkillsChange([...selectedSkills, skill])
    }
  }

  const clearAll = () => {
    onPositionChange(null)
    setPositionInput("")
    onSkillsChange([])
  }

  const hasActiveFilters = selectedPosition || selectedSkills.length > 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Filters</CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Position Filter */}
        <div className="space-y-2">
          <Label>Position</Label>
          <div className="space-y-2">
            <Input
              placeholder="Type or select position..."
              value={positionInput}
              onChange={(e) => handlePositionInputChange(e.target.value)}
              list="positions-list"
            />
            {positions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {positions.map((position) => (
                  <Badge
                    key={position}
                    variant={selectedPosition === position ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handlePositionSelect(position)}
                  >
                    {position}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Skills Filter */}
        {availableSkills.length > 0 && (
          <div className="space-y-2">
            <Label>Skills</Label>
            <div className="flex flex-wrap gap-2">
              {availableSkills.map((skill) => (
                <Badge
                  key={skill}
                  variant={selectedSkills.includes(skill) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleSkill(skill)}
                >
                  {skill}
                  {selectedSkills.includes(skill) && (
                    <X className="ml-1 h-3 w-3" />
                  )}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="pt-2 border-t">
            <div className="flex flex-wrap gap-2">
              {selectedPosition && (
                <Badge variant="secondary">
                  Position: {selectedPosition}
                  <button
                    onClick={() => {
                      onPositionChange(null)
                      setPositionInput("")
                    }}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedSkills.map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                  <button
                    onClick={() => toggleSkill(skill)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

