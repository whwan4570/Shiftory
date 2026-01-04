"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sidebar } from "@/components/sidebar"
import { Topbar } from "@/components/topbar"
import { useAuth } from "@/hooks/useAuth"
import { storesApi, membershipsApi } from "@/lib/api"
import { getMonth } from "@/lib/schedulingApi"
import { getLaborRules } from "@/lib/settingsApi"
import { getQRCode } from "@/lib/totpApi"
import { CheckCircle2, Circle, ArrowRight, Building2, Settings, Calendar, Users, QrCode, CheckSquare } from "lucide-react"
import { toast } from "sonner"

interface ChecklistItem {
  id: string
  title: string
  description: string
  link: string
  icon: React.ReactNode
  completed: boolean
}

export default function OnboardingChecklistPage() {
  const router = useRouter()
  const { storeId, isLoading: authLoading } = useAuth()
  const [userRole, setUserRole] = useState<"OWNER" | "MANAGER" | "WORKER" | null>(null)
  const [loading, setLoading] = useState(true)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])

  // Load user role
  useEffect(() => {
    if (storeId && !authLoading) {
      loadUserRole()
    }
  }, [storeId, authLoading])

  // Load checklist status
  useEffect(() => {
    if (storeId && !authLoading && userRole === "OWNER") {
      loadChecklist()
    }
  }, [storeId, authLoading, userRole])

  const loadUserRole = async () => {
    if (!storeId) return
    try {
      const stores = await storesApi.getStores()
      const store = stores.find((s) => s.id === storeId)
      if (store && "myRole" in store) {
        setUserRole(store.myRole as "OWNER" | "MANAGER" | "WORKER")
      } else if (store && "role" in store) {
        setUserRole(store.role as "OWNER" | "MANAGER" | "WORKER")
      } else {
        setUserRole("WORKER")
      }
    } catch (err) {
      console.error("Failed to load user role:", err)
      setUserRole("WORKER")
    }
  }

  const loadChecklist = async () => {
    if (!storeId) return

    try {
      setLoading(true)

      // 1. Store setup - Check if store has name and location
      let storeSetupCompleted = false
      try {
        const stores = await storesApi.getStores()
        const store = stores.find((s) => s.id === storeId)
        storeSetupCompleted = !!(store && store.name && store.location)
      } catch (err) {
        console.error("Failed to check store setup:", err)
      }

      // 2. Check-in policy - Check if check-in policy is configured
      let checkinPolicyCompleted = false
      try {
        const rules = await getLaborRules(storeId)
        checkinPolicyCompleted = !!(rules.checkinPrimaryMethod && rules.checkinGpsRadius !== undefined)
      } catch (err) {
        console.error("Failed to check check-in policy:", err)
      }

      // 3. Month creation - Check if at least one month exists
      let monthCreationCompleted = false
      try {
        const currentDate = new Date()
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth() + 1
        const monthData = await getMonth(storeId, year, month)
        monthCreationCompleted = monthData !== null
      } catch (err) {
        // Month doesn't exist, not completed
        monthCreationCompleted = false
      }

      // 4. Member invitation - Check if there are at least 2 members (owner + 1 other)
      let memberInvitationCompleted = false
      try {
        const members = await membershipsApi.getStoreMembers(storeId)
        memberInvitationCompleted = members.length >= 2
      } catch (err) {
        console.error("Failed to check members:", err)
      }

      // 5. QR display - Check if TOTP secret exists (optional, so we check if QR endpoint works)
      let qrDisplayCompleted = false
      try {
        await getQRCode(storeId)
        qrDisplayCompleted = true
      } catch (err: any) {
        // If error is 404 or about missing TOTP secret, not completed
        const errorMsg = err?.message || ""
        if (
          errorMsg.includes("404") ||
          errorMsg.includes("not found") ||
          errorMsg.includes("TOTP") ||
          errorMsg.includes("secret")
        ) {
          qrDisplayCompleted = false
        } else {
          // Other errors, try to get store info to check if TOTP is set up
          // For now, we'll consider it not completed if there's an error
          qrDisplayCompleted = false
        }
      }

      // 6. Publish - Check if current month exists and is published
      let publishCompleted = false
      try {
        const currentDate = new Date()
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth() + 1
        const monthData = await getMonth(storeId, year, month)
        // Check if status is PUBLISHED (string comparison)
        publishCompleted = monthData !== null && (monthData.status as string) === "PUBLISHED"
      } catch (err) {
        // Month doesn't exist or not published
        publishCompleted = false
      }

      setChecklist([
        {
          id: "store-setup",
          title: "Store Setup",
          description: "Configure your store name, location, and timezone",
          link: "/stores",
          icon: <Building2 className="h-5 w-5" />,
          completed: storeSetupCompleted,
        },
        {
          id: "checkin-policy",
          title: "Check-in Policy",
          description: "Configure how employees check in and out (GPS/QR, radius, time windows)",
          link: "/settings?tab=checkin-policy",
          icon: <Settings className="h-5 w-5" />,
          completed: checkinPolicyCompleted,
        },
        {
          id: "month-creation",
          title: "Create Schedule Month",
          description: "Create a schedule month for the current or next month",
          link: "/schedule",
          icon: <Calendar className="h-5 w-5" />,
          completed: monthCreationCompleted,
        },
        {
          id: "member-invitation",
          title: "Invite Members",
          description: "Invite employees to your store (at least one member)",
          link: "/stores",
          icon: <Users className="h-5 w-5" />,
          completed: memberInvitationCompleted,
        },
        {
          id: "qr-display",
          title: "QR Code Display",
          description: "Generate and display QR code for check-in (optional but recommended)",
          link: "/qrcode",
          icon: <QrCode className="h-5 w-5" />,
          completed: qrDisplayCompleted,
        },
        {
          id: "publish",
          title: "Publish Schedule",
          description: "Publish your schedule month to make it visible to employees",
          link: "/schedule",
          icon: <CheckSquare className="h-5 w-5" />,
          completed: publishCompleted,
        },
      ])
    } catch (err) {
      console.error("Failed to load checklist:", err)
      toast.error("Failed to load onboarding checklist")
    } finally {
      setLoading(false)
    }
  }

  // Redirect if not owner
  useEffect(() => {
    if (!authLoading && userRole !== null && userRole !== "OWNER") {
      router.replace("/stores")
    }
  }, [userRole, authLoading, router])

  // Redirect if no storeId
  useEffect(() => {
    if (!authLoading && !storeId) {
      router.replace("/stores")
    }
  }, [storeId, authLoading, router])

  if (authLoading || loading || userRole === null) {
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

  if (userRole !== "OWNER" || !storeId) {
    return null
  }

  const completedCount = checklist.filter((item) => item.completed).length
  const totalCount = checklist.length
  const allCompleted = completedCount === totalCount

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 pl-64">
        <Topbar />
        <main className="p-6 max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Getting Started</h1>
            <p className="text-muted-foreground mt-1">
              Complete these steps to set up your store and start using Workhaja
            </p>
          </div>

          {/* Progress Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Onboarding Progress</span>
                <Badge variant={allCompleted ? "default" : "secondary"}>
                  {completedCount} / {totalCount}
                </Badge>
              </CardTitle>
              <CardDescription>
                {allCompleted
                  ? "Congratulations! You've completed all setup steps."
                  : `Complete ${totalCount - completedCount} more step${totalCount - completedCount > 1 ? "s" : ""} to finish setup.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-muted rounded-full h-2 mb-4">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${(completedCount / totalCount) * 100}%` }}
                />
              </div>
              {allCompleted && (
                <Button onClick={() => router.push("/schedule")} className="w-full">
                  Go to Schedule
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Checklist Items */}
          <div className="space-y-4">
            {checklist.map((item, index) => (
              <Card key={item.id} className={item.completed ? "border-green-200" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`mt-1 ${item.completed ? "text-green-600" : "text-muted-foreground"}`}>
                        {item.completed ? (
                          <CheckCircle2 className="h-6 w-6" />
                        ) : (
                          <Circle className="h-6 w-6" />
                        )}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <span className={item.completed ? "text-green-600" : ""}>{item.icon}</span>
                          <span>{item.title}</span>
                          {item.completed && (
                            <Badge variant="outline" className="ml-2 border-green-300 text-green-700 bg-green-50">
                              Completed
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">{item.description}</CardDescription>
                      </div>
                    </div>
                    <Link href={item.link}>
                      <Button variant={item.completed ? "outline" : "default"} size="sm">
                        {item.completed ? "Review" : "Start"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Help Section */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
              <CardDescription>
                If you're having trouble with any of these steps, please refer to the documentation or contact support.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    </div>
  )
}

