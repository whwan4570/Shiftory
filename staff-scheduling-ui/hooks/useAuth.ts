"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getStoreId, setStoreId, storesApi, authApi } from '@/lib/api'

/**
 * Hook for authentication and store context
 * Uses HttpOnly cookies for authentication (no localStorage token needed)
 */
export function useAuth() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [storeId, setStoreIdState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedStoreId = getStoreId()

    // Check authentication by calling /auth/me (works with HttpOnly cookies)
    const checkAuth = async () => {
      try {
        // Try to get user info - this will work if HttpOnly cookie exists
        await authApi.getMe()
        
        // If getMe succeeds, user is authenticated (via HttpOnly cookie)
        setToken('cookie-auth') // Mark as authenticated
        
        // Validate and update storeId from API
        try {
          const stores = await storesApi.getStores()
          if (stores.length > 0) {
            // Check if stored storeId is valid (user is a member)
            const validStore = stores.find(s => s.id === storedStoreId)
            const selectedStoreId = validStore ? storedStoreId : stores[0].id
            
            // Always update localStorage with valid storeId
            if (selectedStoreId) {
              setStoreId(selectedStoreId)
            }
            
            setStoreIdState(selectedStoreId)
          } else {
            // No stores - clear invalid storeId
            if (storedStoreId) {
              localStorage.removeItem('store_id')
            }
            setStoreIdState(null)
          }
        } catch (err) {
          console.error('Failed to validate storeId:', err)
          // If API call fails, clear invalid storeId
          if (storedStoreId) {
            localStorage.removeItem('store_id')
          }
          setStoreIdState(null)
        }
      } catch (err) {
        // If getMe fails, user is not authenticated
        console.error('Authentication check failed:', err)
        setToken(null)
        setStoreIdState(null)
        // Clear any invalid data
        if (storedStoreId) {
          localStorage.removeItem('store_id')
        }
        // Only redirect to login if we're not already on login page
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          router.replace('/login')
        }
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  return {
    token,
    storeId,
    isLoading,
    isAuthenticated: !!token,
  }
}

