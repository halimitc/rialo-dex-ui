import { ProfileCard } from "@/components/profile/profile-card"
import { FaucetCard } from "@/components/profile/faucet-card"
import { WalletInfoCard } from "@/components/profile/wallet-info-card"

export default function ProfilePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account and get Devnet SOL</p>
      </div>

      <div className="grid gap-6">
        {/* Wallet Information */}
        <WalletInfoCard />

        {/* Profile Settings */}
        <ProfileCard />

        {/* Faucet */}
        <FaucetCard />
      </div>
    </div>
  )
}
