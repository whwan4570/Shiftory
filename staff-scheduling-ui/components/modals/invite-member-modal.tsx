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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import type { UserRole } from "@/lib/types"

export type ManagerPermission =
  | "manageShifts"
  | "manageSchedule"
  | "manageDocuments"
  | "reviewSubmissions"
  | "approveRequests"
  | "viewReports"
  | "inviteMembers"

const MANAGER_PERMISSIONS: { key: ManagerPermission; label: string; description: string }[] = [
  { key: "manageShifts", label: "Manage Shifts", description: "Create, edit, and delete shifts" },
  { key: "manageSchedule", label: "Manage Schedule", description: "Create and publish schedule months" },
  { key: "manageDocuments", label: "Manage Documents", description: "Create and update store documents" },
  { key: "reviewSubmissions", label: "Review Submissions", description: "Approve or reject document submissions" },
  { key: "approveRequests", label: "Approve Requests", description: "Approve or reject change requests" },
  { key: "viewReports", label: "View Reports", description: "View staff reports and summaries" },
  { key: "inviteMembers", label: "Invite Members", description: "Invite new members to the store" },
]

interface InviteMemberModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (data: { 
    email: string
    role: UserRole
    permissions?: ManagerPermission[]
    position?: string
    skills?: string[]
  }) => void
}

export function InviteMemberModal({ open, onOpenChange, onSubmit }: InviteMemberModalProps) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<UserRole>("WORKER")
  const [permissions, setPermissions] = useState<ManagerPermission[]>([])
  const [position, setPosition] = useState("")
  const [skillsInput, setSkillsInput] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Parse skills from comma-separated string
    const skills = skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    
    onSubmit?.({ 
      email, 
      role,
      permissions: role === "MANAGER" ? permissions : undefined,
      position: position || undefined,
      skills: skills.length > 0 ? skills : undefined,
    })
    setEmail("")
    setRole("WORKER")
    setPermissions([])
    setPosition("")
    setSkillsInput("")
    onOpenChange(false)
  }

  const handlePermissionChange = (permission: ManagerPermission, checked: boolean) => {
    if (checked) {
      setPermissions([...permissions, permission])
    } else {
      setPermissions(permissions.filter((p) => p !== permission))
    }
  }

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole)
    if (newRole !== "MANAGER") {
      setPermissions([])
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>Send an invitation to join this store.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(value) => handleRoleChange(value as UserRole)}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWNER">Owner (All Permissions)</SelectItem>
                  <SelectItem value="MANAGER">Manager (Custom Permissions)</SelectItem>
                  <SelectItem value="WORKER">Worker</SelectItem>
                </SelectContent>
              </Select>
              {role === "OWNER" && (
                <p className="text-xs text-muted-foreground">
                  Owners have all permissions automatically.
                </p>
              )}
            </div>

            {role === "MANAGER" && (
              <div className="space-y-3">
                <Label>Manager Permissions</Label>
                <div className="space-y-2 rounded-md border p-3">
                  {MANAGER_PERMISSIONS.map((perm) => (
                    <div key={perm.key} className="flex items-start space-x-2">
                      <Checkbox
                        id={perm.key}
                        checked={permissions.includes(perm.key)}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(perm.key, checked === true)
                        }
                      />
                      <div className="flex-1 space-y-0.5">
                        <Label
                          htmlFor={perm.key}
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          {perm.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">{perm.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {permissions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Select at least one permission for the manager.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="position">Position (Optional)</Label>
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
              <Label htmlFor="skills">Skills (Optional)</Label>
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Send Invite</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
