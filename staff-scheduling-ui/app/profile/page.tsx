"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Sidebar } from "@/components/sidebar"
import { Topbar } from "@/components/topbar"
import { useAuth } from "@/hooks/useAuth"
import { authApi } from "@/lib/api"
import { AlertCircle, Loader2 } from "lucide-react"
import { format } from "date-fns"

interface UserInfo {
  id: string
  email: string
  name: string
  createdAt: string
  updatedAt: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login")
      return
    }

    if (isAuthenticated) {
      loadUserInfo()
    }
  }, [isAuthenticated, authLoading, router])

  const loadUserInfo = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await authApi.getMe()
      setUserInfo(data)
    } catch (err) {
      console.error("Failed to load user info:", err)
      setError(err instanceof Error ? err.message : "Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 pl-64">
          <Topbar />
          <main className="p-6">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">My Profile</h1>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {userInfo && (
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Your account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={userInfo.name} disabled />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={userInfo.email} disabled />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="userId">User ID</Label>
                    <Input id="userId" value={userInfo.id} disabled />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Account Created</Label>
                      <Input
                        value={userInfo.createdAt ? format(new Date(userInfo.createdAt), "PPP") : "N/A"}
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Updated</Label>
                      <Input
                        value={userInfo.updatedAt ? format(new Date(userInfo.updatedAt), "PPP") : "N/A"}
                        disabled
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

