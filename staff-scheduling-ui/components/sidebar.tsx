"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Building2,
  Calendar,
  FileText,
  MessageSquare,
  Settings,
  Bell,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock,
  QrCode,
} from "lucide-react"
import { TimeSummaryCard } from "@/components/time-summary-card"
import { useAuth } from "@/hooks/useAuth"
import { storesApi } from "@/lib/api"

const navItems = [
  { href: "/stores", label: "Stores", icon: Building2 },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/checkin", label: "Check In/Out", icon: Clock },
  { href: "/requests", label: "Requests", icon: MessageSquare },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
]

const managerOnlyNavItems = [
  { href: "/qrcode", label: "QR Code", icon: QrCode },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [userRole, setUserRole] = useState<"OWNER" | "MANAGER" | "WORKER" | null>(null)
  const pathname = usePathname()
  const { storeId, isLoading: authLoading } = useAuth()

  // Load user role
  useEffect(() => {
    const loadUserRole = async () => {
      if (!storeId || authLoading) return
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
    loadUserRole()
  }, [storeId, authLoading])

  const isManagerOrOwner = userRole === "OWNER" || userRole === "MANAGER"
  const allNavItems = [...navItems, ...(isManagerOrOwner ? managerOnlyNavItems : [])]

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!collapsed && <h1 className="text-xl font-bold text-sidebar-foreground">Workhaja</h1>}
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="ml-auto">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
          {allNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn("w-full justify-start", collapsed && "justify-center px-2")}
                >
                  <Icon className={cn("h-5 w-5", !collapsed && "mr-3")} />
                  {!collapsed && <span>{item.label}</span>}
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* Time Summary Card */}
        <TimeSummaryCard collapsed={collapsed} />
      </div>
    </aside>
  )
}
