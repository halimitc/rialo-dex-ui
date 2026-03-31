"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useWeb3 } from "@/components/providers/web3-provider"

interface User {
  walletAddress: string | null
  googleEmail: string | null
  googleName: string | null
  googleAvatar: string | null
  is2FAEnabled: boolean
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  loginWithGoogle: () => Promise<void>
  logout: () => void
  enable2FA: () => Promise<void>
  disable2FA: () => Promise<void>
  request2FAConfirmation: (action: string) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  loginWithGoogle: async () => {},
  logout: () => {},
  enable2FA: async () => {},
  disable2FA: async () => {},
  request2FAConfirmation: async () => false,
})

export function useAuth() {
  return useContext(AuthContext)
}

const AUTH_STORAGE_KEY = "rialo_auth_state"

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { address, isConnected } = useWeb3()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    action: string
    resolve: (value: boolean) => void
  } | null>(null)

  // Load persisted auth state on mount
  useEffect(() => {
    const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY)
    if (storedAuth) {
      try {
        const parsed = JSON.parse(storedAuth)
        setUser(parsed)
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY)
      }
    }
    setIsLoading(false)
  }, [])

  // Sync wallet address with user state
  useEffect(() => {
    if (isConnected && address) {
      setUser((prev) => {
        const newState = {
          walletAddress: address,
          googleEmail: prev?.googleEmail || null,
          googleName: prev?.googleName || null,
          googleAvatar: prev?.googleAvatar || null,
          is2FAEnabled: prev?.is2FAEnabled || false,
        }
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newState))
        return newState
      })
    } else if (!isConnected && user?.walletAddress) {
      setUser((prev) => {
        if (!prev) return null
        const newState = { ...prev, walletAddress: null }
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newState))
        return newState
      })
    }
  }, [isConnected, address])

  const isAuthenticated = !!(user?.walletAddress || user?.googleEmail)

  const loginWithGoogle = async () => {
    // Simulate Google OAuth - in production, this would use actual OAuth
    // For demo purposes, we'll use a mock flow
    try {
      // In production: redirect to Google OAuth
      // window.location.href = '/api/auth/google'

      // Mock response for demo
      const mockGoogleUser = {
        email: "user@gmail.com",
        name: "Rialo User",
        avatar: null, // Avatar will use user initials instead
      }

      setUser((prev) => {
        const newState = {
          walletAddress: prev?.walletAddress || null,
          googleEmail: mockGoogleUser.email,
          googleName: mockGoogleUser.name,
          googleAvatar: mockGoogleUser.avatar,
          is2FAEnabled: true, // Auto-enable 2FA with Google
        }
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newState))
        return newState
      })
    } catch (error) {
      console.error("Google login error:", error)
      throw error
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }

  const enable2FA = async () => {
    // In production: call backend to enable 2FA
    setUser((prev) => {
      if (!prev) return null
      const newState = { ...prev, is2FAEnabled: true }
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newState))
      return newState
    })
  }

  const disable2FA = async () => {
    // In production: call backend to disable 2FA with confirmation
    setUser((prev) => {
      if (!prev) return null
      const newState = { ...prev, is2FAEnabled: false }
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newState))
      return newState
    })
  }

  const request2FAConfirmation = async (action: string): Promise<boolean> => {
    if (!user?.is2FAEnabled) {
      return true // No 2FA required
    }

    return new Promise((resolve) => {
      setPendingConfirmation({ action, resolve })
    })
  }

  const confirmAction = (confirmed: boolean) => {
    if (pendingConfirmation) {
      pendingConfirmation.resolve(confirmed)
      setPendingConfirmation(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        loginWithGoogle,
        logout,
        enable2FA,
        disable2FA,
        request2FAConfirmation,
      }}
    >
      {children}
      {/* 2FA Confirmation Modal */}
      {pendingConfirmation && (
        <TwoFAConfirmationModal
          action={pendingConfirmation.action}
          onConfirm={() => confirmAction(true)}
          onCancel={() => confirmAction(false)}
        />
      )}
    </AuthContext.Provider>
  )
}

// 2FA Confirmation Modal Component
function TwoFAConfirmationModal({
  action,
  onConfirm,
  onCancel,
}: {
  action: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const [code, setCode] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)

  const handleConfirm = async () => {
    setIsVerifying(true)
    // In production: verify code with backend
    // Simulate verification delay
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsVerifying(false)
    onConfirm()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Rialo 2FA Required</h3>
            <p className="text-sm text-muted-foreground">Confirm this action with your security code</p>
          </div>
        </div>

        <div className="rounded-lg bg-secondary/50 p-3 mb-4">
          <p className="text-sm font-medium text-foreground">Action: {action}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Enter 6-digit code</label>
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="------"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={code.length !== 6 || isVerifying}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isVerifying ? "Verifying..." : "Confirm"}
            </button>
          </div>
        </div>

        <p className="mt-4 text-xs text-center text-muted-foreground">Protected by Rialo Native 2FA Protocol</p>
      </div>
    </div>
  )
}
