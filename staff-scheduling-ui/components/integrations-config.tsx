"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Zap, Calendar, FileText, Link2 } from "lucide-react"

interface IntegrationsConfigProps {
  storeId: string
  userRole: "OWNER" | "MANAGER" | "WORKER"
}

export function IntegrationsConfig({ storeId, userRole }: IntegrationsConfigProps) {
  const isOwner = userRole === "OWNER"

  const integrations = [
    {
      id: "google-calendar",
      name: "Google Calendar",
      description: "Sync schedules with Google Calendar",
      icon: Calendar,
      status: "coming-soon" as const,
      enabled: false,
    },
    {
      id: "payroll",
      name: "Payroll Integration",
      description: "Export hours to payroll systems",
      icon: FileText,
      status: "coming-soon" as const,
      enabled: false,
    },
    {
      id: "api",
      name: "API Access",
      description: "REST API for custom integrations",
      icon: Link2,
      status: "available" as const,
      enabled: true,
    },
    {
      id: "webhooks",
      name: "Webhooks",
      description: "Receive real-time event notifications",
      icon: Zap,
      status: "coming-soon" as const,
      enabled: false,
    },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>
            Connect Workhaja with external services and tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {integrations.map((integration) => {
              const Icon = integration.icon
              return (
                <Card key={integration.id} className="relative">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="rounded-lg bg-muted p-3">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{integration.name}</h3>
                            {integration.status === "coming-soon" && (
                              <Badge variant="secondary" className="text-xs">
                                Coming Soon
                              </Badge>
                            )}
                            {integration.status === "available" && integration.enabled && (
                              <Badge variant="default" className="text-xs">
                                Available
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {integration.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
          <CardDescription>
            Access the REST API for custom integrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <p className="text-sm">
              <strong>API Base URL:</strong>{" "}
              <code className="text-xs bg-background px-2 py-1 rounded">
                {process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}
              </code>
            </p>
            <p className="text-sm text-muted-foreground">
              Use your authentication token to access the API endpoints. All requests must include
              authentication credentials.
            </p>
            {!isOwner && (
              <p className="text-xs text-muted-foreground mt-2">
                Contact your store owner for API access details.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
