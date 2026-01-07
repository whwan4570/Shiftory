"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Member } from "@/lib/types"
import { MoreHorizontal } from "lucide-react"

interface MemberTableProps {
  members: Member[]
  onChangeRole?: (memberId: string, newRole: "OWNER" | "MANAGER" | "WORKER") => void
  onRemove?: (memberId: string) => void
  onEdit?: (member: Member) => void
}

export function MemberTable({ members, onChangeRole, onRemove, onEdit }: MemberTableProps) {
  if (members.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-sm text-muted-foreground">No members yet. Invite someone to get started.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Position</TableHead>
            <TableHead>Skills</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium">{member.name}</TableCell>
              <TableCell>{member.email}</TableCell>
              <TableCell>
                {onChangeRole ? (
                  <Select
                    value={member.role}
                    onValueChange={(value) => {
                      if (value !== member.role) {
                        onChangeRole(member.id, value as "OWNER" | "MANAGER" | "WORKER")
                      }
                    }}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OWNER">OWNER</SelectItem>
                      <SelectItem value="MANAGER">MANAGER</SelectItem>
                      <SelectItem value="WORKER">WORKER</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge
                    variant={member.role === "OWNER" ? "default" : member.role === "MANAGER" ? "secondary" : "outline"}
                  >
                    {member.role}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {member.position ? (
                  <Badge variant="outline">{member.position}</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {member.skills && member.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {member.skills.slice(0, 2).map((skill, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {member.skills.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{member.skills.length - 2}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={member.status === "ACTIVE" ? "default" : "secondary"}>{member.status}</Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(member)}>
                        Edit Position/Skills
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onRemove?.(member.id)} className="text-destructive">
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
