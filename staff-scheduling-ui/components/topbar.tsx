"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { useAuth } from "@/hooks/useAuth"
import { authApi } from "@/lib/api"
import { mockStores } from "@/lib/mock-data"
import { Menu, LogOut, User } from "lucide-react"

interface TopbarProps {
  onMobileMenuToggle?: () => void
}

export function Topbar({ onMobileMenuToggle }: TopbarProps) {
  const router = useRouter()
  const [selectedStore, setSelectedStore] = useState(mockStores[0].id)
  const { storeId } = useAuth()
  const [userName, setUserName] = useState<string>("")
  const [userInitials, setUserInitials] = useState<string>("U")

  // Load user info for avatar
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const userInfo = await authApi.getMe()
        setUserName(userInfo.name)
        // Generate initials from name
        const initials = userInfo.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
        setUserInitials(initials || "U")
      } catch (err) {
        console.error("Failed to load user info:", err)
      }
    }
    loadUserInfo()
  }, [])

  const handleProfile = () => {
    router.push("/profile")
  }

  const handleLogout = async () => {
    try {
      await authApi.logout()
      router.replace("/login")
    } catch (err) {
      console.error("Failed to logout:", err)
      // Still redirect to login even if logout API call fails
      router.replace("/login")
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4">
      {/* Mobile menu toggle */}
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onMobileMenuToggle}>
        <Menu className="h-5 w-5" />
      </Button>

      {/* Store selector */}
      <Select value={selectedStore} onValueChange={setSelectedStore}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select a store" />
        </SelectTrigger>
        <SelectContent>
          {mockStores.map((store) => (
            <SelectItem key={store.id} value={store.id}>
              {store.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Notifications bell */}
      <NotificationBell storeId={storeId} />

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar>
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{userName || "My Account"}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleProfile}>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
