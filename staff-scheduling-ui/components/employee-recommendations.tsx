"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UserCheck, Clock } from "lucide-react"
import type { Member } from "@/lib/types"
import type { Availability } from "@/types/availability"
import { formatYMD, compareTimes } from "@/lib/date"

interface EmployeeRecommendation {
  member: Member
  score: number
  reasons: string[]
}

interface EmployeeRecommendationsProps {
  members: Member[]
  availabilities: Availability[]
  date: Date
  startTime: string
  endTime: string
  requiredPosition?: string | null
  requiredSkills?: string[]
  onSelect: (member: Member) => void
}

/**
 * Calculate recommendation score for a member
 */
function calculateRecommendationScore(
  member: Member,
  availabilities: Availability[],
  date: Date,
  startTime: string,
  endTime: string,
  requiredPosition?: string | null,
  requiredSkills?: string[]
): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  const dateKey = formatYMD(date)

  // Check availability
  const memberAvailability = availabilities.find(
    (avail) =>
      avail.userId === member.id &&
      formatYMD(avail.date) === dateKey &&
      avail.type === "AVAILABLE"
  )

  if (memberAvailability) {
    if (memberAvailability.startTime && memberAvailability.endTime) {
      // Check if shift time is within availability window
      if (
        compareTimes(startTime, memberAvailability.startTime) >= 0 &&
        compareTimes(endTime, memberAvailability.endTime) <= 0
      ) {
        score += 50
        reasons.push("Available at this time")
      } else {
        score += 20
        reasons.push("Partially available")
      }
    } else {
      score += 30
      reasons.push("Available all day")
    }
  } else {
    // Check for unavailable
    const unavailable = availabilities.find(
      (avail) =>
        avail.userId === member.id &&
        formatYMD(avail.date) === dateKey &&
        avail.type === "UNAVAILABLE"
    )
    if (unavailable) {
      score -= 100
      reasons.push("Unavailable")
      return { score, reasons }
    }
    // No availability data - neutral
    score += 10
    reasons.push("No availability data")
  }

  // Position match
  if (requiredPosition) {
    if (member.position === requiredPosition) {
      score += 30
      reasons.push(`Position: ${member.position}`)
    } else if (member.position) {
      score += 10
      reasons.push(`Position: ${member.position} (partial)`)
    }
  } else if (member.position) {
    score += 5
    reasons.push(`Position: ${member.position}`)
  }

  // Skills match
  if (requiredSkills && requiredSkills.length > 0) {
    const memberSkills = member.skills || []
    const matchedSkills = requiredSkills.filter((s) => memberSkills.includes(s))
    if (matchedSkills.length === requiredSkills.length) {
      score += 20
      reasons.push(`All required skills: ${matchedSkills.join(", ")}`)
    } else if (matchedSkills.length > 0) {
      score += 10
      reasons.push(`Some skills: ${matchedSkills.join(", ")}`)
    } else if (memberSkills.length > 0) {
      score += 5
      reasons.push(`Has skills: ${memberSkills.join(", ")}`)
    }
  } else if (member.skills && member.skills.length > 0) {
    score += 5
    reasons.push(`Skills: ${member.skills.join(", ")}`)
  }

  return { score, reasons }
}

export function EmployeeRecommendations({
  members,
  availabilities,
  date,
  startTime,
  endTime,
  requiredPosition,
  requiredSkills,
  onSelect,
}: EmployeeRecommendationsProps) {
  // Calculate recommendations
  const recommendations: EmployeeRecommendation[] = members
    .map((member) => {
      const { score, reasons } = calculateRecommendationScore(
        member,
        availabilities,
        date,
        startTime,
        endTime,
        requiredPosition,
        requiredSkills
      )
      return { member, score, reasons }
    })
    .filter((rec) => rec.score > 0) // Only show positive recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, 5) // Top 5 recommendations

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No recommendations available. Check availability or filters.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recommendations.map((rec, index) => (
            <div
              key={rec.member.id}
              className="p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{rec.member.name}</span>
                    <Badge variant="outline" className="text-xs">
                      #{index + 1} ({rec.score}pts)
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {rec.reasons.map((reason, idx) => (
                      <div key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {reason}
                      </div>
                    ))}
                  </div>
                  {rec.member.position && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      {rec.member.position}
                    </Badge>
                  )}
                  {rec.member.skills && rec.member.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {rec.member.skills.map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSelect(rec.member)}
                >
                  Select
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

