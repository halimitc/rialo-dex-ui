import { type NextRequest, NextResponse } from "next/server"

// Rate limiting store (in production, use Redis or a database)
const rateLimitStore = new Map<string, number>()
const RATE_LIMIT_DURATION = 24 * 60 * 60 * 1000 // 24 hours in ms

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress } = body

    // Validate wallet address
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({ success: false, message: "Invalid wallet address" }, { status: 400 })
    }

    // Check rate limit
    const lastRequest = rateLimitStore.get(walletAddress.toLowerCase())
    const now = Date.now()

    if (lastRequest && now - lastRequest < RATE_LIMIT_DURATION) {
      const remainingTime = Math.ceil((RATE_LIMIT_DURATION - (now - lastRequest)) / (60 * 60 * 1000))
      return NextResponse.json(
        {
          success: false,
          message: `Rate limited. Please try again in ${remainingTime} hours.`,
        },
        { status: 429 },
      )
    }

    // In production, this would:
    // 1. Call the Rialo backend to get a 2FA signature
    // 2. Send the transaction with the signature
    // For now, we simulate the response

    // Update rate limit
    rateLimitStore.set(walletAddress.toLowerCase(), now)

    // Simulate a transaction hash (in production, this would be a real tx)
    const mockTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`

    return NextResponse.json({
      success: true,
      txHash: mockTxHash,
      message: "Devnet SOL sent successfully",
    })
  } catch (error) {
    console.error("Faucet error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
