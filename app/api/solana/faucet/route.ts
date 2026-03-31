import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/solana/faucet
 * Mock faucet endpoint - simulates requesting RIAL tokens
 * In production, this would interact with the actual Solana smart contract
 */
export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json()

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // In production, this would:
    // 1. Check cooldown using RPC/database
    // 2. Build and send transaction to faucet program
    // 3. Return actual transaction hash
    
    // Mock: Generate fake transaction hash
    const mockTxHash = Array.from({ length: 88 })
      .map(() => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 58)])
      .join('')

    return NextResponse.json({
      success: true,
      txHash: mockTxHash,
      amount: '100',
      token: 'RIAL',
      message: 'Mock faucet: 100 RIAL requested (production would mint real tokens)',
    })
  } catch (error) {
    console.error('[API] Faucet error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Faucet request failed',
        success: false 
      },
      { status: 500 }
    )
  }
}
