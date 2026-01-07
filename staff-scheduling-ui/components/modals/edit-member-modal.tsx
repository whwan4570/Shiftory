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
import type { Member } from "@/lib/types"

interface EditMemberModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: Member | null
  onSubmit?: (data: { position?: string; skills?: string[] }) => void
}

export function EditMemberModal({ open, onOpenChange, member, onSubmit }: EditMemberModalProps) {
  const [position, setPosition] = useState("")
  const [skillsInput, setSkillsInput] = useState("")

  // Update form when member changes
  useEffect(() => {
    if (member) {
      setPosition(member.position || "")
      setSkillsInput(member.skills?.join(", ") || "")
    } else {
      setPosition("")
      setSkillsInput("")
    }
  }, [member])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!member) return

    // Parse skills from comma-separated string
    const skills = skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    onSubmit?.({
      position: position || undefined,
      skills: skills.length > 0 ? skills : undefined,
    })
    onOpenChange(false)
  }

  const handleClose = () => {
    setPosition("")
    setSkillsInput("")
    onOpenChange(false)
  }

  if (!member) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Member: {member.name}</DialogTitle>
            <DialogDescription>
              Update position and skills for this member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                type="text"
                placeholder="e.g., Barista, Kitchen Staff, Cashier"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter the member's position or role in this store.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="skills">Skills</Label>
              <Input
                id="skills"
                type="text"
                placeholder="e.g., Coffee Making, Food Prep, Customer Service"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter skills separated by commas (e.g., "Coffee Making, Food Prep").
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

