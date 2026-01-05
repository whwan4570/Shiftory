"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthToken, getStoreId, setStoreId, storesApi } from '@/lib/api'

/**
 * Hook for authentication and store context
 */
export function useAuth() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [storeId, setStoreIdState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const tokenValue = getAuthToken()
    const storedStoreId = getStoreId()

    setToken(tokenValue)

    // Redirect to login if no token
    if (!tokenValue) {
      setIsLoading(false)
      router.replace('/login')
      return
    }

    // Validate and update storeId from API
    // Keep isLoading true until validation completes
    const validateAndSetStoreId = async () => {
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
        // If API call fails, clear invalid storeId and redirect to stores page
        if (storedStoreId) {
          localStorage.removeItem('store_id')
        }
        setStoreIdState(null)
      } finally {
        setIsLoading(false)
      }
    }

    validateAndSetStoreId()
  }, [router])

  return {
    token,
    storeId,
    isLoading,
    isAuthenticated: !!token,
  }
}

