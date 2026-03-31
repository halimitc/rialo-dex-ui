'use client'

import { useCallback, useState } from 'react'
import { TransactionToast } from '@/components/solana/transaction-toast'

export function useTransactionToast() {
  const [toasts, setToasts] = useState<TransactionToast[]>([])

  const addToast = useCallback((toast: Omit<TransactionToast, 'id'>) => {
    const id = `${Date.now()}-${Math.random()}`
    const newToast: TransactionToast = { ...toast, id }
    setToasts((prev) => [...prev, newToast])
    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showPending = useCallback((message: string) => {
    return addToast({ type: 'pending', message })
  }, [addToast])

  const showSuccess = useCallback(
    (message: string, txHash?: string) => {
      return addToast({ type: 'success', message, txHash, duration: 5000 })
    },
    [addToast]
  )

  const showError = useCallback(
    (message: string) => {
      return addToast({ type: 'error', message, duration: 5000 })
    },
    [addToast]
  )

  return {
    toasts,
    addToast,
    removeToast,
    showPending,
    showSuccess,
    showError,
  }
}
