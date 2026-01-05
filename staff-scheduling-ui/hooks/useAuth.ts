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
    setIsLoading(false)

    // Redirect to login if no token
    if (!tokenValue) {
      router.replace('/login')
      return
    }

    // Validate and update storeId from API
    const validateAndSetStoreId = async () => {
      try {
        const stores = await storesApi.getStores()
        if (stores.length > 0) {
          // Check if stored storeId is valid (user is a member)
          const validStore = stores.find(s => s.id === storedStoreId)
          const selectedStoreId = validStore ? storedStoreId : stores[0].id
          
          if (selectedStoreId && selectedStoreId !== storedStoreId) {
            // Update localStorage with valid storeId
            setStoreId(selectedStoreId)
          }
          
          setStoreIdState(selectedStoreId)
        } else {
          setStoreIdState(null)
        }
      } catch (err) {
        console.error('Failed to validate storeId:', err)
        // Fallback to stored value if API call fails
        setStoreIdState(storedStoreId)
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

