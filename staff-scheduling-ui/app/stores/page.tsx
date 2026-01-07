"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { StoreList } from "@/components/store-list"
import { MemberTable } from "@/components/member-table"
import { CreateStoreModal } from "@/components/modals/create-store-modal"
import { EditStoreModal } from "@/components/modals/edit-store-modal"
import { InviteMemberModal } from "@/components/modals/invite-member-modal"
import { EditMemberModal } from "@/components/modals/edit-member-modal"
import { Sidebar } from "@/components/sidebar"
import { Topbar } from "@/components/topbar"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { storesApi, membershipsApi } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import type { Store, Member } from "@/lib/types"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function StoresPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [stores, setStores] = useState<Store[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)
  const [createStoreOpen, setCreateStoreOpen] = useState(false)
  const [editStoreOpen, setEditStoreOpen] = useState(false)
  const [inviteMemberOpen, setInviteMemberOpen] = useState(false)
  const [editMemberOpen, setEditMemberOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  // Check authentication
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
      return
    }
    if (isAuthenticated && !authLoading) {
      loadStores()
    }
  }, [router, isAuthenticated, authLoading])

  const loadStores = async () => {
    try {
      setIsLoading(true)
      setError("")
      const data = await storesApi.getStores()
      const formattedStores: Store[] = data.map((store) => ({
        id: store.id,
        name: store.name,
        timezone: store.timezone,
        location: store.location || undefined,
        specialCode: store.specialCode || 'N/A',
        myRole: (store.role || "WORKER") as "OWNER" | "MANAGER" | "WORKER",
      }))
      setStores(formattedStores)
      if (formattedStores.length > 0 && !selectedStoreId) {
        setSelectedStoreId(formattedStores[0].id)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load stores"
      setError(errorMessage)
      console.error("Failed to load stores:", err)
      if (err instanceof Error && (err.message.includes("401") || err.message.includes("Unauthorized"))) {
        router.push("/login")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const loadMembers = async (storeId: string) => {
    try {
      const data = await membershipsApi.getStoreMembers(storeId)
      const formattedMembers: Member[] = data.map((membership) => ({
        id: membership.id, // Use membership.id instead of user.id for member identification
        name: membership.user.name,
        email: membership.user.email,
        role: membership.role,
        status: "ACTIVE" as const,
        position: membership.position || undefined,
        skills: membership.skills || [],
      }))
      setMembers(formattedMembers)
    } catch (err) {
      console.error("Failed to load members:", err)
      setMembers([])
    }
  }

  useEffect(() => {
    if (selectedStoreId) {
      loadMembers(selectedStoreId)
    }
  }, [selectedStoreId])

  const handleCreateStore = async (data: { name: string; timezone: string; location?: string; specialCode: string }) => {
    try {
      await storesApi.createStore(data)
      await loadStores()
      setCreateStoreOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create store")
    }
  }

  const handleUpdateStore = async (data: { name: string; timezone: string; location?: string; specialCode: string }) => {
    if (!selectedStoreId) return
    try {
      await storesApi.updateStore(selectedStoreId, data)
      await loadStores()
      setEditStoreOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update store")
    }
  }

  const handleInviteMember = async (data: { email: string; role: "OWNER" | "MANAGER" | "WORKER"; permissions?: string[]; position?: string; skills?: string[] }) => {
    if (!selectedStoreId) return
    try {
      await membershipsApi.createMembership(selectedStoreId, data)
      await loadMembers(selectedStoreId)
      setInviteMemberOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite member")
    }
  }

  const handleChangeRole = async (memberId: string, newRole: "OWNER" | "MANAGER" | "WORKER") => {
    if (!selectedStoreId) return
    try {
      await membershipsApi.updateMembership(selectedStoreId, memberId, { role: newRole })
      await loadMembers(selectedStoreId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change role")
    }
  }

  const handleEditMember = (member: Member) => {
    setSelectedMember(member)
    setEditMemberOpen(true)
  }

  const handleUpdateMember = async (data: { position?: string; skills?: string[] }) => {
    if (!selectedStoreId || !selectedMember) return
    try {
      await membershipsApi.updateMembership(selectedStoreId, selectedMember.id, data)
      await loadMembers(selectedStoreId)
      setEditMemberOpen(false)
      setSelectedMember(null)
      toast.success("Member updated successfully")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update member")
      toast.error(err instanceof Error ? err.message : "Failed to update member")
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedStoreId) return
    if (!confirm("Are you sure you want to remove this member?")) {
      return
    }
    try {
      await membershipsApi.deleteMembership(selectedStoreId, memberId)
      await loadMembers(selectedStoreId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member")
    }
  }

  const handleDeleteStore = async (storeId: string) => {
    if (!confirm("Are you sure you want to delete this store? This action cannot be undone and will delete all associated data (shifts, schedules, documents, etc.).")) {
      return
    }
    try {
      await storesApi.deleteStore(storeId)
      await loadStores()
      if (selectedStoreId === storeId) {
        setSelectedStoreId(null)
      }
      toast.success("Store deleted successfully")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete store")
      toast.error(err instanceof Error ? err.message : "Failed to delete store")
    }
  }

  const selectedStore = stores.find((s) => s.id === selectedStoreId)

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 pl-64">
          <Topbar />
          <main className="p-6">
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Loading stores...</p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 pl-64">
        <Topbar />
        <main className="p-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold">Stores</h1>
            <Button onClick={() => setCreateStoreOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Store
            </Button>
          </div>

          {/* Two-column layout */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left: Store list */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Your Stores</CardTitle>
                </CardHeader>
                <CardContent>
                  <StoreList stores={stores} selectedStoreId={selectedStoreId} onSelectStore={setSelectedStoreId} />
                </CardContent>
              </Card>
            </div>

            {/* Right: Store detail */}
            <div className="lg:col-span-2">
              {selectedStore ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle>{selectedStore.name}</CardTitle>
                        <CardDescription className="mt-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{selectedStore.timezone}</Badge>
                            {selectedStore.specialCode && (
                              <Badge variant="secondary">Code: {selectedStore.specialCode}</Badge>
                            )}
                          </div>
                          {selectedStore.location && (
                            <p className="text-sm text-muted-foreground mt-1">{selectedStore.location}</p>
                          )}
                        </CardDescription>
                      </div>
                      {selectedStore.myRole === "OWNER" && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditStoreOpen(true)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteStore(selectedStore.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="members">
                      <TabsList>
                        <TabsTrigger value="members">Members</TabsTrigger>
                        <TabsTrigger value="rules">Labor Rules</TabsTrigger>
                        <TabsTrigger value="integrations">Integrations</TabsTrigger>
                      </TabsList>
                      <TabsContent value="members" className="space-y-4">
                        <div className="flex justify-end">
                          <Button onClick={() => setInviteMemberOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Invite Member
                          </Button>
                        </div>
                        <MemberTable 
                          members={members} 
                          onChangeRole={handleChangeRole}
                          onRemove={handleRemoveMember}
                          onEdit={handleEditMember}
                        />
                      </TabsContent>
                      <TabsContent value="rules">
                        <div className="rounded-lg border border-dashed p-12 text-center">
                          <p className="text-sm text-muted-foreground">Labor rules configuration coming soon.</p>
                        </div>
                      </TabsContent>
                      <TabsContent value="integrations">
                        <div className="rounded-lg border border-dashed p-12 text-center">
                          <p className="text-sm text-muted-foreground">Integrations configuration coming soon.</p>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex h-64 items-center justify-center">
                    <p className="text-muted-foreground">Select a store to view details</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      <CreateStoreModal open={createStoreOpen} onOpenChange={setCreateStoreOpen} onSubmit={handleCreateStore} />
      <EditStoreModal
        open={editStoreOpen}
        onOpenChange={setEditStoreOpen}
        store={selectedStore || null}
        onSubmit={handleUpdateStore}
      />
      <InviteMemberModal open={inviteMemberOpen} onOpenChange={setInviteMemberOpen} onSubmit={handleInviteMember} />
      <EditMemberModal
        open={editMemberOpen}
        onOpenChange={setEditMemberOpen}
        member={selectedMember}
        onSubmit={handleUpdateMember}
      />
    </div>
  )
}
