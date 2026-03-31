'use client'

import { Component, ReactNode } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class BlockchainErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error('[v0] Blockchain error:', error)
    console.error('[v0] Error info:', errorInfo)
  }

  resetError = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Blockchain Error</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="text-sm mb-2">{this.state.error?.message || 'An unexpected blockchain error occurred'}</p>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Troubleshooting tips:</p>
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                <li>Check that Phantom wallet is connected to Solana Devnet</li>
                <li>Ensure you have sufficient RIAL or SOL tokens for gas fees</li>
                <li>Try refreshing the page</li>
                <li>Check your network connection</li>
              </ul>
            </div>
            <Button onClick={this.resetError} variant="outline" className="mt-4 w-full">
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )
    }

    return this.props.children
  }
}
