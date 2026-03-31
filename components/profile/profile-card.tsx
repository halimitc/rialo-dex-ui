"use client"

import { useState, useEffect, useRef } from "react"
import { useWeb3 } from "@/components/providers/web3-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Save, Upload } from "lucide-react"

interface ProfileData {
  username: string
  bio: string
  avatar: string
}

export function ProfileCard() {
  const { address, isConnected } = useWeb3()
  const [profile, setProfile] = useState<ProfileData>({
    username: "",
    bio: "",
    avatar: "",
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit for localStorage
        alert("Image size should be less than 1MB to save locally.")
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfile({ ...profile, avatar: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  // Load profile from localStorage on mount
  useEffect(() => {
    if (address) {
      const savedProfile = localStorage.getItem(`rialo-profile-${address}`)
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile))
      }
    }
  }, [address])

  const handleSave = async () => {
    if (!address) return

    setIsSaving(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500))

    localStorage.setItem(`rialo-profile-${address}`, JSON.stringify(profile))
    window.dispatchEvent(new Event("profileUpdated"))
    
    setIsSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const getInitials = () => {
    if (profile.username) {
      return profile.username.slice(0, 2).toUpperCase()
    }
    if (address) {
      return address.slice(2, 4).toUpperCase()
    }
    return "?"
  }

  if (!isConnected) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Profile Settings
          </CardTitle>
          <CardDescription>Connect your wallet to edit your profile</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Please connect your wallet to access profile settings.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Profile Settings
        </CardTitle>
        <CardDescription>Customize your Rialo profile</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile.avatar || "/placeholder.svg?height=80&width=80&query=avatar"} alt="Profile" />
            <AvatarFallback className="text-lg bg-primary/10 text-primary">{getInitials()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="url"
                placeholder="Enter image URL"
                value={profile.avatar}
                onChange={(e) => setProfile({ ...profile, avatar: e.target.value })}
                className="bg-secondary border-border flex-1"
              />
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 shrink-0 bg-secondary"
              >
                <Upload className="h-4 w-4" />
                Upload
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Enter a URL or upload a profile picture (max 1MB)</p>
          </div>
        </div>

        {/* Username */}
        <div>
          <label htmlFor="username" className="text-sm font-medium text-foreground">
            Username
          </label>
          <Input
            id="username"
            placeholder="Enter your username"
            value={profile.username}
            onChange={(e) => setProfile({ ...profile, username: e.target.value })}
            className="mt-1 bg-secondary border-border"
            maxLength={32}
          />
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className="text-sm font-medium text-foreground">
            Bio
          </label>
          <Textarea
            id="bio"
            placeholder="Tell us about yourself..."
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            className="mt-1 bg-secondary border-border resize-none"
            rows={3}
            maxLength={280}
          />
          <p className="text-xs text-muted-foreground mt-1">{profile.bio.length}/280 characters</p>
        </div>

        {/* Google Account (Placeholder) */}
        <div>
          <label className="text-sm font-medium text-foreground">Linked Google Account</label>
          <div className="mt-1 flex items-center gap-3 p-3 rounded-lg bg-secondary border border-border">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">No Google account linked</p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Link Account
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Google OAuth integration coming soon</p>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Profile"}
          </Button>
          {saved && <span className="text-sm text-primary">Profile saved!</span>}
        </div>
      </CardContent>
    </Card>
  )
}
