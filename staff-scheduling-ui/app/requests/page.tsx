"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Sidebar } from "@/components/sidebar"
import { Topbar } from "@/components/topbar"
import { useAuth } from "@/hooks/useAuth"
import {
  listRequests,
  approveRequest,
  rejectRequest,
  cancelRequest,
  getRequest,
  listCandidates,
  addCandidate,
  removeCandidate,
} from "@/lib/requestsApi"
import { storesApi, membershipsApi } from "@/lib/api"
import type {
  ChangeRequest,
  ChangeRequestStatus,
  ChangeRequestType,
  ChangeRequestCandidate,
} from "@/types/requests"
import { toast } from "sonner"
import { AlertCircle, CheckCircle2, XCircle, Clock, X, UserPlus, UserMinus } from "lucide-react"

const statusConfig: Record<
  ChangeRequestStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }
> = {
  PENDING: { label: "Pending", variant: "secondary", icon: Clock },
  APPROVED: { label: "Approved", variant: "default", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", variant: "destructive", icon: XCircle },
  CANCELED: { label: "Canceled", variant: "outline", icon: X },
}

const typeLabels: Record<ChangeRequestType, string> = {
  SHIFT_TIME_CHANGE: "Time Change",
  SHIFT_DROP_REQUEST: "Drop Request",
  SHIFT_COVER_REQUEST: "Cover Request",
  SHIFT_SWAP_REQUEST: "Swap Request",
}

export default function RequestsPage() {
  const router = useRouter()
  const { storeId, isLoading: authLoading } = useAuth()
  const [requests, setRequests] = useState<ChangeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<"OWNER" | "MANAGER" | "WORKER" | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<ChangeRequestStatus | "ALL">("PENDING")
  const [selectedType, setSelectedType] = useState<ChangeRequestType | "ALL">("ALL")
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null)
  const [candidates, setCandidates] = useState<ChangeRequestCandidate[]>([])
  const [members, setMembers] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [candidatesFeatureEnabled, setCandidatesFeatureEnabled] = useState(true)
  const [approveModalOpen, setApproveModalOpen] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [decisionNote, setDecisionNote] = useState("")
  const [chosenUserId, setChosenUserId] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [volunteerNote, setVolunteerNote] = useState("")
  const [isVolunteering, setIsVolunteering] = useState(false)

  // Redirect if no storeId
  useEffect(() => {
    if (!authLoading && !storeId) {
      router.replace("/stores")
    }
  }, [storeId, authLoading, router])

  // Load user role
  useEffect(() => {
    if (storeId && !authLoading) {
      loadUserRole()
      loadMembers()
    }
  }, [storeId, authLoading])

  // Load requests
  useEffect(() => {
    if (storeId && !authLoading && userRole) {
      loadRequests()
    }
  }, [storeId, authLoading, userRole, selectedStatus, selectedType])

  // Load candidates when request is selected
  useEffect(() => {
    if (selectedRequest && storeId && selectedRequest.type === "SHIFT_COVER_REQUEST") {
      loadCandidates()
    } else {
      setCandidates([])
    }
  }, [selectedRequest, storeId])

  const loadUserRole = async () => {
    if (!storeId) return
    try {
      // Load user info to get userId
      try {
        const { authApi } = await import("@/lib/api")
        const user = await authApi.getMe()
        setUserId(user.id)
      } catch (err) {
        console.error("Failed to load user info:", err)
      }

      // Load user role from stores
      const stores = await storesApi.getStores()
      const store = stores.find((s) => s.id === storeId)
      if (store && store.role) {
        setUserRole(store.role as "OWNER" | "MANAGER" | "WORKER")
      } else {
        setUserRole("WORKER")
      }
    } catch (err) {
      console.error("Failed to load user role:", err)
      setUserRole("WORKER")
    }
  }

  const loadMembers = async () => {
    if (!storeId) return
    try {
      const memberships = await membershipsApi.getStoreMembers(storeId)
      setMembers(
        memberships.map((m) => ({
          id: m.userId,
          name: m.user.name,
          email: m.user.email,
        }))
      )
    } catch (err) {
      console.error("Failed to load members:", err)
    }
  }

  const loadRequests = async () => {
    if (!storeId) return

    setLoading(true)
    setError(null)

    try {
      const params: {
        status?: ChangeRequestStatus
        type?: ChangeRequestType
        mine?: boolean
      } = {}

      if (selectedStatus !== "ALL") {
        params.status = selectedStatus
      }

      if (selectedType !== "ALL") {
        params.type = selectedType
      }

      if (userRole === "WORKER") {
        params.mine = true
      }

      const data = await listRequests(storeId, params)
      setRequests(data)
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to load requests"
      setError(errorMessage)
      console.error("Failed to load requests:", err)
    } finally {
      setLoading(false)
    }
  }

  const loadCandidates = async () => {
    if (!storeId || !selectedRequest) return

    setLoadingCandidates(true)
    try {
      const data = await listCandidates(storeId, selectedRequest.id)
      setCandidates(data)
      setCandidatesFeatureEnabled(true)

      // Check if current user is already a candidate
      if (userId) {
        const myCandidate = data.find((c) => c.userId === userId)
        setIsVolunteering(!!myCandidate)
      }
    } catch (err: any) {
      if (err?.message?.includes("404") || err?.statusCode === 404) {
        setCandidatesFeatureEnabled(false)
        setCandidates([])
      } else {
        console.error("Failed to load candidates:", err)
        toast.error("Failed to load candidates")
      }
    } finally {
      setLoadingCandidates(false)
    }
  }

  const handleSelectRequest = async (requestId: string) => {
    if (!storeId) return
    try {
      const request = await getRequest(storeId, requestId)
      setSelectedRequest(request)
    } catch (err: any) {
      toast.error(err?.message || "Failed to load request details")
    }
  }

  const handleVolunteer = async () => {
    if (!storeId || !selectedRequest) return

    try {
      await addCandidate(storeId, selectedRequest.id, volunteerNote || undefined)
      toast.success("You've volunteered to cover this shift")
      setVolunteerNote("")
      await loadCandidates()
      await loadRequests()
    } catch (err: any) {
      toast.error(err?.message || "Failed to volunteer")
    }
  }

  const handleWithdraw = async () => {
    if (!storeId || !selectedRequest || !userId) return

    const myCandidate = candidates.find((c) => c.userId === userId)
    if (!myCandidate) return

    try {
      await removeCandidate(storeId, selectedRequest.id, myCandidate.id)
      toast.success("You've withdrawn from covering this shift")
      await loadCandidates()
      await loadRequests()
    } catch (err: any) {
      toast.error(err?.message || "Failed to withdraw")
    }
  }

  const handleApprove = async () => {
    if (!storeId || !selectedRequest) return

    setIsProcessing(true)
    try {
      const payload: { chosenUserId?: string; decisionNote?: string } = {
        decisionNote: decisionNote || undefined,
      }

      // For COVER requests, require chosenUserId
      if (selectedRequest.type === "SHIFT_COVER_REQUEST") {
        if (!chosenUserId) {
          toast.error("Please select a candidate or member to approve this cover request")
          setIsProcessing(false)
          return
        }
        payload.chosenUserId = chosenUserId
      }

      await approveRequest(storeId, selectedRequest.id, payload)
      toast.success("Request approved successfully")
      setApproveModalOpen(false)
      setDecisionNote("")
      setChosenUserId("")
      setSelectedRequest(null)
      await loadRequests()
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to approve request"
      toast.error(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!storeId || !selectedRequest) return

    setIsProcessing(true)
    try {
      await rejectRequest(storeId, selectedRequest.id, {
        decisionNote: decisionNote || undefined,
      })
      toast.success("Request rejected")
      setRejectModalOpen(false)
      setDecisionNote("")
      setSelectedRequest(null)
      await loadRequests()
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to reject request"
      toast.error(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = async (requestId: string) => {
    if (!storeId) return

    if (!confirm("Are you sure you want to cancel this request?")) {
      return
    }

    try {
      await cancelRequest(storeId, requestId)
      toast.success("Request canceled")
      if (selectedRequest?.id === requestId) {
        setSelectedRequest(null)
      }
      await loadRequests()
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to cancel request"
      toast.error(errorMessage)
    }
  }

  if (authLoading || !storeId) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 pl-64">
          <Topbar />
          <main className="p-6">
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  const isManagerOrOwner = userRole === "OWNER" || userRole === "MANAGER"
  const isMyRequest = selectedRequest?.createdById === userId

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 pl-64">
        <Topbar />
        <main className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Requests</h1>
            <p className="text-muted-foreground mt-2">
              {userRole === "WORKER" ? "My change requests" : "Manage change requests"}
            </p>
          </div>

          {/* Filters */}
          <div className="mb-4 flex gap-2 flex-wrap">
            <div className="flex gap-2">
              {(["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELED"] as const).map((status) => (
                <Button
                  key={status}
                  variant={selectedStatus === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStatus(status)}
                >
                  {status === "ALL" ? "All" : statusConfig[status].label}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              {(["ALL", "SHIFT_TIME_CHANGE", "SHIFT_DROP_REQUEST", "SHIFT_COVER_REQUEST", "SHIFT_SWAP_REQUEST"] as const).map(
                (type) => (
                  <Button
                    key={type}
                    variant={selectedType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedType(type)}
                  >
                    {type === "ALL" ? "All Types" : typeLabels[type]}
                  </Button>
                )
              )}
            </div>
          </div>

          {/* Error state */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Split view */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left: Requests table */}
            <div className="lg:col-span-7">
              <Card>
                <CardHeader>
                  <CardTitle>Change Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : requests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No requests found</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Shift Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {requests.map((request) => {
                          const statusInfo = statusConfig[request.status]
                          const StatusIcon = statusInfo.icon
                          const isSelected = selectedRequest?.id === request.id

                          return (
                            <TableRow
                              key={request.id}
                              className={isSelected ? "bg-muted" : "cursor-pointer"}
                              onClick={() => handleSelectRequest(request.id)}
                            >
                              <TableCell>{typeLabels[request.type]}</TableCell>
                              <TableCell>
                                {request.shift
                                  ? new Date(request.shift.date).toLocaleDateString()
                                  : "N/A"}
                              </TableCell>
                              <TableCell>
                                <Badge variant={statusInfo.variant}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {statusInfo.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {new Date(request.createdAt).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right: Detail panel */}
            <div className="lg:col-span-5">
              {selectedRequest ? (
                <Card>
                  <CardHeader>
                    <CardTitle>{typeLabels[selectedRequest.type]}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Status */}
                    <div>
                      <Label>Status</Label>
                      <div className="mt-1">
                        <Badge variant={statusConfig[selectedRequest.status].variant}>
                          {statusConfig[selectedRequest.status].label}
                        </Badge>
                      </div>
                    </div>

                    {/* Shift info */}
                    {selectedRequest.shift && (
                      <div>
                        <Label>Shift</Label>
                        <p className="text-sm mt-1">
                          {selectedRequest.shift.user?.name || "Unknown"} -{" "}
                          {new Date(selectedRequest.shift.date).toLocaleDateString()} (
                          {selectedRequest.shift.startTime} - {selectedRequest.shift.endTime})
                        </p>
                      </div>
                    )}

                    {/* Type-specific content */}
                    {selectedRequest.type === "SHIFT_TIME_CHANGE" && (
                      <div>
                        <Label>Proposed Time</Label>
                        <p className="text-sm mt-1">
                          {selectedRequest.proposedStartTime} - {selectedRequest.proposedEndTime}
                          {selectedRequest.proposedBreakMins !== null &&
                            selectedRequest.proposedBreakMins !== undefined && (
                              <> ({selectedRequest.proposedBreakMins} min break)</>
                            )}
                        </p>
                      </div>
                    )}

                    {selectedRequest.type === "SHIFT_DROP_REQUEST" && (
                      <div>
                        <Label>Request</Label>
                        <p className="text-sm mt-1">Cancel this shift</p>
                      </div>
                    )}

                    {selectedRequest.type === "SHIFT_SWAP_REQUEST" && (
                      <div>
                        <Label>Swap Shift</Label>
                        <p className="text-sm mt-1">
                          {selectedRequest.swapShiftId || "N/A"}
                          {selectedRequest.swapShift && (
                            <>
                              <br />
                              Swap with: {selectedRequest.swapShift.user?.name || "Unknown"} -{" "}
                              {new Date(selectedRequest.swapShift.date).toLocaleDateString()} (
                              {selectedRequest.swapShift.startTime} - {selectedRequest.swapShift.endTime})
                            </>
                          )}
                        </p>
                      </div>
                    )}

                    {/* COVER request - candidates */}
                    {selectedRequest.type === "SHIFT_COVER_REQUEST" && (
                      <div>
                        <Label>Cover Request</Label>
                        {!candidatesFeatureEnabled && (
                          <Alert className="mt-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              Candidates feature is not enabled on server. Use member dropdown below.
                            </AlertDescription>
                          </Alert>
                        )}
                        {loadingCandidates ? (
                          <p className="text-sm text-muted-foreground mt-2">Loading candidates...</p>
                        ) : candidates.length > 0 ? (
                          <div className="mt-2 space-y-2">
                            <Label className="text-xs">Volunteers:</Label>
                            {candidates.map((candidate) => (
                              <div key={candidate.id} className="p-2 border rounded text-sm">
                                <div className="font-medium">
                                  {candidate.userName || candidate.email || candidate.userId}
                                </div>
                                {candidate.note && (
                                  <div className="text-muted-foreground text-xs mt-1">{candidate.note}</div>
                                )}
                                <div className="text-muted-foreground text-xs mt-1">
                                  {new Date(candidate.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground mt-2">No volunteers yet</p>
                        )}

                        {/* Volunteer button for workers */}
                        {userRole === "WORKER" &&
                          selectedRequest.status === "PENDING" &&
                          selectedRequest.createdById !== userId && (
                            <div className="mt-4 space-y-2">
                              {!isVolunteering ? (
                                <>
                                  <Textarea
                                    placeholder="Optional note..."
                                    value={volunteerNote}
                                    onChange={(e) => setVolunteerNote(e.target.value)}
                                    className="text-sm"
                                  />
                                  <Button size="sm" onClick={handleVolunteer} className="w-full">
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Volunteer to Cover
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleWithdraw}
                                  className="w-full"
                                >
                                  <UserMinus className="h-4 w-4 mr-2" />
                                  Withdraw
                                </Button>
                              )}
                            </div>
                          )}
                      </div>
                    )}

                    {/* Reason */}
                    {selectedRequest.reason && (
                      <div>
                        <Label>Reason</Label>
                        <p className="text-sm mt-1">{selectedRequest.reason}</p>
                      </div>
                    )}

                    {/* Decision note */}
                    {selectedRequest.decisionNote && (
                      <div>
                        <Label>Decision Note</Label>
                        <p className="text-sm mt-1">{selectedRequest.decisionNote}</p>
                      </div>
                    )}

                    {/* Actions */}
                    {selectedRequest.status === "PENDING" && (
                      <div className="pt-4 border-t space-y-2">
                        {isManagerOrOwner && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                setChosenUserId("")
                                setDecisionNote("")
                                setApproveModalOpen(true)
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                setDecisionNote("")
                                setRejectModalOpen(true)
                              }}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {isMyRequest && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleCancel(selectedRequest.id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Select a request to view details
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Approve modal */}
      <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Request</DialogTitle>
            <DialogDescription>
              {selectedRequest?.type === "SHIFT_COVER_REQUEST"
                ? "Select a candidate and add an optional note"
                : "Add an optional note for this approval"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedRequest?.type === "SHIFT_COVER_REQUEST" && (
              <div>
                <Label>Choose Candidate</Label>
                {candidatesFeatureEnabled && candidates.length > 0 ? (
                  <RadioGroup
                    value={chosenUserId}
                    onValueChange={setChosenUserId}
                    className="mt-2"
                  >
                    {candidates.map((candidate) => (
                      <div key={candidate.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={candidate.userId} id={candidate.id} />
                        <Label htmlFor={candidate.id} className="cursor-pointer">
                          {candidate.userName || candidate.email || candidate.userId}
                          {candidate.note && (
                            <span className="text-xs text-muted-foreground ml-2">({candidate.note})</span>
                          )}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <Select value={chosenUserId} onValueChange={setChosenUserId} className="mt-2">
                    <SelectTrigger>
                      <SelectValue placeholder="Select a member" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} ({member.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            <div>
              <Label htmlFor="approve-note">Decision Note (Optional)</Label>
              <Textarea
                id="approve-note"
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                placeholder="Add a note about this approval..."
                disabled={isProcessing}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveModalOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={isProcessing}>
              {isProcessing ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>Add an optional note explaining the rejection</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-note">Decision Note (Optional)</Label>
              <Textarea
                id="reject-note"
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                placeholder="Add a note about this rejection..."
                disabled={isProcessing}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModalOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isProcessing}>
              {isProcessing ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
