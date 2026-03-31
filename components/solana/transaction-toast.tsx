'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle, Clock, X } from 'lucide-react'

export interface TransactionToast {
  id: string
  type: 'pending' | 'success' | 'error'
  message: string
  txHash?: string
  duration?: number
}

interface TransactionToastProps extends TransactionToast {
  onClose: (id: string) => void
}

export function TransactionToastItem({ id, type, message, txHash, duration = 5000, onClose }: TransactionToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (type !== 'pending' && duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        onClose(id)
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [type, duration, id, onClose])

  if (!isVisible) return null

  const bgClass = {
    pending: 'bg-blue-500/10 border-blue-500/20',
    success: 'bg-green-500/10 border-green-500/20',
    error: 'bg-red-500/10 border-red-500/20',
  }[type]

  const textClass = {
    pending: 'text-blue-600 dark:text-blue-400',
    success: 'text-green-600 dark:text-green-400',
    error: 'text-red-600 dark:text-red-400',
  }[type]

  const Icon = {
    pending: Clock,
    success: CheckCircle,
    error: AlertCircle,
  }[type]

  return (
    <div className={`rounded-lg border ${bgClass} p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top`}>
      <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${textClass}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${textClass}`}>{message}</p>
        {txHash && (
          <a
            href={`https://explorer.solana.com/tx/${txHash}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline mt-1 inline-block break-all"
          >
            View transaction
          </a>
        )}
      </div>
      <button
        onClick={() => {
          setIsVisible(false)
          onClose(id)
        }}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

interface TransactionToastsProps {
  toasts: TransactionToast[]
  onClose: (id: string) => void
}

export function TransactionToasts({ toasts, onClose }: TransactionToastsProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <TransactionToastItem key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  )
}
