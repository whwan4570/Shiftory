"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { authApi } from "@/lib/api"

export default function SignUpPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    organizationName: "",
    email: "",
    password: "",
    confirmPassword: "",
    industry: "",
  })
  const [isOwner, setIsOwner] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError("Please fill in all fields")
      return
    }

    if (isOwner && !formData.organizationName) {
      setError("Please enter an organization name")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setIsLoading(true)
    try {
      // Use organizationName as name if provided, otherwise use email
      const name = formData.organizationName || formData.email.split("@")[0]
      const response = await authApi.register({
        email: formData.email,
        password: formData.password,
        name: name,
        isOwner: isOwner, // Pass isOwner flag to backend
      })
      // Verify authentication by calling /auth/me
      try {
        await authApi.getMe()
        console.log('Authentication verified')
      } catch (verifyErr) {
        console.error('Auth verification failed:', verifyErr)
        throw new Error('Registration succeeded but authentication verification failed. Please try again.')
      }
      
      // Small delay to ensure cookie is set and state updates
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Redirect to stores page on success
      window.location.href = "/stores" // Use window.location for full page reload
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError("")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
          <CardDescription>Get started with Workhaja to manage your team schedules.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox id="isOwner" checked={isOwner} onCheckedChange={(checked) => setIsOwner(checked === true)} />
              <Label htmlFor="isOwner" className="text-sm font-normal cursor-pointer">
                I'm creating an organization
              </Label>
            </div>

            {isOwner ? (
              <>
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization Name</Label>
                <Input
                  id="organizationName"
                  type="text"
                  placeholder="My Coffee Shop"
                  value={formData.organizationName}
                  onChange={(e) => updateFormData("organizationName", e.target.value)}
                />
              </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select value={formData.industry} onValueChange={(value) => updateFormData("industry", value)}>
                    <SelectTrigger id="industry">
                      <SelectValue placeholder="Please select the type of business of your company" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hospitality">Hospitality, Restaurant & Catering</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="employment-agency">Employment Agency</SelectItem>
                      <SelectItem value="sports-centers">Sports Centers</SelectItem>
                      <SelectItem value="logistics">Logistics</SelectItem>
                      <SelectItem value="services">Services</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Common positions: Chef, Assistant Chef, Waiter, Cleaning, Foreman, Service Technician, Operator, Doctor, Head Nurse, Nurse
                  </p>
                </div>
              </>
            ) : (
              <div className="rounded-md border border-dashed border-muted-foreground/25 bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground mb-2">Have an invite code?</p>
                <Link
                  href="/join"
                  className="text-sm font-medium text-primary hover:underline inline-flex items-center"
                >
                  Join with invite code →
                </Link>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => updateFormData("email", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => updateFormData("password", e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => updateFormData("confirmPassword", e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
