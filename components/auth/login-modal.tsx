"use client"

import { useEffect } from "react"
import { useWeb3 } from "@/components/providers/web3-provider"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Wallet, Loader2 } from "lucide-react"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function LoginModal({ open, onOpenChange }: Props) {
  const { connect, isConnected, isConnecting } = useWeb3()

  // Auto close when connected
  useEffect(() => {
    if (isConnected && open) {
      onOpenChange(false)
    }
  }, [isConnected, open, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">Connect Wallet</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-6">
          <p className="text-center text-sm text-muted-foreground mb-4">
            Sign in with your Solana wallet to continue using RIALO DEX.
          </p>
          <Button
            onClick={() => connect()}
            disabled={isConnecting}
            className="flex items-center justify-between px-6 py-6 h-auto text-lg transition-all border shadow-sm hover:shadow-md hover:border-primary/50"
            variant="outline"
          >
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 rounded-full p-2">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <span className="font-semibold">Phantom</span>
            </div>
            {isConnecting ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </div>
            ) : (
              <span className="text-sm text-primary font-medium bg-primary/10 px-3 py-1 rounded-full">Popular</span>
            )}
          </Button>
          
          <div className="text-center text-xs text-muted-foreground mt-4 px-4 leading-relaxed">
            By connecting a wallet, you agree to RIALO DEX's <br />
            <a href="#" className="underline hover:text-primary transition-colors">Terms of Service</a> and <a href="#" className="underline hover:text-primary transition-colors">Privacy Policy</a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { LoginModal }
export default LoginModal