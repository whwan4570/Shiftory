/**
 * API client for Workhaja backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export interface ApiError {
  message: string
  statusCode?: number
}

/**
 * Get authentication token from localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

/**
 * Set authentication token in localStorage
 */
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('auth_token', token)
}

/**
 * Remove authentication token from localStorage
 */
export function removeAuthToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('auth_token')
}

/**
 * Get store ID from localStorage
 */
export function getStoreId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('store_id')
}

/**
 * Set store ID in localStorage
 */
export function setStoreId(storeId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('store_id', storeId)
}

/**
 * API request wrapper with error handling
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Crucial for sending HttpOnly cookies
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: response.statusText,
      statusCode: response.status,
    }))
    throw new Error(errorData.message || 'An error occurred')
  }

  return response.json()
}

/**
 * Auth API
 */
export const authApi = {
  /**
   * Register a new user
   */
  async register(data: { email: string; password: string; name: string }) {
    // Token is now set as HttpOnly cookie by the server
    const response = await apiRequest<{ storeId?: string }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    )
    // Token is in HttpOnly cookie, no need to store in localStorage
    // But we keep setAuthToken for backward compatibility (will be removed in future)
    if (response.storeId) {
      setStoreId(response.storeId)
    }
    return response
  },

  /**
   * Login with email and password
   * Token is set as HttpOnly cookie by the server
   */
  async login(data: { email: string; password: string }) {
    // Token is now set as HttpOnly cookie by the server
    const response = await apiRequest<{ success: boolean }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    )
    // Token is in HttpOnly cookie, no need to store in localStorage
    // But we keep setAuthToken for backward compatibility (will be removed in future)
    return response
  },

  /**
   * Get current user info
   */
  async getMe() {
    return apiRequest<{
      id: string
      email: string
      name: string
      createdAt: string
      updatedAt: string
    }>('/auth/me')
  },

  /**
   * Logout (clear token cookie)
   */
  async logout() {
    // Clear HttpOnly cookie by calling logout endpoint
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
      })
    } catch (err) {
      console.error('Failed to logout:', err)
    }
    // Also clear localStorage for backward compatibility
    removeAuthToken()
    localStorage.removeItem('store_id')
  },
}

/**
 * Stores API
 */
export const storesApi = {
  /**
   * Get all stores where user is a member
   */
  async getStores() {
    return apiRequest<
      Array<{
        id: string
        name: string
        timezone: string
        location?: string
        specialCode: string
        createdAt: string
        updatedAt: string
        role?: 'OWNER' | 'MANAGER' | 'WORKER'
      }>
    >('/stores')
  },

  /**
   * Create a new store
   */
  async createStore(data: { name: string; timezone?: string; location?: string; specialCode: string }) {
    return apiRequest<{
      id: string
      name: string
      timezone: string
      location?: string
      specialCode: string
      createdAt: string
      updatedAt: string
    }>('/stores', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * Update a store
   */
  async updateStore(storeId: string, data: { name?: string; timezone?: string; location?: string; specialCode?: string }) {
    return apiRequest<{
      id: string
      name: string
      timezone: string
      location?: string
      specialCode: string
      createdAt: string
      updatedAt: string
    }>(`/stores/${storeId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  /**
   * Get user's membership in a specific store
   */
  async getStoreMe(storeId: string) {
    return apiRequest<{
      id: string
      userId: string
      storeId: string
      role: 'OWNER' | 'MANAGER' | 'WORKER'
      createdAt: string
      updatedAt: string
      user: {
        id: string
        email: string
        name: string
      }
    }>(`/stores/${storeId}/me`)
  },
}

/**
 * Memberships API
 */
export const membershipsApi = {
  /**
   * Get all members of a store
   */
  async getStoreMembers(storeId: string) {
    return apiRequest<
      Array<{
        id: string
        userId: string
        storeId: string
        role: 'OWNER' | 'MANAGER' | 'WORKER'
        createdAt: string
        updatedAt: string
        user: {
          id: string
          email: string
          name: string
        }
      }>
    >(`/stores/${storeId}/members`)
  },

  /**
   * Add a member to a store
   */
  async createMembership(storeId: string, data: { email: string; role: 'OWNER' | 'MANAGER' | 'WORKER'; permissions?: string[] }) {
    return apiRequest<{
      id: string
      userId: string
      storeId: string
      role: 'OWNER' | 'MANAGER' | 'WORKER'
      createdAt: string
      updatedAt: string
      user: {
        id: string
        email: string
        name: string
      }
    }>(`/stores/${storeId}/memberships`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * Update a membership (change role)
   */
  async updateMembership(storeId: string, membershipId: string, data: { role?: 'OWNER' | 'MANAGER' | 'WORKER'; permissions?: string[] }) {
    return apiRequest<{
      id: string
      userId: string
      storeId: string
      role: 'OWNER' | 'MANAGER' | 'WORKER'
      createdAt: string
      updatedAt: string
      user: {
        id: string
        email: string
        name: string
      }
    }>(`/stores/${storeId}/memberships/${membershipId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  /**
   * Delete a membership (remove member)
   */
  async deleteMembership(storeId: string, membershipId: string) {
    return apiRequest<void>(`/stores/${storeId}/memberships/${membershipId}`, {
      method: 'DELETE',
    })
  },
}

