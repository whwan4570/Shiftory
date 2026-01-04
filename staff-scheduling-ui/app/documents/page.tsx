"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Sidebar } from "@/components/sidebar"
import { Topbar } from "@/components/topbar"
import { useAuth } from "@/hooks/useAuth"
import { DocumentCard } from "@/components/documents/document-card"
import { SubmitComplianceModal } from "@/components/documents/submit-compliance-modal"
import { CreateDocumentModal } from "@/components/documents/create-document-modal"
import { ReviewSubmissionRow } from "@/components/documents/review-submission-row"
import {
  listDocuments,
  getDocument,
  ackDocument,
  createDocument,
  updateDocument,
} from "@/lib/documentsApi"
import { submitMy, listMy, adminList, approve, reject, expiring, expired } from "@/lib/submissionsApi"
import { storesApi, membershipsApi } from "@/lib/api"
import type {
  Document,
  DocumentSubmission,
  DocumentType,
  SubmissionStatus,
  MissingItem,
} from "@/types/documents"
import { toast } from "sonner"
import { AlertCircle, Plus, RefreshCw, ExternalLink, Edit, CheckCircle2, XCircle } from "lucide-react"

type DocumentTab = "MY_DOCS" | "MY_COMPLIANCE" | "ADMIN_DOCS" | "ADMIN_REVIEW"

export default function DocumentsPage() {
  const router = useRouter()
  const { storeId, isLoading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<DocumentTab>("MY_DOCS")
  const [userRole, setUserRole] = useState<"OWNER" | "MANAGER" | "WORKER" | null>(null)
  const [members, setMembers] = useState<Array<{ id: string; name: string; email: string }>>([])

  // My Documents state
  const [myDocuments, setMyDocuments] = useState<Document[]>([])
  const [loadingMyDocs, setLoadingMyDocs] = useState(false)
  const [ackingDocId, setAckingDocId] = useState<string | null>(null)

  // My Compliance state
  const [mySubmissions, setMySubmissions] = useState<DocumentSubmission[]>([])
  const [loadingMySubmissions, setLoadingMySubmissions] = useState(false)
  const [submitModalOpen, setSubmitModalOpen] = useState(false)

  // Admin Documents state
  const [allDocuments, setAllDocuments] = useState<Document[]>([])
  const [loadingAllDocs, setLoadingAllDocs] = useState(false)
  const [docTypeFilter, setDocTypeFilter] = useState<DocumentType | "ALL">("ALL")
  const [createDocModalOpen, setCreateDocModalOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<Document | null>(null)
  const [editDocModalOpen, setEditDocModalOpen] = useState(false)

  // Admin Review state
  const [reviewTypeFilter, setReviewTypeFilter] = useState<"HEALTH_CERT" | "HYGIENE_TRAINING" | "ALL">("ALL")
  const [reviewStatusFilter, setReviewStatusFilter] = useState<SubmissionStatus | "ALL">("SUBMITTED")
  const [submittedSubmissions, setSubmittedSubmissions] = useState<DocumentSubmission[]>([])
  const [expiringSubmissions, setExpiringSubmissions] = useState<DocumentSubmission[]>([])
  const [expiredSubmissions, setExpiredSubmissions] = useState<DocumentSubmission[]>([])
  const [missingItems, setMissingItems] = useState<MissingItem[]>([])
  const [loadingReview, setLoadingReview] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [selectedSubmissionForReject, setSelectedSubmissionForReject] = useState<DocumentSubmission | null>(null)
  const [rejectNote, setRejectNote] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [missingFeatureEnabled, setMissingFeatureEnabled] = useState(true)

  // Redirect if no storeId
  useEffect(() => {
    if (!authLoading && !storeId) {
      router.replace("/stores")
    }
  }, [storeId, authLoading, router])

  // Load user role and members
  useEffect(() => {
    if (storeId && !authLoading) {
      loadUserRole()
      loadMembers()
    }
  }, [storeId, authLoading])

  // Load data based on active tab
  useEffect(() => {
    if (storeId && !authLoading && userRole) {
      if (activeTab === "MY_DOCS") {
        loadMyDocuments()
      } else if (activeTab === "MY_COMPLIANCE") {
        loadMySubmissions()
      } else if (activeTab === "ADMIN_DOCS" && (userRole === "OWNER" || userRole === "MANAGER")) {
        loadAllDocuments()
      } else if (activeTab === "ADMIN_REVIEW" && (userRole === "OWNER" || userRole === "MANAGER")) {
        loadReviewData()
      }
    }
  }, [storeId, authLoading, userRole, activeTab, docTypeFilter, reviewTypeFilter, reviewStatusFilter])

  const loadUserRole = async () => {
    if (!storeId) return
    try {
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

  const loadMyDocuments = async () => {
    if (!storeId) return

    setLoadingMyDocs(true)
    try {
      const docs = await listDocuments(storeId)
      setMyDocuments(docs)
    } catch (err: any) {
      console.error("Failed to load documents:", err)
      toast.error(err?.message || "Failed to load documents")
    } finally {
      setLoadingMyDocs(false)
    }
  }

  const loadMySubmissions = async () => {
    if (!storeId) return

    setLoadingMySubmissions(true)
    try {
      const submissions = await listMy(storeId)
      setMySubmissions(submissions)
    } catch (err: any) {
      console.error("Failed to load submissions:", err)
      toast.error(err?.message || "Failed to load submissions")
    } finally {
      setLoadingMySubmissions(false)
    }
  }

  const loadAllDocuments = async () => {
    if (!storeId) return

    setLoadingAllDocs(true)
    try {
      const docs = await listDocuments(storeId, docTypeFilter !== "ALL" ? docTypeFilter : undefined)
      setAllDocuments(docs)
    } catch (err: any) {
      console.error("Failed to load documents:", err)
      toast.error(err?.message || "Failed to load documents")
    } finally {
      setLoadingAllDocs(false)
    }
  }

  const loadReviewData = async () => {
    if (!storeId) return

    setLoadingReview(true)
    try {
      // Load submitted submissions
      const submitted = await adminList(storeId, {
        status: "SUBMITTED",
        type: reviewTypeFilter !== "ALL" ? reviewTypeFilter : undefined,
      })
      setSubmittedSubmissions(Array.isArray(submitted) ? submitted : submitted.submissions || [])

      // Load expiring
      const expiringData = await expiring(
        storeId,
        reviewTypeFilter !== "ALL" ? reviewTypeFilter : undefined,
        30
      )
      setExpiringSubmissions(expiringData)

      // Load expired
      const expiredData = await expired(storeId, reviewTypeFilter !== "ALL" ? reviewTypeFilter : undefined)
      setExpiredSubmissions(expiredData)

      // Load missing (if supported)
      try {
        const missingData = await adminList(storeId, {
          missing: true,
          type: reviewTypeFilter !== "ALL" ? reviewTypeFilter : undefined,
        })
        if (!Array.isArray(missingData) && missingData.missing) {
          setMissingItems(missingData.missing)
          setMissingFeatureEnabled(true)
        } else {
          setMissingItems([])
          setMissingFeatureEnabled(false)
        }
      } catch (err: any) {
        if (err?.message?.includes("404") || err?.statusCode === 404) {
          setMissingFeatureEnabled(false)
          setMissingItems([])
        } else {
          throw err
        }
      }
    } catch (err: any) {
      console.error("Failed to load review data:", err)
      toast.error(err?.message || "Failed to load review data")
    } finally {
      setLoadingReview(false)
    }
  }

  const handleAck = async (documentId: string) => {
    if (!storeId) return

    setAckingDocId(documentId)
    try {
      await ackDocument(storeId, documentId)
      toast.success("Document acknowledged")
      await loadMyDocuments()
    } catch (err: any) {
      toast.error(err?.message || "Failed to acknowledge document")
    } finally {
      setAckingDocId(null)
    }
  }

  const handleApproveSubmission = async (submissionId: string) => {
    if (!storeId) return

    setIsProcessing(true)
    try {
      await approve(storeId, submissionId)
      toast.success("Submission approved")
      await loadReviewData()
      await loadMySubmissions() // Refresh worker's view if they're viewing
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve submission")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRejectSubmission = async () => {
    if (!storeId || !selectedSubmissionForReject) return

    setIsProcessing(true)
    try {
      await reject(storeId, selectedSubmissionForReject.id, {
        decisionNote: rejectNote || undefined,
      })
      toast.success("Submission rejected")
      setRejectModalOpen(false)
      setRejectNote("")
      setSelectedSubmissionForReject(null)
      await loadReviewData()
      await loadMySubmissions() // Refresh worker's view if they're viewing
    } catch (err: any) {
      toast.error(err?.message || "Failed to reject submission")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleEditDocument = async (documentId: string) => {
    if (!storeId) return
    try {
      const doc = await getDocument(storeId, documentId)
      setEditingDoc(doc as Document)
      setEditDocModalOpen(true)
    } catch (err: any) {
      toast.error(err?.message || "Failed to load document")
    }
  }

  const handleUpdateDocument = async (payload: { title?: string; fileUrl?: string; targetUserIds?: string[] | "ALL" }) => {
    if (!storeId || !editingDoc) return

    setIsProcessing(true)
    try {
      await updateDocument(storeId, editingDoc.id, payload)
      toast.success("Document updated")
      setEditDocModalOpen(false)
      setEditingDoc(null)
      await loadAllDocuments()
    } catch (err: any) {
      toast.error(err?.message || "Failed to update document")
    } finally {
      setIsProcessing(false)
    }
  }

  // Check submission state
  const getSubmissionState = (submission: DocumentSubmission): "EXPIRED" | "EXPIRING_SOON" | null => {
    if (!submission.expiresAt) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiresAt = new Date(submission.expiresAt)
    if (expiresAt < today) return "EXPIRED"
    const daysUntilExpiry = Math.ceil((expiresAt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntilExpiry <= 30) return "EXPIRING_SOON"
    return null
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

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 pl-64">
        <Topbar />
        <main className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Documents & Compliance</h1>
            <p className="text-muted-foreground mt-2">
              Manage documents and compliance submissions
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DocumentTab)} className="mb-6">
            <TabsList>
              <TabsTrigger value="MY_DOCS">My Documents</TabsTrigger>
              <TabsTrigger value="MY_COMPLIANCE">My Compliance</TabsTrigger>
              {isManagerOrOwner && <TabsTrigger value="ADMIN_DOCS">Admin: Documents</TabsTrigger>}
              {isManagerOrOwner && <TabsTrigger value="ADMIN_REVIEW">Admin: Compliance Review</TabsTrigger>}
            </TabsList>

          {/* Tab 1: My Documents */}
          <TabsContent value="MY_DOCS" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">My Documents</h2>
              <Button variant="outline" size="icon" onClick={loadMyDocuments} disabled={loadingMyDocs}>
                <RefreshCw className={`h-4 w-4 ${loadingMyDocs ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {loadingMyDocs ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : myDocuments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No documents assigned
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {myDocuments.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    onAck={handleAck}
                    isAcking={ackingDocId === doc.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab 2: My Compliance */}
          <TabsContent value="MY_COMPLIANCE" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">My Compliance</h2>
              <div className="flex gap-2">
                <Button onClick={() => setSubmitModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Submit Document
                </Button>
                <Button variant="outline" size="icon" onClick={loadMySubmissions} disabled={loadingMySubmissions}>
                  <RefreshCw className={`h-4 w-4 ${loadingMySubmissions ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {loadingMySubmissions ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : mySubmissions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No submissions yet. Submit a document to get started.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {mySubmissions.map((submission) => {
                  const state = getSubmissionState(submission)
                  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
                    SUBMITTED: { label: "Submitted", variant: "secondary" },
                    APPROVED: { label: "Approved", variant: "default" },
                    REJECTED: { label: "Rejected", variant: "destructive" },
                    EXPIRED: { label: "Expired", variant: "outline" },
                  }
                  const statusInfo = statusConfig[submission.status] || { label: submission.status, variant: "outline" as const }

                  return (
                    <Card key={submission.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">
                                {submission.type === "HEALTH_CERT" ? "Health Certificate" : "Hygiene Training"}
                              </span>
                              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                              {state === "EXPIRED" && <Badge variant="destructive">Expired</Badge>}
                              {state === "EXPIRING_SOON" && <Badge variant="secondary">Expiring Soon</Badge>}
                            </div>
                            {submission.expiresAt && (
                              <p className="text-sm text-muted-foreground">
                                Expires: {new Date(submission.expiresAt).toLocaleDateString()}
                              </p>
                            )}
                            {submission.status === "REJECTED" && submission.note && (
                              <p className="text-sm text-red-600">Note: {submission.note}</p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(submission.fileUrl, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Tab 3: Admin Documents */}
          {isManagerOrOwner && (
            <TabsContent value="ADMIN_DOCS" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">Documents</h2>
                  <Select value={docTypeFilter} onValueChange={(v) => setDocTypeFilter(v as DocumentType | "ALL")}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Types</SelectItem>
                      <SelectItem value="CONTRACT">Contract</SelectItem>
                      <SelectItem value="POLICY">Policy</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setCreateDocModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Document
                  </Button>
                  <Button variant="outline" size="icon" onClick={loadAllDocuments} disabled={loadingAllDocs}>
                    <RefreshCw className={`h-4 w-4 ${loadingAllDocs ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>

              {loadingAllDocs ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : allDocuments.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No documents. Create one to get started.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {allDocuments.map((doc) => (
                    <Card key={doc.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{doc.title}</h4>
                              <Badge variant="outline">{doc.type}</Badge>
                              <Badge variant="secondary">v{doc.version}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Created: {new Date(doc.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(doc.fileUrl, "_blank")}
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Open
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditDocument(doc.id)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {/* Tab 4: Admin Review */}
          {isManagerOrOwner && (
            <TabsContent value="ADMIN_REVIEW" className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">Compliance Review</h2>
                  <Select
                    value={reviewTypeFilter}
                    onValueChange={(v) => setReviewTypeFilter(v as "HEALTH_CERT" | "HYGIENE_TRAINING" | "ALL")}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Types</SelectItem>
                      <SelectItem value="HEALTH_CERT">Health Cert</SelectItem>
                      <SelectItem value="HYGIENE_TRAINING">Hygiene Training</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={reviewStatusFilter}
                    onValueChange={(v) => setReviewStatusFilter(v as SubmissionStatus | "ALL")}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Status</SelectItem>
                      <SelectItem value="SUBMITTED">Submitted</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                      <SelectItem value="EXPIRED">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="icon" onClick={loadReviewData} disabled={loadingReview}>
                  <RefreshCw className={`h-4 w-4 ${loadingReview ? "animate-spin" : ""}`} />
                </Button>
              </div>

              {loadingReview ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <div className="space-y-6">
                  {/* Submitted (Needs Review) */}
                  {reviewStatusFilter === "ALL" || reviewStatusFilter === "SUBMITTED" ? (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Submitted (Needs Review)</h3>
                      {submittedSubmissions.length === 0 ? (
                        <Card>
                          <CardContent className="py-8 text-center text-muted-foreground">
                            No submissions pending review
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="space-y-2">
                          {submittedSubmissions.map((submission) => (
                            <ReviewSubmissionRow
                              key={submission.id}
                              submission={submission}
                              onApprove={handleApproveSubmission}
                              onReject={(id) => {
                                setSelectedSubmissionForReject(submittedSubmissions.find((s) => s.id === id) || null)
                                setRejectModalOpen(true)
                              }}
                              isProcessing={isProcessing}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Expiring Soon */}
                  {expiringSubmissions.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Expiring Soon (within 30 days)</h3>
                      <div className="space-y-2">
                        {expiringSubmissions.map((submission) => (
                          <ReviewSubmissionRow
                            key={submission.id}
                            submission={submission}
                            onApprove={handleApproveSubmission}
                            onReject={(id) => {
                              setSelectedSubmissionForReject(expiringSubmissions.find((s) => s.id === id) || null)
                              setRejectModalOpen(true)
                            }}
                            isProcessing={isProcessing}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expired */}
                  {expiredSubmissions.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Expired</h3>
                      <div className="space-y-2">
                        {expiredSubmissions.map((submission) => (
                          <ReviewSubmissionRow
                            key={submission.id}
                            submission={submission}
                            onApprove={handleApproveSubmission}
                            onReject={(id) => {
                              setSelectedSubmissionForReject(expiredSubmissions.find((s) => s.id === id) || null)
                              setRejectModalOpen(true)
                            }}
                            isProcessing={isProcessing}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing */}
                  {!missingFeatureEnabled && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Missing list is not available on server
                      </AlertDescription>
                    </Alert>
                  )}
                  {missingFeatureEnabled && missingItems.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Missing Documents</h3>
                      <Card>
                        <CardContent className="p-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Employee</TableHead>
                                <TableHead>Missing Type</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {missingItems.map((item) => (
                                <TableRow key={`${item.userId}-${item.missingType}`}>
                                  <TableCell>
                                    {item.name || item.email || item.userId}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{item.missingType}</Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          )}
          </Tabs>
        </main>
      </div>

      {/* Modals */}
      <SubmitComplianceModal
        open={submitModalOpen}
        onOpenChange={setSubmitModalOpen}
        storeId={storeId!}
        onSuccess={loadMySubmissions}
      />

      <CreateDocumentModal
        open={createDocModalOpen}
        onOpenChange={setCreateDocModalOpen}
        storeId={storeId!}
        members={members}
        onSuccess={loadAllDocuments}
      />

      {/* Edit Document Modal */}
      {editingDoc && (
        <EditDocumentModal
          open={editDocModalOpen}
          onOpenChange={setEditDocModalOpen}
          storeId={storeId!}
          document={editingDoc}
          members={members}
          onUpdate={handleUpdateDocument}
          isProcessing={isProcessing}
        />
      )}

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
            <DialogDescription>Add a note explaining the rejection</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-note">Decision Note (Optional)</Label>
              <Textarea
                id="reject-note"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Explain why this submission is rejected..."
                disabled={isProcessing}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModalOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectSubmission} disabled={isProcessing}>
              {isProcessing ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Edit Document Modal Component
function EditDocumentModal({
  open,
  onOpenChange,
  storeId,
  document,
  members,
  onUpdate,
  isProcessing,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  document: Document
  members: Array<{ id: string; name: string; email: string }>
  onUpdate: (payload: { title?: string; fileUrl?: string; targetUserIds?: string[] | "ALL" }) => void
  isProcessing: boolean
}) {
  const [title, setTitle] = useState(document.title)
  const [fileUrl, setFileUrl] = useState(document.fileUrl)
  const [targetAll, setTargetAll] = useState(true)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setTitle(document.title)
      setFileUrl(document.fileUrl)
      // Note: We don't have target info in Document, so default to ALL
      setTargetAll(true)
      setSelectedUserIds([])
      setError("")
    }
  }, [open, document])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!title) {
      setError("Title is required")
      return
    }

    if (!fileUrl) {
      setError("File URL is required")
      return
    }

    onUpdate({
      title,
      fileUrl,
      targetUserIds: targetAll ? "ALL" : selectedUserIds,
    })
  }

  const toggleUserId = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId))
    } else {
      setSelectedUserIds([...selectedUserIds, userId])
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>Update document details and targeting</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  setError("")
                }}
                required
                disabled={isProcessing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-fileUrl">File URL *</Label>
              <Input
                id="edit-fileUrl"
                type="url"
                value={fileUrl}
                onChange={(e) => {
                  setFileUrl(e.target.value)
                  setError("")
                }}
                placeholder="https://..."
                required
                disabled={isProcessing}
              />
              <p className="text-xs text-muted-foreground">
                Changing the file URL will increment the version
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-targetAll"
                  checked={targetAll}
                  onCheckedChange={(checked) => {
                    setTargetAll(checked === true)
                    if (checked) {
                      setSelectedUserIds([])
                    }
                  }}
                />
                <Label htmlFor="edit-targetAll" className="cursor-pointer">
                  Target all members
                </Label>
              </div>
              {!targetAll && (
                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto border rounded p-2">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-member-${member.id}`}
                        checked={selectedUserIds.includes(member.id)}
                        onCheckedChange={() => toggleUserId(member.id)}
                      />
                      <Label htmlFor={`edit-member-${member.id}`} className="cursor-pointer text-sm">
                        {member.name} ({member.email})
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button type="submit" disabled={isProcessing}>
              {isProcessing ? "Updating..." : "Update Document"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

